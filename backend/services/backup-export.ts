/**
 * Backup export — shared logic used by the admin endpoint and the nightly sync.
 *
 * Exports all SharePoint data lists plus taxonomy and schema metadata to the Backups/
 * folder in the Shared Documents library. Uses SHA-256 diff checking to skip files
 * that haven't changed, keeping SharePoint version history clean.
 */

import crypto from 'crypto';
import { sharePointClient } from './sharepoint-client';
import { taxonomyClient } from './taxonomy-client';
import { sharePoint } from '../config';

/** Lists exported to Backups/{name}.json. Logins (token hashes) are deliberately excluded. */
const BACKED_UP_LISTS = ['groups', 'projects', 'sessions', 'entries', 'profiles', 'regulars', 'records', 'templates'] as const;

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
  const driveId = sharePoint.libraries.documents;

  const updated: string[] = [];
  const skipped: string[] = [];

  // Data files — sorted by ID for stable ordering across runs
  for (const name of BACKED_UP_LISTS) {
    const items = await sharePointClient.getListItems(sharePoint.lists[name]);
    const sorted = [...items].sort((a: any, b: any) => a.ID - b.ID);
    const json = JSON.stringify(sorted, null, 2);
    const path = `Backups/${name}.json`;
    if (await hasChanged(driveId, path, json)) {
      await sharePointClient.uploadFile(driveId, path, Buffer.from(json), 'application/json');
      updated.push(name);
    } else {
      skipped.push(name);
    }
  }

  // Taxonomy term tree
  {
    const termSetId = sharePoint.site.tagsTermSetId;
    const tree = await taxonomyClient.getTermSetTree(termSetId);
    const json = JSON.stringify({ termSetId, tree }, null, 2);
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
