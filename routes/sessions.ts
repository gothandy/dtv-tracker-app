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
      eventbriteUrl: undefined,
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
    const { displayName, description, eventbriteEventId } = req.body;

    const fields: Record<string, any> = {};
    if (typeof displayName === 'string') fields.Name = displayName;
    if (typeof description === 'string') fields[SESSION_NOTES] = description;
    if (typeof eventbriteEventId === 'string') fields.EventbriteEventID = eventbriteEventId;

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
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session',
      message: error.message
    });
  }
});

export = router;
