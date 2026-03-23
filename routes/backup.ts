import express, { Request, Response, Router } from 'express';
import { runBackupExport } from '../services/backup-export';

const router: Router = express.Router();

// POST /api/backup/export-all
// Exports all SharePoint lists plus taxonomy and schema metadata to Backups/ in Shared Documents.
// Skips files that haven't changed to keep SharePoint version history clean.
router.post('/backup/export-all', async (req: Request, res: Response) => {
  const result = await runBackupExport();
  res.json({ success: true, data: { ...result, timestamp: new Date().toISOString() } });
});

export = router;
