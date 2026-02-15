import express, { Request, Response, Router } from 'express';
import { sharePointClient } from '../services/sharepoint-client';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { calculateCurrentFY, calculateFYStats } from '../services/data-layer';
import type { StatsResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const fy = calculateCurrentFY();
    const lastFYStartYear = fy.startYear - 1;
    const lastFYKey = `FY${lastFYStartYear}`;

    const [sessionsThisFY, sessionsLastFY, entries] = await Promise.all([
      sessionsRepository.getByFinancialYear(fy.key),
      sessionsRepository.getByFinancialYear(lastFYKey),
      entriesRepository.getAll()
    ]);

    const statsThis = calculateFYStats(sessionsThisFY, entries);
    const statsLast = calculateFYStats(sessionsLastFY, entries);

    const data: StatsResponse = {
      thisFY: {
        activeGroups: statsThis.activeGroups,
        sessions: statsThis.sessions,
        hours: statsThis.hours,
        volunteers: statsThis.volunteers,
        financialYear: `${fy.startYear}-${fy.endYear}`,
        label: 'This FY'
      },
      lastFY: {
        activeGroups: statsLast.activeGroups,
        sessions: statsLast.sessions,
        hours: statsLast.hours,
        volunteers: statsLast.volunteers,
        financialYear: `${lastFYStartYear}-${fy.startYear}`,
        label: 'Last FY'
      }
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

router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      sharepointSiteUrl: process.env.SHAREPOINT_SITE_URL || null
    }
  });
});

export = router;
