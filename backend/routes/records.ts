/**
 * Records routes: the States (for Add and Edit), add, edit, delete and bulk add, and the Tools
 * Records CSV. Every route checks a permission (types/permissions.ts);
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
import { PROFILE_LOOKUP, SESSION_LOOKUP } from '../services/field-names';
import { statesRepository } from '../services/repositories/states-repository';
import { computeAndSaveProfileStats } from '../services/profile-stats';
import { currentRecords, recordProfileId, recordStateName, recordType, toRecordResponse } from '../services/records';
import { createRecord, requireState, setRecordState } from '../services/record-writer';
import { requirePermission } from '../middleware/require-permission';
import { ukToday } from '../../types/uk-date';
import type { ApiResponse } from '../../types/sharepoint';
import type { RecordListItemResponse, RecordListResponse, RecordResponse } from '../../types/api-responses';
import type { RecordState } from '../../types/record-state';

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
    // The States list: Add and Edit offer each Type's States (#322 §3)
    const states = (await statesRepository.getStates()).slice().sort((a, b) => a.id - b.id);
    res.json({ success: true, data: { states } });
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

    const created = await createRecord({ profileId, type, status, date: date || new Date().toISOString() });
    computeAndSaveProfileStats(profileId).catch(err =>
      console.error(`[Stats] Failed targeted profile update for profile ${profileId}:`, err)
    );
    // The Record as the app shows it (its label and style are worked out here, #322 §3)
    const record = toRecordResponse(created, ukToday());
    res.json({ success: true, data: { id: created.ID, record } } as ApiResponse<{ id: number; record: RecordResponse }>);
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
    const fields: { StateLookupId?: number; Status?: string; Date?: string; Notes?: string } = {};
    if (typeof date === 'string') fields.Date = date;
    if (typeof notes === 'string') {
      const trimmed = notes.trim();
      if (trimmed.length > RECORD_NOTES_MAX_LENGTH) {
        res.status(400).json({ success: false, error: `Notes must be ${RECORD_NOTES_MAX_LENGTH} characters or fewer` });
        return;
      }
      fields.Notes = trimmed;
    }

    if (Object.keys(fields).length === 0 && typeof status !== 'string') {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    // Look up the Record (its Profile, and its Type for a new State) before the write clears the cache
    const allRecordsForPatch = await recordsRepository.getAll();
    const recordForPatch = allRecordsForPatch.find(r => r.ID === recordId);
    const patchProfileId = recordForPatch ? recordProfileId(recordForPatch) : undefined;
    let patchState: RecordState | undefined;
    if (typeof status === 'string') {
      if (!recordForPatch) {
        res.status(404).json({ success: false, error: 'Record not found' });
        return;
      }
      patchState = await requireState(recordType(recordForPatch), status);
      fields.StateLookupId = patchState.id;
      fields.Status = status;
    }

    await recordsRepository.update(recordId, fields);
    if (patchProfileId !== undefined) {
      computeAndSaveProfileStats(patchProfileId).catch(err =>
        console.error(`[Stats] Failed targeted profile update for profile ${patchProfileId}:`, err)
      );
    }
    // The Record as saved, as the app shows it (label and style worked out here, #322 §3)
    const record = recordForPatch
      ? toRecordResponse({ ...recordForPatch, ...fields, State: patchState ?? recordForPatch.State }, ukToday())
      : undefined;
    res.json({ success: true, data: { record } } as ApiResponse<{ record?: RecordResponse }>);
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

      const result = await setRecordState(allRecords, { profileId: id, type, status, date: recordDate }, 'refreshDate');
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
    for (const r of currentRecords(rawRecords)) {
      const pid = recordProfileId(r)!;
      const type = recordType(r);
      allTypes.add(type);
      if (!recordsByProfile.has(pid)) recordsByProfile.set(pid, new Map());
      recordsByProfile.get(pid)!.set(type, { status: recordStateName(r), date: r.Date || '' });
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

export = router;
