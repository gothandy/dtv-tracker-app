/**
 * Backup export — shared logic used by the admin endpoint and the nightly sync.
 *
 * Exports all 6 SharePoint lists plus taxonomy and schema metadata to the Backups/
 * folder in the Shared Documents library. Uses SHA-256 diff checking to skip files
 * that haven't changed, keeping SharePoint version history clean.
 */

import crypto from 'crypto';
import { sharePointClient } from './sharepoint-client';
import { taxonomyClient } from './taxonomy-client';

const LISTS = [
  { name: 'groups',   guid: process.env.GROUPS_LIST_GUID! },
  { name: 'sessions', guid: process.env.SESSIONS_LIST_GUID! },
  { name: 'entries',  guid: process.env.ENTRIES_LIST_GUID! },
  { name: 'profiles', guid: process.env.PROFILES_LIST_GUID! },
  { name: 'regulars', guid: process.env.REGULARS_LIST_GUID! },
  { name: 'records',  guid: process.env.RECORDS_LIST_GUID! },
];

export interface BackupResult {
  updated: string[];
  skipped: string[];
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function hasChanged(driveId: string, filePath: string, newContent: string): Promise<boolean> {
  const existing = await sharePointClient.downloadFile(driveId, filePath);
  if (!existing) return true;
  return sha256(existing.toString('utf8')) !== sha256(newContent);
}

export async function runBackupExport(): Promise<BackupResult> {
  const driveId = process.env.BACKUP_DRIVE_ID;
  if (!driveId) throw new Error('BACKUP_DRIVE_ID not configured');

  const updated: string[] = [];
  const skipped: string[] = [];

  // Data files — sorted by ID for stable ordering across runs
  for (const list of LISTS) {
    const items = await sharePointClient.getListItems(list.guid);
    const sorted = [...items].sort((a: any, b: any) => a.ID - b.ID);
    const json = JSON.stringify(sorted, null, 2);
    const path = `Backups/${list.name}.json`;
    if (await hasChanged(driveId, path, json)) {
      await sharePointClient.uploadFile(driveId, path, Buffer.from(json), 'application/json');
      updated.push(list.name);
    } else {
      skipped.push(list.name);
    }
  }

  // Taxonomy term tree
  if (process.env.TAXONOMY_TERM_SET_ID) {
    const tree = await taxonomyClient.getTermSetTree(process.env.TAXONOMY_TERM_SET_ID);
    const json = JSON.stringify({ termSetId: process.env.TAXONOMY_TERM_SET_ID, tree }, null, 2);
    const path = 'Backups/taxonomy.json';
    if (await hasChanged(driveId, path, json)) {
      await sharePointClient.uploadFile(driveId, path, Buffer.from(json), 'application/json');
      updated.push('taxonomy');
    } else {
      skipped.push('taxonomy');
    }
  }

  // Full site schema — all lists with column definitions (one Graph call).
  // Strip volatile Graph API fields before hashing so unchanged schema isn't flagged as updated.
  const VOLATILE_KEYS = new Set(['lastModifiedDateTime', 'createdDateTime', 'eTag', '@odata.etag', '@odata.context']);
  const lists = await sharePointClient.getAllListsWithColumns();
  const schemaJson = JSON.stringify({ lists }, (key, value) => VOLATILE_KEYS.has(key) ? undefined : value, 2);
  const schemaPath = 'Backups/schema.json';
  if (await hasChanged(driveId, schemaPath, schemaJson)) {
    await sharePointClient.uploadFile(driveId, schemaPath, Buffer.from(schemaJson), 'application/json');
    updated.push('schema');
  } else {
    skipped.push('schema');
  }

  return { updated, skipped };
}
