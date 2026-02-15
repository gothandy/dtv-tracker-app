import express, { Request, Response, Router } from 'express';
import { sharePointClient } from '../services/sharepoint-client';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import {
  enrichSessions,
  sortSessionsByDate,
  validateArray,
  validateSession,
  validateEntry,
  validateGroup,
  validateProfile,
  convertGroup,
  convertEntry,
  convertProfile,
  groupRegularsByCrewId,
  calculateCurrentFY,
  calculateFYStats,
  calculateFinancialYear,
  safeParseLookupId,
  nameToSlug
} from '../services/data-layer';
import {
  GROUP_LOOKUP, GROUP_DISPLAY,
  SESSION_LOOKUP, SESSION_DISPLAY,
  PROFILE_LOOKUP, PROFILE_DISPLAY,
  SESSION_NOTES,
  legacy
} from '../services/field-names';
import type { GroupResponse, GroupDetailResponse, SessionResponse, SessionDetailResponse, EntryResponse, EntryDetailResponse, ProfileResponse, ProfileDetailResponse, ProfileEntryResponse, ProfileGroupHours, StatsResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

router.get('/groups', async (req: Request, res: Response) => {
  try {
    const [rawGroups, rawRegulars] = await Promise.all([
      groupsRepository.getAll(),
      regularsRepository.getAll()
    ]);
    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const regularsMap = groupRegularsByCrewId(rawRegulars);

    const data: GroupResponse[] = groups.map(spGroup => {
      const group = convertGroup(spGroup);
      const regulars = regularsMap.get(group.sharePointId) || [];
      return {
        id: group.sharePointId,
        key: (group.lookupKeyName || '').toLowerCase(),
        displayName: group.displayName,
        description: group.description,
        eventbriteSeriesId: group.eventbriteSeriesId,
        regularsCount: regulars.length,
        regulars
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

router.post('/groups', async (req: Request, res: Response) => {
  try {
    const { key, name, description } = req.body;

    if (!key || typeof key !== 'string' || !key.trim()) {
      res.status(400).json({ success: false, error: 'Key is required' });
      return;
    }

    const fields: { Title: string; Name?: string; Description?: string } = { Title: key.trim() };
    if (typeof name === 'string' && name.trim()) {
      fields.Name = name.trim();
    }
    if (typeof description === 'string' && description.trim()) {
      fields.Description = description.trim();
    }

    const id = await groupsRepository.create(fields);
    res.json({
      success: true,
      data: { id, key: fields.Title.toLowerCase(), displayName: fields.Name || fields.Title }
    });
  } catch (error: any) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create group',
      message: error.message
    });
  }
});

router.get('/groups/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key).toLowerCase();

    const fy = calculateCurrentFY();

    const [rawGroups, rawRegulars, rawSessions, rawEntries] = await Promise.all([
      groupsRepository.getAll(),
      regularsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll()
    ]);

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const spGroup = groups.find(g => (g.Title || '').toLowerCase() === key);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const groupId = spGroup.ID;
    const group = convertGroup(spGroup);
    const regularsMap = groupRegularsByCrewId(rawRegulars);
    const regulars = regularsMap.get(group.sharePointId) || [];

    // Filter sessions for this group
    const groupSessions = validateArray(rawSessions, validateSession, 'Session')
      .filter(s => safeParseLookupId(s[GROUP_LOOKUP]) === groupId);

    // FY sessions for stats
    const fyStart = new Date(Date.UTC(fy.startYear, 3, 1));
    const fyEnd = new Date(Date.UTC(fy.endYear, 2, 31, 23, 59, 59));
    const fySessionIds = new Set(
      groupSessions
        .filter(s => {
          const d = new Date(s.Date);
          return d >= fyStart && d <= fyEnd;
        })
        .map(s => s.ID)
    );

    // Get entries for this group's FY sessions
    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const fyEntries = entries.filter(e => {
      const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
      return sessionId !== undefined && fySessionIds.has(sessionId);
    });

    const totalHours = fyEntries.reduce((sum, e) => sum + (parseFloat(String(e.Hours)) || 0), 0);
    const newVolunteers = fyEntries.filter(e => e.Notes && /\#new\b/i.test(e.Notes)).length;
    const children = fyEntries.filter(e => e.Notes && /\#child\b/i.test(e.Notes)).length;
    const uniqueVolunteers = new Set(
      fyEntries
        .map(e => safeParseLookupId(e[PROFILE_LOOKUP]))
        .filter((id): id is number => id !== undefined)
    ).size;

    // Enrich sessions for display
    const enriched = enrichSessions(groupSessions, rawEntries, rawGroups);
    const sorted = sortSessionsByDate(enriched);

    const allSessionResponses: SessionResponse[] = sorted.map(s => ({
      id: s.sharePointId,
      displayName: s.displayName,
      description: s.description,
      date: s.sessionDate.toISOString(),
      groupId: s.groupId,
      groupKey: key,
      groupName: s.groupName,
      registrations: s.registrations,
      hours: s.hours,
      financialYear: `FY${s.financialYear}`,
      eventbriteEventId: s.eventbriteEventId,
      eventbriteUrl: s.eventbriteUrl
    }));

    const data: GroupDetailResponse = {
      id: group.sharePointId,
      key: (group.lookupKeyName || '').toLowerCase(),
      displayName: group.displayName,
      description: group.description,
      eventbriteSeriesId: group.eventbriteSeriesId,
      regulars,
      financialYear: `${fy.startYear}-${fy.endYear}`,
      stats: {
        sessions: fySessionIds.size,
        hours: Math.round(totalHours * 10) / 10,
        newVolunteers,
        children,
        totalVolunteers: uniqueVolunteers
      },
      sessions: allSessionResponses
    };

    res.json({ success: true, data } as ApiResponse<GroupDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching group detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch group detail',
      message: error.message
    });
  }
});

router.patch('/groups/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key).toLowerCase();
    const { displayName, description, eventbriteSeriesId } = req.body;

    const fields: Record<string, any> = {};
    if (typeof displayName === 'string') fields.Name = displayName;
    if (typeof description === 'string') fields.Description = description;
    if (typeof eventbriteSeriesId === 'string') fields.EventbriteSeriesID = eventbriteSeriesId;

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    const rawGroups = await groupsRepository.getAll();
    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const spGroup = groups.find(g => (g.Title || '').toLowerCase() === key);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    await groupsRepository.updateFields(spGroup.ID, fields);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update group',
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

    const [rawGroups, rawSessions, rawEntries, rawProfiles] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const spGroup = groups.find(g => (g.Title || '').toLowerCase() === groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const groupId = spGroup.ID;
    const group = convertGroup(spGroup);

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const spSession = sessions.find(s => {
      if (safeParseLookupId(s[GROUP_LOOKUP]) !== groupId) return false;
      const sessionDate = s.Date.substring(0, 10);
      return sessionDate === dateParam;
    });

    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const sessionEntries = entries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === spSession.ID);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profileMap = new Map(profiles.map(p => [p.ID, p]));

    const entryResponses: EntryResponse[] = sessionEntries.map(e => {
      const volunteerId = safeParseLookupId(e[PROFILE_LOOKUP]);
      const profile = volunteerId !== undefined ? profileMap.get(volunteerId) : undefined;
      return {
        id: e.ID,
        volunteerName: e[PROFILE_DISPLAY],
        volunteerSlug: nameToSlug(e[PROFILE_DISPLAY]),
        isGroup: profile?.IsGroup || false,
        count: e.Count || 1,
        hours: e.Hours || 0,
        checkedIn: e.Checked || false,
        notes: e.Notes
      };
    });

    const totalHours = sessionEntries.reduce((sum, e) => sum + (parseFloat(String(e.Hours)) || 0), 0);

    const data: SessionDetailResponse = {
      id: spSession.ID,
      displayName: spSession.Name || spSession.Title,
      description: spSession[SESSION_NOTES],
      date: spSession.Date,
      groupId: groupId,
      groupName: group.displayName,
      registrations: sessionEntries.length,
      hours: Math.round(totalHours * 10) / 10,
      financialYear: `FY${new Date(spSession.Date).getMonth() >= 3 ? new Date(spSession.Date).getFullYear() : new Date(spSession.Date).getFullYear() - 1}`,
      eventbriteEventId: spSession.EventbriteEventID,
      eventbriteUrl: typeof spSession.Url === 'object' && spSession.Url ? (spSession.Url as any).Url : (spSession.Url || undefined),
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
    const { displayName, description, eventbriteEventId, eventbriteUrl } = req.body;

    const fields: Record<string, any> = {};
    if (typeof displayName === 'string') fields.Name = displayName;
    if (typeof description === 'string') fields[SESSION_NOTES] = description;
    if (typeof eventbriteEventId === 'string') fields.EventbriteEventID = eventbriteEventId;
    // Url column only exists on legacy site (dropped from Tracker site)
    if (legacy && typeof eventbriteUrl === 'string') fields.Url = eventbriteUrl ? { Url: eventbriteUrl, Description: eventbriteUrl } : null;

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    const [rawGroups, rawSessions] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll()
    ]);

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const spGroup = groups.find(g => (g.Title || '').toLowerCase() === groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const spSession = sessions.find(s => {
      if (safeParseLookupId(s[GROUP_LOOKUP]) !== spGroup.ID) return false;
      return s.Date.substring(0, 10) === dateParam;
    });
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

router.get('/entries/:group/:date/:slug', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);
    const slug = String(req.params.slug).toLowerCase();

    const [rawGroups, rawSessions, rawEntries, rawProfiles] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const spGroup = groups.find(g => (g.Title || '').toLowerCase() === groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const spSession = sessions.find(s => {
      if (safeParseLookupId(s[GROUP_LOOKUP]) !== spGroup.ID) return false;
      return s.Date.substring(0, 10) === dateParam;
    });
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const spEntry = entries.find(e => {
      if (safeParseLookupId(e[SESSION_LOOKUP]) !== spSession.ID) return false;
      return nameToSlug(e[PROFILE_DISPLAY]) === slug;
    });
    if (!spEntry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const volunteerId = safeParseLookupId(spEntry[PROFILE_LOOKUP]);
    const profile = volunteerId !== undefined ? profiles.find(p => p.ID === volunteerId) : undefined;

    // Calculate FY hours from entries
    const sessionMap = new Map(sessions.map(s => [s.ID, s]));
    const fy = calculateCurrentFY();
    const lastFYStart = fy.startYear - 1;
    let calcThisFY = 0;
    let calcLastFY = 0;
    const volunteerEntries = volunteerId !== undefined
      ? entries.filter(e => safeParseLookupId(e[PROFILE_LOOKUP]) === volunteerId)
      : [];
    volunteerEntries.forEach(e => {
      const sid = safeParseLookupId(e[SESSION_LOOKUP]);
      if (sid === undefined) return;
      const sess = sessionMap.get(sid);
      if (!sess) return;
      const h = parseFloat(String(e.Hours)) || 0;
      const sessionFY = calculateFinancialYear(new Date(sess.Date));
      if (sessionFY === fy.startYear) calcThisFY += h;
      else if (sessionFY === lastFYStart) calcLastFY += h;
    });

    const group = convertGroup(spGroup);

    const data: EntryDetailResponse = {
      id: spEntry.ID,
      volunteerName: spEntry[PROFILE_DISPLAY],
      volunteerSlug: nameToSlug(spEntry[PROFILE_DISPLAY]),
      isGroup: profile?.IsGroup || false,
      hoursLastFY: Math.round(calcLastFY * 10) / 10,
      hoursThisFY: Math.round(calcThisFY * 10) / 10,
      volunteerEntryCount: volunteerEntries.length,
      count: spEntry.Count || 1,
      hours: spEntry.Hours || 0,
      checkedIn: spEntry.Checked || false,
      notes: spEntry.Notes,
      date: spSession.Date,
      groupKey,
      groupName: group.displayName,
      sessionDisplayName: spSession.Name || spSession.Title
    };

    res.json({ success: true, data } as ApiResponse<EntryDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching entry detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entry detail',
      message: error.message
    });
  }
});

router.patch('/entries/:id', async (req: Request, res: Response) => {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    if (isNaN(entryId)) {
      res.status(400).json({ success: false, error: 'Invalid entry ID' });
      return;
    }

    const { checkedIn, count, hours, notes } = req.body;
    const fields: Record<string, any> = {};

    if (typeof checkedIn === 'boolean') {
      fields.Checked = checkedIn;
    }
    if (count !== undefined) {
      const countNum = parseInt(String(count), 10);
      if (isNaN(countNum) || countNum < 0) {
        res.status(400).json({ success: false, error: 'Count must be a non-negative integer' });
        return;
      }
      fields.Count = countNum;
    }
    if (hours !== undefined) {
      const hoursNum = parseFloat(String(hours));
      if (isNaN(hoursNum) || hoursNum < 0) {
        res.status(400).json({ success: false, error: 'Hours must be a non-negative number' });
        return;
      }
      fields.Hours = hoursNum;
    }
    if (typeof notes === 'string') {
      fields.Notes = notes;
    }

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    await entriesRepository.updateFields(entryId, fields);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error updating entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update entry',
      message: error.message
    });
  }
});

router.delete('/entries/:id', async (req: Request, res: Response) => {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    if (isNaN(entryId)) {
      res.status(400).json({ success: false, error: 'Invalid entry ID' });
      return;
    }

    await entriesRepository.delete(entryId);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete entry',
      message: error.message
    });
  }
});

router.post('/sessions/:group/:date/entries', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);
    const { volunteerId, notes } = req.body;

    if (!volunteerId || typeof volunteerId !== 'number') {
      res.status(400).json({ success: false, error: 'volunteerId is required and must be a number' });
      return;
    }

    const [rawGroups, rawSessions, rawProfiles] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const spGroup = groups.find(g => (g.Title || '').toLowerCase() === groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const spSession = sessions.find(s => {
      if (safeParseLookupId(s[GROUP_LOOKUP]) !== spGroup.ID) return false;
      return s.Date.substring(0, 10) === dateParam;
    });
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profile = profiles.find(p => p.ID === volunteerId);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Volunteer not found' });
      return;
    }

    const fields: Record<string, any> = {
      [SESSION_LOOKUP]: String(spSession.ID),
      [PROFILE_LOOKUP]: String(profile.ID)
    };
    if (typeof notes === 'string' && notes.trim()) {
      fields.Notes = notes;
    }

    const id = await entriesRepository.create(fields);
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Error creating entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create entry',
      message: error.message
    });
  }
});

router.post('/sessions/:group/:date/add-regulars', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);

    const [rawGroups, rawSessions, rawEntries, rawRegulars] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      regularsRepository.getAll()
    ]);

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const spGroup = groups.find(g => (g.Title || '').toLowerCase() === groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const spSession = sessions.find(s => {
      if (safeParseLookupId(s[GROUP_LOOKUP]) !== spGroup.ID) return false;
      return s.Date.substring(0, 10) === dateParam;
    });
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const sessionEntries = entries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === spSession.ID);
    const existingVolunteerIds = new Set(
      sessionEntries.map(e => safeParseLookupId(e[PROFILE_LOOKUP])).filter(id => id !== undefined)
    );

    const groupRegulars = rawRegulars.filter(r => safeParseLookupId(r[GROUP_LOOKUP]) === spGroup.ID);
    const toAdd = groupRegulars.filter(r => {
      const volunteerId = safeParseLookupId(r[PROFILE_LOOKUP]);
      return volunteerId !== undefined && !existingVolunteerIds.has(volunteerId);
    });

    for (const regular of toAdd) {
      await entriesRepository.create({
        [SESSION_LOOKUP]: String(spSession.ID),
        [PROFILE_LOOKUP]: String(safeParseLookupId(regular[PROFILE_LOOKUP])),
        Notes: '#Regular'
      });
    }

    res.json({ success: true, data: { added: toAdd.length } } as ApiResponse<{ added: number }>);
  } catch (error: any) {
    console.error('Error adding regulars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add regulars',
      message: error.message
    });
  }
});

router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const groupFilter = req.query.group ? String(req.query.group).toLowerCase() : undefined;

    const [rawProfiles, rawEntries, rawSessions, rawGroups] = await Promise.all([
      profilesRepository.getAll(),
      entriesRepository.getAll(),
      sessionsRepository.getAll(),
      groupFilter ? groupsRepository.getAll() : Promise.resolve([])
    ]);

    const validProfiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const sessionMap = new Map(sessions.map(s => [s.ID, s]));

    // When filtering by group, build a set of session IDs belonging to that group
    let groupSessionIds: Set<number> | undefined;
    if (groupFilter) {
      const groups = validateArray(rawGroups, validateGroup, 'Group');
      const spGroup = groups.find(g => (g.Title || '').toLowerCase() === groupFilter);
      if (spGroup) {
        groupSessionIds = new Set(
          sessions.filter(s => safeParseLookupId(s[GROUP_LOOKUP]) === spGroup.ID).map(s => s.ID)
        );
      }
    }

    const fy = calculateCurrentFY();
    const lastFYStart = fy.startYear - 1;

    // Calculate hours and session counts per profile from entries
    const profileStats = new Map<number, { hoursThisFY: number; hoursLastFY: number; sessionsThisFY: Set<number>; sessionsLastFY: Set<number> }>();
    entries.forEach(e => {
      const volunteerId = safeParseLookupId(e[PROFILE_LOOKUP]);
      if (volunteerId === undefined) return;
      const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
      if (sessionId === undefined) return;
      if (groupSessionIds && !groupSessionIds.has(sessionId)) return;
      const session = sessionMap.get(sessionId);
      if (!session) return;
      const hours = parseFloat(String(e.Hours)) || 0;
      const sessionFY = calculateFinancialYear(new Date(session.Date));

      if (!profileStats.has(volunteerId)) {
        profileStats.set(volunteerId, { hoursThisFY: 0, hoursLastFY: 0, sessionsThisFY: new Set(), sessionsLastFY: new Set() });
      }
      const ps = profileStats.get(volunteerId)!;
      if (sessionFY === fy.startYear) {
        ps.hoursThisFY += hours;
        ps.sessionsThisFY.add(sessionId);
      } else if (sessionFY === lastFYStart) {
        ps.hoursLastFY += hours;
        ps.sessionsLastFY.add(sessionId);
      }
    });

    const data: ProfileResponse[] = validProfiles.map(spProfile => {
      const profile = convertProfile(spProfile);
      const ps = profileStats.get(spProfile.ID);
      return {
        id: profile.id,
        slug: nameToSlug(profile.name),
        name: profile.name,
        email: profile.email,
        isGroup: profile.isGroup,
        hoursLastFY: ps ? Math.round(ps.hoursLastFY * 10) / 10 : 0,
        hoursThisFY: ps ? Math.round(ps.hoursThisFY * 10) / 10 : 0,
        sessionsLastFY: ps ? ps.sessionsLastFY.size : 0,
        sessionsThisFY: ps ? ps.sessionsThisFY.size : 0
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

router.get('/profiles/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug).toLowerCase();

    const [rawProfiles, rawEntries, rawSessions, rawGroups, rawRegulars] = await Promise.all([
      profilesRepository.getAll(),
      entriesRepository.getAll(),
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
      regularsRepository.getAll()
    ]);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const spProfile = profiles.find(p => nameToSlug(p.Title) === slug);
    if (!spProfile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const profile = convertProfile(spProfile);

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const profileEntries = entries.filter(e => safeParseLookupId(e[PROFILE_LOOKUP]) === spProfile.ID);

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const sessionMap = new Map(sessions.map(s => [s.ID, s]));

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const groupMap = new Map(groups.map(g => [g.ID, g]));
    const groupKeyMap = new Map(groups.map(g => [g.ID, (g.Title || '').toLowerCase()]));

    // Build regulars lookup for this volunteer: crewId → regularId
    const regularsByCrewId = new Map<number, number>();
    rawRegulars.forEach(r => {
      if (safeParseLookupId(r[PROFILE_LOOKUP]) === spProfile.ID) {
        const crewId = safeParseLookupId(r[GROUP_LOOKUP]);
        if (crewId !== undefined) regularsByCrewId.set(crewId, r.ID);
      }
    });

    // Calculate FY hours from entries and build group hours breakdown
    const fy = calculateCurrentFY();
    const lastFYStart = fy.startYear - 1;
    let calculatedThisFY = 0;
    let calculatedLastFY = 0;
    const groupHoursMap = new Map<number, { groupName: string; hoursThisFY: number; hoursLastFY: number }>();

    profileEntries.forEach(e => {
      const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
      if (sessionId === undefined) return;
      const session = sessionMap.get(sessionId);
      if (!session) return;
      const hours = parseFloat(String(e.Hours)) || 0;
      const sessionFY = calculateFinancialYear(new Date(session.Date));

      if (sessionFY === fy.startYear) {
        calculatedThisFY += hours;
      } else if (sessionFY === lastFYStart) {
        calculatedLastFY += hours;
      }

      const groupId = safeParseLookupId(session[GROUP_LOOKUP]);
      if (groupId !== undefined && (sessionFY === fy.startYear || sessionFY === lastFYStart)) {
        const existing = groupHoursMap.get(groupId);
        if (existing) {
          if (sessionFY === fy.startYear) existing.hoursThisFY += hours;
          else existing.hoursLastFY += hours;
        } else {
          const group = groupMap.get(groupId);
          groupHoursMap.set(groupId, {
            groupName: group?.Name || group?.Title || 'Unknown',
            hoursThisFY: sessionFY === fy.startYear ? hours : 0,
            hoursLastFY: sessionFY === lastFYStart ? hours : 0
          });
        }
      }
    });

    // Include groups where volunteer is a regular but has no hours
    regularsByCrewId.forEach((_regularId, crewId) => {
      if (!groupHoursMap.has(crewId)) {
        const group = groupMap.get(crewId);
        if (group) {
          groupHoursMap.set(crewId, {
            groupName: group.Name || group.Title || 'Unknown',
            hoursThisFY: 0,
            hoursLastFY: 0
          });
        }
      }
    });

    const groupHours: ProfileGroupHours[] = [...groupHoursMap.entries()]
      .map(([groupId, { groupName, hoursThisFY, hoursLastFY }]) => {
        const regularId = regularsByCrewId.get(groupId);
        return {
          groupId,
          groupKey: groupKeyMap.get(groupId) || '',
          groupName,
          hoursThisFY: Math.round(hoursThisFY * 10) / 10,
          hoursLastFY: Math.round(hoursLastFY * 10) / 10,
          isRegular: regularId !== undefined,
          regularId
        };
      })
      .sort((a, b) => (b.hoursThisFY + b.hoursLastFY) - (a.hoursThisFY + a.hoursLastFY));

    // Build entry responses sorted by date desc
    const entryResponses: ProfileEntryResponse[] = profileEntries
      .map(e => {
        const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
        const session = sessionId !== undefined ? sessionMap.get(sessionId) : undefined;
        const groupId = session ? safeParseLookupId(session[GROUP_LOOKUP]) : undefined;
        const group = groupId !== undefined ? groupMap.get(groupId) : undefined;
        const date = session?.Date || '';
        const sessionFY = date ? calculateFinancialYear(new Date(date)) : 0;
        return {
          id: e.ID,
          date,
          groupKey: groupId !== undefined ? groupKeyMap.get(groupId) : undefined,
          groupName: group?.Name || group?.Title,
          count: e.Count || 1,
          hours: e.Hours || 0,
          checkedIn: e.Checked || false,
          notes: e.Notes,
          financialYear: `FY${sessionFY}`
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const data: ProfileDetailResponse = {
      id: profile.id,
      slug: nameToSlug(profile.name),
      name: profile.name,
      email: profile.email,
      matchName: spProfile.MatchName,
      isGroup: profile.isGroup,
      hoursLastFY: Math.round(calculatedLastFY * 10) / 10,
      hoursThisFY: Math.round(calculatedThisFY * 10) / 10,
      groupHours,
      entries: entryResponses
    };

    res.json({ success: true, data } as ApiResponse<ProfileDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching profile detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile detail',
      message: error.message
    });
  }
});

router.patch('/profiles/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const { name, email, matchName } = req.body;

    const fields: Record<string, any> = {};
    if (typeof name === 'string' && name.trim()) fields.Title = name.trim();
    if (typeof email === 'string') fields.Email = email.trim();
    if (typeof matchName === 'string') fields.MatchName = matchName;

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    const rawProfiles = await profilesRepository.getAll();
    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const spProfile = profiles.find(p => nameToSlug(p.Title) === slug);
    if (!spProfile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    await profilesRepository.updateFields(spProfile.ID, fields);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

router.post('/profiles', async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    const fields: { Title: string; Email?: string } = { Title: name.trim() };
    if (typeof email === 'string' && email.trim()) {
      fields.Email = email.trim();
    }

    const id = await profilesRepository.create(fields);
    res.json({ success: true, data: { id, name: fields.Title, email: fields.Email || '' } });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create profile',
      message: error.message
    });
  }
});

router.delete('/profiles/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug).toLowerCase();

    const [rawProfiles, rawEntries] = await Promise.all([
      profilesRepository.getAll(),
      entriesRepository.getAll()
    ]);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const spProfile = profiles.find(p => nameToSlug(p.Title) === slug);
    if (!spProfile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const profileEntries = entries.filter(e => safeParseLookupId(e[PROFILE_LOOKUP]) === spProfile.ID);
    if (profileEntries.length > 0) {
      res.status(400).json({ success: false, error: 'Cannot delete profile with existing entries' });
      return;
    }

    await profilesRepository.delete(spProfile.ID);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile',
      message: error.message
    });
  }
});

router.post('/profiles/:slug/regulars', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const { groupId } = req.body;

    if (!groupId || typeof groupId !== 'number') {
      res.status(400).json({ success: false, error: 'groupId is required and must be a number' });
      return;
    }

    const [rawProfiles, rawGroups, rawRegulars] = await Promise.all([
      profilesRepository.getAll(),
      groupsRepository.getAll(),
      regularsRepository.getAll()
    ]);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const spProfile = profiles.find(p => nameToSlug(p.Title) === slug);
    if (!spProfile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const group = groups.find(g => g.ID === groupId);
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    // Check for existing regular to prevent duplicates
    const existing = rawRegulars.find(
      r => safeParseLookupId(r[PROFILE_LOOKUP]) === spProfile.ID
        && safeParseLookupId(r[GROUP_LOOKUP]) === groupId
    );
    if (existing) {
      res.json({ success: true, data: { id: existing.ID } } as ApiResponse<{ id: number }>);
      return;
    }

    const id = await regularsRepository.create({
      [PROFILE_LOOKUP]: String(spProfile.ID),
      [GROUP_LOOKUP]: String(group.ID),
      Title: spProfile.Title || ''
    });

    res.json({ success: true, data: { id } } as ApiResponse<{ id: number }>);
  } catch (error: any) {
    console.error('Error creating regular:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create regular',
      message: error.message
    });
  }
});

router.delete('/regulars/:id', async (req: Request, res: Response) => {
  try {
    const regularId = parseInt(String(req.params.id), 10);
    if (isNaN(regularId)) {
      res.status(400).json({ success: false, error: 'Invalid regular ID' });
      return;
    }

    await regularsRepository.delete(regularId);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting regular:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete regular',
      message: error.message
    });
  }
});

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
