import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { recordsRepository } from '../services/repositories/records-repository';
import {
  enrichSessions,
  sortSessionsByDate,
  validateArray,
  validateSession,
  validateEntry,
  validateGroup,
  validateProfile,
  convertGroup,
  calculateCurrentFY,
  calculateFinancialYear,
  findGroupByKey,
  findSessionByGroupAndDate,
  buildBadgeLookups,
  safeParseLookupId,
  parseHours,
  nameToSlug
} from '../services/data-layer';
import {
  GROUP_LOOKUP,
  SESSION_LOOKUP, SESSION_NOTES,
  PROFILE_LOOKUP, PROFILE_DISPLAY
} from '../services/field-names';
import type { SessionResponse, SessionDetailResponse, EntryResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

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

    const groupKeyMap = new Map(groups.map(g => [g.ID, (g.Title || '').toLowerCase()]));

    const data: SessionResponse[] = sortedSessions.map(s => ({
      id: s.sharePointId,
      displayName: s.displayName,
      description: s.description,
      date: s.sessionDate.toISOString(),
      groupId: s.groupId,
      groupKey: s.groupId ? groupKeyMap.get(s.groupId) : undefined,
      groupName: s.groupName,
      registrations: s.registrations,
      hours: s.hours,
      financialYear: `FY${s.financialYear}`,
      eventbriteEventId: s.eventbriteEventId
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

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { groupId, date, name, description } = req.body;

    if (!groupId || !date) {
      res.status(400).json({ success: false, error: 'groupId and date are required' });
      return;
    }

    const dateStr = String(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD format' });
      return;
    }

    const groups = await groupsRepository.getAll();
    const group = groups.find(g => g.ID === Number(groupId));
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const groupKey = (group.Title || '').toLowerCase();
    const title = `${dateStr} ${group.Title || ''}`.trim();

    const fields: { Title: string; Date: string; [key: string]: any } = {
      Title: title,
      Date: dateStr,
      [GROUP_LOOKUP]: String(groupId)
    };
    if (typeof name === 'string' && name.trim()) {
      fields.Name = name.trim();
    }
    if (typeof description === 'string' && description.trim()) {
      fields[SESSION_NOTES] = description.trim();
    }

    const id = await sessionsRepository.create(fields);
    res.json({
      success: true,
      data: { id, groupKey, date: dateStr }
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      message: error.message
    });
  }
});

router.get('/sessions/export', async (req: Request, res: Response) => {
  try {
    const fy = calculateCurrentFY();

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

    const groupKeyMap = new Map(groups.map(g => [g.ID, (g.Title || '').toLowerCase()]));

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const fySessions = sortedSessions.filter(s => s.financialYear === fy.startYear && s.sessionDate <= today);

    const csvHeader = 'Group Key,Date,Count,Hours,Display Name';
    const csvRows = fySessions.map(s => {
      const groupKey = s.groupId ? (groupKeyMap.get(s.groupId) || '') : '';
      const date = s.sessionDate.toISOString().substring(0, 10);
      const name = (s.displayName || '').replace(/"/g, '""');
      return `${groupKey},${date},${s.registrations},${s.hours},"${name}"`;
    });

    const csv = [csvHeader, ...csvRows].join('\n');

    const todayStr = today.toISOString().substring(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${todayStr} DTV Hours.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting sessions CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export sessions',
      message: error.message
    });
  }
});

router.get('/records/export', async (req: Request, res: Response) => {
  try {
    if (!recordsRepository.available) {
      res.status(400).json({ success: false, error: 'Records list not configured' });
      return;
    }

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
    for (const r of rawRecords) {
      const pid = safeParseLookupId(r.ProfileLookupId as unknown as string);
      if (pid === undefined || !r.Type) continue;
      allTypes.add(r.Type);
      if (!recordsByProfile.has(pid)) recordsByProfile.set(pid, new Map());
      recordsByProfile.get(pid)!.set(r.Type, { status: r.Status || '', date: r.Date || '' });
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
    const todayStr = new Date().toISOString().substring(0, 10);
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

router.get('/sessions/:group/:date', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);

    const [rawGroups, rawSessions, rawEntries, rawProfiles, rawRecords] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      profilesRepository.getAll(),
      recordsRepository.available ? recordsRepository.getAll() : Promise.resolve([])
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const groupId = spGroup.ID;
    const group = convertGroup(spGroup);

    const spSession = findSessionByGroupAndDate(rawSessions, groupId, dateParam);
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const sessionEntries = entries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === spSession.ID);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profileMap = new Map(profiles.map(p => [p.ID, p]));

    const { memberIds, cardStatusMap } = buildBadgeLookups(rawRecords);

    const entryResponses: EntryResponse[] = sessionEntries.map(e => {
      const volunteerId = safeParseLookupId(e[PROFILE_LOOKUP]);
      const profile = volunteerId !== undefined ? profileMap.get(volunteerId) : undefined;
      return {
        id: e.ID,
        volunteerName: e[PROFILE_DISPLAY],
        volunteerSlug: nameToSlug(e[PROFILE_DISPLAY]),
        isGroup: profile?.IsGroup || false,
        isMember: volunteerId !== undefined ? memberIds.has(volunteerId) : false,
        cardStatus: volunteerId !== undefined ? cardStatusMap.get(volunteerId) : undefined,
        count: e.Count || 1,
        hours: parseHours(e.Hours),
        checkedIn: e.Checked || false,
        notes: e.Notes
      };
    });

    const totalHours = sessionEntries.reduce((sum, e) => sum + parseHours(e.Hours), 0);

    const data: SessionDetailResponse = {
      id: spSession.ID,
      displayName: spSession.Name || spSession.Title,
      description: spSession[SESSION_NOTES],
      date: spSession.Date,
      groupId: groupId,
      groupName: group.displayName,
      registrations: sessionEntries.length,
      hours: Math.round(totalHours * 10) / 10,
      financialYear: `FY${calculateFinancialYear(new Date(spSession.Date))}`,
      eventbriteEventId: spSession.EventbriteEventID,
      entries: entryResponses
    };

    res.json({ success: true, data } as ApiResponse<SessionDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching session detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session detail',
      message: error.message
    });
  }
});

router.patch('/sessions/:group/:date', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);
    const { displayName, description, eventbriteEventId, date } = req.body;

    const fields: Record<string, any> = {};
    if (typeof displayName === 'string') fields.Name = displayName;
    if (typeof description === 'string') fields[SESSION_NOTES] = description;
    if (typeof eventbriteEventId === 'string') fields.EventbriteEventID = eventbriteEventId;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) fields.Date = date;

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    const [rawGroups, rawSessions] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll()
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const spSession = findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam);
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    await sessionsRepository.updateFields(spSession.ID, fields);
    const newDate = fields.Date || dateParam;
    res.json({ success: true, data: { date: newDate } } as ApiResponse<{ date: string }>);
  } catch (error: any) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session',
      message: error.message
    });
  }
});

router.delete('/sessions/:group/:date', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);

    const [rawGroups, rawSessions] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll()
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const spSession = findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam);
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    await sessionsRepository.delete(spSession.ID);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
      message: error.message
    });
  }
});

export = router;
