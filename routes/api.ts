import express, { Request, Response, Router } from 'express';
import { sharePointClient } from '../services/sharepoint-client';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import {
  enrichSessions,
  sortSessionsByDate,
  validateArray,
  validateSession,
  validateEntry,
  validateGroup,
  validateProfile,
  convertGroup,
  convertProfile,
  calculateCurrentFY,
  calculateFYStats
} from '../services/data-layer';
import type { GroupResponse, SessionResponse, ProfileResponse, StatsResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

router.get('/groups', async (req: Request, res: Response) => {
  try {
    const rawGroups = await groupsRepository.getAll();
    const groups = validateArray(rawGroups, validateGroup, 'Group');

    const data: GroupResponse[] = groups.map(spGroup => {
      const group = convertGroup(spGroup);
      return {
        id: group.sharePointId,
        displayName: group.displayName,
        description: group.description,
        eventbriteSeriesId: group.eventbriteSeriesId
      };
    });

    res.json({ success: true, count: data.length, data } as ApiResponse<GroupResponse[]>);
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups from SharePoint',
      message: error.message
    });
  }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const [sessionsRaw, entriesRaw, groupsRaw] = await Promise.all([
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      groupsRepository.getAll()
    ]);

    const sessions = validateArray(sessionsRaw, validateSession, 'Session');
    const entries = validateArray(entriesRaw, validateEntry, 'Entry');
    const groups = validateArray(groupsRaw, validateGroup, 'Group');

    const enrichedSessions = enrichSessions(sessions, entries, groups);
    const sortedSessions = sortSessionsByDate(enrichedSessions);

    const data: SessionResponse[] = sortedSessions.map(s => ({
      id: s.sharePointId,
      displayName: s.displayName,
      description: s.description,
      date: s.sessionDate.toISOString(),
      groupId: s.groupId,
      groupName: s.groupName,
      registrations: s.registrations,
      hours: s.hours,
      financialYear: `FY${s.financialYear}`,
      eventbriteEventId: s.eventbriteEventId,
      eventbriteUrl: s.eventbriteUrl
    }));

    res.json({ success: true, count: data.length, data } as ApiResponse<SessionResponse[]>);
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions from SharePoint',
      message: error.message
    });
  }
});

router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const rawProfiles = await profilesRepository.getAll();
    const validProfiles = validateArray(rawProfiles, validateProfile, 'Profile');

    const data: ProfileResponse[] = validProfiles.map(spProfile => {
      const profile = convertProfile(spProfile);
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        isGroup: profile.isGroup,
        hoursLastFY: profile.hoursLastFY,
        hoursThisFY: profile.hoursThisFY
      };
    });

    res.json({ success: true, count: data.length, data } as ApiResponse<ProfileResponse[]>);
  } catch (error: any) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profiles from SharePoint',
      message: error.message
    });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const fy = calculateCurrentFY();

    const [sessionsFY, entries] = await Promise.all([
      sessionsRepository.getByFinancialYear(fy.key),
      entriesRepository.getAll()
    ]);

    const stats = calculateFYStats(sessionsFY, entries);

    const data: StatsResponse = {
      activeGroupsFY: stats.activeGroups,
      sessionsFY: stats.sessions,
      hoursFY: stats.hours,
      financialYear: `${fy.startYear}-${fy.endYear}`
    };

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

export = router;
