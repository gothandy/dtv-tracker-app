/**
 * Records routes: the Type and Status choices, add, edit, delete and bulk add, and the Tools
 * Records CSV and summary. Every route checks a permission (types/permissions.ts);
 * route-permissions.test.ts fails if one doesn't.
 */

import express, { Request, Response, Router } from 'express';
import { recordsRepository } from '../services/repositories/records-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import {
  validateArray,
  validateProfile,
  validateSession,
  validateEntry,
  calculateCurrentFY,
  calculateFinancialYear,
  safeParseLookupId,
  parseHours,
  profileSlug,
} from '../services/data-layer';
import { PROFILE_LOOKUP, RECORD_STATE, RECORD_STATE_LOOKUP, SESSION_LOOKUP } from '../services/field-names';
import { statesRepository } from '../services/repositories/states-repository';
import { runRecordsMigration } from '../services/records-migration';
import { computeAndSaveProfileStats } from '../services/profile-stats';
import { recordProfileId, statusOn, toRecordResponse } from '../services/records';
import { createRecord, upsertRecord } from '../services/record-writer';
import { summariseRecords } from '../services/records-summary';
import { sharePointClient } from '../services/sharepoint-client';
import { requirePermission } from '../middleware/require-permission';
import { sharePoint, environmentName } from '../config';
import { ukToday } from '../../types/uk-date';
import type { ApiResponse } from '../../types/sharepoint';
import type { RecordListItemResponse, RecordListResponse } from '../../types/api-responses';

/** Records Notes is a single line of text, which SharePoint limits to 255 characters. */
const RECORD_NOTES_MAX_LENGTH = 255;

const router: Router = express.Router();

router.get('/records', requirePermission('viewRecords'), async (req: Request, res: Response) => {
  try {
    const [rawRecords, rawProfiles] = await Promise.all([
      recordsRepository.getAll(),
      profilesRepository.getAll()
    ]);
    const today = ukToday();
    const profileNames = new Map(rawProfiles.map(p => [p.ID, p.Title]));

    const data: RecordListItemResponse[] = rawRecords.map(r => {
      const profileId = recordProfileId(r);
      const known = profileId !== undefined && profileNames.has(profileId);
      const name = known ? profileNames.get(profileId!) : undefined;
      return {
        ...toRecordResponse(r, today),
        profileId,
        profileName: name,
        profileSlug: known ? profileSlug(name, profileId!) : undefined,
      };
    });

    const response: RecordListResponse = { success: true, count: data.length, data };
    res.json(response);
  } catch (error: any) {
    console.error('Error fetching records:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch records', message: error.message });
  }
});

router.get('/profiles/records/options', requirePermission('viewRecordOptions'), async (req: Request, res: Response) => {
  try {
    const listGuid = sharePoint.lists.records;
    const [types, statuses] = await Promise.all([
      sharePointClient.getColumnChoices(listGuid, 'Type'),
      sharePointClient.getColumnChoices(listGuid, 'Status')
    ]);
    res.json({ success: true, data: { types, statuses } });
  } catch (error: any) {
    console.error('Error fetching record options:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch record options' });
  }
});

router.post('/profiles/:id/records', requirePermission('editRecords'), async (req: Request, res: Response) => {
  try {
    const profileId = parseInt(String(req.params.id), 10);
    if (isNaN(profileId)) {
      res.status(400).json({ success: false, error: 'Invalid profile ID' });
      return;
    }
    const { type, status, date } = req.body;
    if (!type || !status) {
      res.status(400).json({ success: false, error: 'type and status are required' });
      return;
    }

    const { ID: id } = await createRecord({ profileId, type, status, date: date || new Date().toISOString() });
    computeAndSaveProfileStats(profileId).catch(err =>
      console.error(`[Stats] Failed targeted profile update for profile ${profileId}:`, err)
    );
    res.json({ success: true, data: { id } } as ApiResponse<{ id: number }>);
  } catch (error: any) {
    console.error('Error creating record:', error);
    res.status(500).json({ success: false, error: 'Failed to create record', message: error.message });
  }
});

router.patch('/records/:id', requirePermission('editRecords'), async (req: Request, res: Response) => {
  try {
    const recordId = parseInt(String(req.params.id), 10);
    if (isNaN(recordId)) {
      res.status(400).json({ success: false, error: 'Invalid record ID' });
      return;
    }
    const { status, date, notes } = req.body;
    const fields: { Status?: string; Date?: string; Notes?: string } = {};
    if (typeof status === 'string') fields.Status = status;
    if (typeof date === 'string') fields.Date = date;
    if (typeof notes === 'string') {
      const trimmed = notes.trim();
      if (trimmed.length > RECORD_NOTES_MAX_LENGTH) {
        res.status(400).json({ success: false, error: `Notes must be ${RECORD_NOTES_MAX_LENGTH} characters or fewer` });
        return;
      }
      fields.Notes = trimmed;
    }

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    // Look up profile ID from cache before the write clears it
    const allRecordsForPatch = await recordsRepository.getAll();
    const recordForPatch = allRecordsForPatch.find(r => r.ID === recordId);
    const patchProfileId = recordForPatch ? recordProfileId(recordForPatch) : undefined;

    await recordsRepository.update(recordId, fields);
    if (patchProfileId !== undefined) {
      computeAndSaveProfileStats(patchProfileId).catch(err =>
        console.error(`[Stats] Failed targeted profile update for profile ${patchProfileId}:`, err)
      );
    }
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error updating record:', error);
    res.status(500).json({ success: false, error: 'Failed to update record', message: error.message });
  }
});

router.delete('/records/:id', requirePermission('editRecords'), async (req: Request, res: Response) => {
  try {
    const recordId = parseInt(String(req.params.id), 10);
    if (isNaN(recordId)) {
      res.status(400).json({ success: false, error: 'Invalid record ID' });
      return;
    }
    // Look up profile ID from cache before the write clears it
    const allRecordsForDelete = await recordsRepository.getAll();
    const recordForDelete = allRecordsForDelete.find(r => r.ID === recordId);
    const deleteProfileId = recordForDelete ? recordProfileId(recordForDelete) : undefined;

    await recordsRepository.delete(recordId);
    if (deleteProfileId !== undefined) {
      computeAndSaveProfileStats(deleteProfileId).catch(err =>
        console.error(`[Stats] Failed targeted profile update for profile ${deleteProfileId}:`, err)
      );
    }
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting record:', error);
    res.status(500).json({ success: false, error: 'Failed to delete record', message: error.message });
  }
});

router.post('/records/bulk', requirePermission('bulkEditRecords'), async (req: Request, res: Response) => {
  try {
    const { profileIds, type, status, date } = req.body;
    if (!Array.isArray(profileIds) || profileIds.length === 0) {
      res.status(400).json({ success: false, error: 'profileIds array is required' });
      return;
    }
    if (!type || !status) {
      res.status(400).json({ success: false, error: 'type and status are required' });
      return;
    }

    const allRecords = await recordsRepository.getAll();
    const recordDate = date || new Date().toISOString();
    let created = 0;
    let updated = 0;

    for (const profileId of profileIds) {
      const id = parseInt(String(profileId), 10);
      if (isNaN(id)) continue;

      const result = await upsertRecord(allRecords, { profileId: id, type, status, date: recordDate }, 'statusAndDate');
      if (result === 'created') created++;
      else updated++;
    }

    // Fire profile stats update for all affected profiles
    for (const profileId of profileIds) {
      const id = parseInt(String(profileId), 10);
      if (!isNaN(id)) {
        computeAndSaveProfileStats(id).catch(err =>
          console.error(`[Stats] Failed targeted profile update for profile ${id}:`, err)
        );
      }
    }

    res.json({ success: true, data: { created, updated } } as ApiResponse<{ created: number; updated: number }>);
  } catch (error: any) {
    console.error('Error bulk updating records:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk update records', message: error.message });
  }
});

router.get('/records/export', requirePermission('exportRecords'), async (req: Request, res: Response) => {
  try {
    const [rawRecords, rawProfiles, rawSessions, rawEntries] = await Promise.all([
      recordsRepository.getAll(),
      profilesRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll()
    ]);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const entries = validateArray(rawEntries, validateEntry, 'Entry');

    // Build session map and FY info for hours calculation
    const sessionMap = new Map(sessions.map(s => [s.ID, s]));
    const fy = calculateCurrentFY();
    const lastFYStart = fy.startYear - 1;

    // Calculate hours per profile
    const hoursMap = new Map<number, { thisFY: number; lastFY: number }>();
    for (const e of entries) {
      const pid = safeParseLookupId(e[PROFILE_LOOKUP]);
      const sid = safeParseLookupId(e[SESSION_LOOKUP]);
      if (pid === undefined || sid === undefined) continue;
      const sess = sessionMap.get(sid);
      if (!sess) continue;
      const h = parseHours(e.Hours);
      const sessionFY = calculateFinancialYear(new Date(sess.Date));
      if (!hoursMap.has(pid)) hoursMap.set(pid, { thisFY: 0, lastFY: 0 });
      const hours = hoursMap.get(pid)!;
      if (sessionFY === fy.startYear) hours.thisFY += h;
      else if (sessionFY === lastFYStart) hours.lastFY += h;
    }

    // Group records by profile ID
    const recordsByProfile = new Map<number, Map<string, { status: string; date: string }>>();
    const allTypes = new Set<string>();
    const today = ukToday();
    for (const r of rawRecords) {
      const pid = recordProfileId(r);
      if (pid === undefined || !r.Type) continue;
      allTypes.add(r.Type);
      if (!recordsByProfile.has(pid)) recordsByProfile.set(pid, new Map());
      recordsByProfile.get(pid)!.set(r.Type, { status: statusOn(r, today), date: r.Date || '' });
    }

    // Format date like "8 Sept 2025"
    function formatDateShort(dateStr: string): string {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Sort types alphabetically
    const sortedTypes = [...allTypes].sort();

    // Build CSV — only profiles that have at least one record
    const profileIds = [...recordsByProfile.keys()];
    const profileMap = new Map(profiles.map(p => [p.ID, p]));

    const csvHeader = ['Name', 'Email', 'Hours Last FY', 'Hours This FY', ...sortedTypes]
      .map(h => `"${h}"`).join(',');

    const csvRows = profileIds
      .map(pid => {
        const profile = profileMap.get(pid);
        if (!profile) return null;
        const name = (profile.Title || '').replace(/"/g, '""');
        const email = (profile.Email || '').replace(/"/g, '""');
        const hours = hoursMap.get(pid) || { thisFY: 0, lastFY: 0 };
        const lastFY = Math.round(hours.lastFY * 10) / 10;
        const thisFY = Math.round(hours.thisFY * 10) / 10;
        const recs = recordsByProfile.get(pid)!;
        const typeCols = sortedTypes.map(t => {
          const rec = recs.get(t);
          if (!rec) return '""';
          const val = rec.date ? `${rec.status} · ${formatDateShort(rec.date)}` : rec.status;
          return `"${val.replace(/"/g, '""')}"`;
        });
        return `"${name}","${email}",${lastFY},${thisFY},${typeCols.join(',')}`;
      })
      .filter(Boolean);

    // Sort by name
    csvRows.sort((a, b) => a!.localeCompare(b!));

    const csv = [csvHeader, ...csvRows].join('\n');
    const todayStr = ukToday();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${todayStr} DTV Records.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    console.error('Error exporting records CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export records',
      message: error.message
    });
  }
});

// Totals only, no volunteer data: for planning the Records v2 migration (#322).
router.get('/records/summary', requirePermission('exportRecordsSummary'), async (req: Request, res: Response) => {
  try {
    const [records, profiles, recordsColumns] = await Promise.all([
      recordsRepository.getAll(),
      profilesRepository.getAll(),
      sharePointClient.getListColumns(sharePoint.lists.records, { fresh: true })
    ]);

    // The Records v2 migration check, once the State column exists (#322 §5)
    const hasStateColumn = recordsColumns.some((c: any) => c.name === RECORD_STATE);
    const states = hasStateColumn
      ? {
          recordStates: await sharePointClient.getListItems(sharePoint.lists.records, `ID,Type,${RECORD_STATE_LOOKUP}`),
          states: await statesRepository.getAll(),
        }
      : undefined;

    const environment = environmentName();
    const today = ukToday();
    const summary = summariseRecords({
      environment,
      generatedAt: new Date().toISOString(),
      today,
      records,
      profiles,
      recordsColumns,
      states
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${today} DTV Records Summary ${environment}.json"`);
    res.send(JSON.stringify(summary, null, 2));
  } catch (error: any) {
    console.error('Error exporting records summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export records summary',
      message: error.message
    });
  }
});

// Records v2 migration (#322 §5), from Tools. GET is the dry run (a JSON download); POST with
// { confirm: 'run' } writes. Temporary: removed in Records v2 PR 1 (#323).
router.get('/records/migration', requirePermission('migrateRecords'), async (req: Request, res: Response) => {
  try {
    const environment = environmentName();
    const report = await runRecordsMigration({ dryRun: true, environment });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${ukToday()} DTV Records Migration Dry Run ${environment}.json"`);
    res.send(JSON.stringify(report, null, 2));
  } catch (error: any) {
    console.error('Error in records migration dry run:', error);
    res.status(500).json({ success: false, error: 'Records migration dry run failed', message: error.message });
  }
});

router.post('/records/migration', requirePermission('migrateRecords'), async (req: Request, res: Response) => {
  if (req.body?.confirm !== 'run') {
    res.status(400).json({ success: false, error: 'Send { "confirm": "run" } to run the migration' });
    return;
  }
  try {
    const report = await runRecordsMigration({ dryRun: false, environment: environmentName() });
    console.log(`[Records migration] ${report.environment}: ${report.statesToInsert.length} States inserted, ${report.titlesSet} Titles fixed, ${report.recordsSet} Records set, ${report.errors?.length ?? 0} errors`);
    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Error running records migration:', error);
    res.status(500).json({ success: false, error: 'Records migration failed', message: error.message });
  }
});

export = router;
