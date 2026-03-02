import express, { Request, Response, Router } from 'express';
import { sharePointClient } from '../services/sharepoint-client';

const router: Router = express.Router();

const LISTS = [
  { name: 'groups',   guid: process.env.GROUPS_LIST_GUID! },
  { name: 'sessions', guid: process.env.SESSIONS_LIST_GUID! },
  { name: 'entries',  guid: process.env.ENTRIES_LIST_GUID! },
  { name: 'profiles', guid: process.env.PROFILES_LIST_GUID! },
  { name: 'regulars', guid: process.env.REGULARS_LIST_GUID! },
  { name: 'records',  guid: process.env.RECORDS_LIST_GUID! },
];

// POST /api/backup/export-all
// Fetches all items from each SharePoint list and writes them as JSON files
// to the Tracker Archive folder in the Shared Documents library.
// Overwrites the same fixed filenames each run — rely on SharePoint document
// library version history for access to older snapshots.
router.post('/backup/export-all', async (req: Request, res: Response) => {
  const driveId = process.env.BACKUP_DRIVE_ID;
  if (!driveId) {
    return res.status(500).json({ success: false, error: 'BACKUP_DRIVE_ID not configured' });
  }

  const exported: { list: string; count: number }[] = [];

  for (const list of LISTS) {
    const items = await sharePointClient.getListItems(list.guid);
    const buffer = Buffer.from(JSON.stringify(items, null, 2));
    await sharePointClient.uploadFile(driveId, `Backups/${list.name}.json`, buffer, 'application/json');
    exported.push({ list: list.name, count: items.length });
  }

  res.json({ success: true, data: { exported, timestamp: new Date().toISOString() } });
});

export = router;
