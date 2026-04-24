import express, { Request, Response, Router } from 'express';
import { sharePointClient, CACHE_TTL } from '../services/sharepoint-client';
import { taxonomyClient } from '../services/taxonomy-client';
import { clearMediaCache } from '../services/media-cache';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { calculateCurrentFY, calculateFinancialYear, safeParseLookupId } from '../services/data-layer';
import { SESSION_STATS, PROFILE_STATS, GROUP_LOOKUP } from '../services/field-names';
import type { StatsResponse, FYStatsResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

// Reads pre-computed Stats JSON from session items — falls back to 0 on missing/malformed data
function parseStatsHours(statsRaw: string | undefined | null): number {
  if (!statsRaw) return 0;
  try { return JSON.parse(statsRaw).hours || 0; } catch { return 0; }
}

function hoursFromStats(sessions: any[]): number {
  return Math.round(sessions.reduce((sum, s) => sum + parseStatsHours(s[SESSION_STATS]), 0) * 10) / 10;
}

// Groups Stats.hours by calendar month — equivalent to getHoursByCalendarMonth but reads from Stats field
function hoursByMonthFromStats(sessions: any[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const h = parseStatsHours(s[SESSION_STATS]);
    if (!h || !s.Date) continue;
    const d = new Date(s.Date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    map.set(key, (map.get(key) || 0) + h);
  }
  return map;
}

// Counts profiles that have at least one session in the given FY, from pre-computed Stats field
function volunteersFromStats(profiles: any[], fyKey: string): number {
  let count = 0;
  for (const p of profiles) {
    try {
      const stats = JSON.parse(p[PROFILE_STATS] || '{}');
      if ((stats.sessionsByFY?.[fyKey] || 0) > 0) count++;
    } catch { /* malformed Stats — skip */ }
  }
  return count;
}

// Counts distinct groups that ran sessions in a given set
function activeGroupsFromSessions(sessions: any[]): number {
  return new Set(
    sessions
      .map(s => safeParseLookupId(s[GROUP_LOOKUP]))
      .filter((id): id is number => id !== undefined)
  ).size;
}

const router: Router = express.Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'stats_summary';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      res.json({ success: true, data: cached });
      return;
    }

    const fy = calculateCurrentFY();
    const lastFYStartYear = fy.startYear - 1;
    const lastFYKey = `FY${lastFYStartYear}`;

    const [sessionsThisFY, sessionsLastFY, rawProfiles] = await Promise.all([
      sessionsRepository.getByFinancialYear(fy.key),
      sessionsRepository.getByFinancialYear(lastFYKey),
      profilesRepository.getAll()
    ]);

    const thisFYProfiles = volunteersFromStats(rawProfiles, fy.key);
    const lastFYProfiles = volunteersFromStats(rawProfiles, lastFYKey);
    const data: StatsResponse = {
      thisFY: {
        activeGroups: activeGroupsFromSessions(sessionsThisFY),
        sessions: sessionsThisFY.length,
        hours: hoursFromStats(sessionsThisFY),
        volunteers: thisFYProfiles,
        financialYear: `${fy.startYear}-${fy.endYear}`,
        label: 'This FY'
      },
      lastFY: {
        activeGroups: activeGroupsFromSessions(sessionsLastFY),
        sessions: sessionsLastFY.length,
        hours: hoursFromStats(sessionsLastFY),
        volunteers: lastFYProfiles,
        financialYear: `${lastFYStartYear}-${fy.startYear}`,
        label: 'Last FY'
      }
    };

    sharePointClient.cache.set(cacheKey, data, CACHE_TTL.stats);
    res.json({ success: true, data } as ApiResponse<StatsResponse>);
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

router.get('/stats/history', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'stats_history';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      res.json({ success: true, data: cached });
      return;
    }

    const [allSessions, rawProfiles] = await Promise.all([
      sessionsRepository.getAll(),
      profilesRepository.getAll()
    ]);

    // Group sessions by FY start year, skipping the historical-totals placeholder
    const sessionsByFY = new Map<number, typeof allSessions>();
    for (const session of allSessions) {
      if (!session.Date || session.Date.startsWith('2020-01-01')) continue;
      const fyYear = calculateFinancialYear(new Date(session.Date));
      if (!sessionsByFY.has(fyYear)) sessionsByFY.set(fyYear, []);
      sessionsByFY.get(fyYear)!.push(session);
    }

    const currentFY = calculateCurrentFY();

    // Prediction: for current FY, completed months + prev year's remaining months
    const FY_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]; // Apr(3) … Mar(2)
    const now = new Date();
    const currentMonthIdx = FY_MONTHS.indexOf(now.getMonth());
    // Months fully complete = everything before the current month in FY order
    const completedFYMonths = FY_MONTHS.slice(0, currentMonthIdx);
    // Remaining = current (partial) month through March — use prev year for all of these
    const remainingFYMonths = FY_MONTHS.slice(currentMonthIdx);

    const prevFYSessions = sessionsByFY.get(currentFY.startYear - 1) || [];
    const prevFYMonthly = hoursByMonthFromStats(prevFYSessions);
    const currentFYSessions = sessionsByFY.get(currentFY.startYear) || [];
    const currentFYMonthly = hoursByMonthFromStats(currentFYSessions);

    const history: FYStatsResponse[] = Array.from(sessionsByFY.entries())
      .filter(([startYear]) => startYear <= currentFY.startYear)
      .sort(([a], [b]) => a - b)
      .map(([startYear, sessions]) => {
        const endYear = startYear + 1;
        const isCurrentFY = startYear === currentFY.startYear;

        let completedHours: number | undefined;
        let predictedHours: number | undefined;
        if (isCurrentFY) {
          // Sum hours from fully-completed FY months only
          const completed = completedFYMonths.reduce((sum, m) => {
            const calYear = m >= 3 ? startYear : endYear;
            return sum + (currentFYMonthly.get(`${calYear}-${m}`) || 0);
          }, 0);
          completedHours = Math.round(completed * 10) / 10;

          // Add prev year's hours for current (partial) month + remaining months
          const additional = remainingFYMonths.reduce((sum, m) => {
            const calYear = m >= 3 ? startYear : endYear;
            return sum + (prevFYMonthly.get(`${calYear - 1}-${m}`) || 0);
          }, 0);
          predictedHours = Math.round((completed + additional) * 10) / 10;
        }

        const fyProfiles = volunteersFromStats(rawProfiles, `FY${startYear}`);
        return {
          activeGroups: activeGroupsFromSessions(sessions),
          sessions: sessions.length,
          hours: hoursFromStats(sessions),
          volunteers: fyProfiles,
          profiles: fyProfiles,
          financialYear: `${startYear}-${endYear}`,
          label: isCurrentFY ? 'This FY' : `FY ${String(startYear).slice(2)}/${String(endYear).slice(2)}`,
          completedHours,
          predictedHours
        };
      });

    sharePointClient.cache.set(cacheKey, history, CACHE_TTL.stats);
    res.json({ success: true, data: history } as ApiResponse<FYStatsResponse[]>);
  } catch (error: any) {
    console.error('Error fetching stats history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats history',
      message: error.message
    });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

router.post('/cache/clear', (req: Request, res: Response) => {
  try {
    sharePointClient.clearCache();
    sharePointClient.clearColumnCache();
    taxonomyClient.clearTreeCache();
    clearMediaCache();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

router.get('/cache/stats', (req: Request, res: Response) => {
  try {
    const stats = sharePointClient.getCacheStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats',
      message: error.message
    });
  }
});

router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      sharepointSiteUrl: process.env.SHAREPOINT_SITE_URL || null
    }
  });
});

export = router;
