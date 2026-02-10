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
import type { GroupResponse, GroupDetailResponse, SessionResponse, SessionDetailResponse, EntryResponse, EntryDetailResponse, ProfileResponse, ProfileDetailResponse, ProfileEntryResponse, StatsResponse } from '../types/api-responses';
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
      .filter(s => safeParseLookupId(s.CrewLookupId) === groupId);

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
      const sessionId = safeParseLookupId(e.EventLookupId);
      return sessionId !== undefined && fySessionIds.has(sessionId);
    });

    const totalHours = fyEntries.reduce((sum, e) => sum + (parseFloat(String(e.Hours)) || 0), 0);
    const newVolunteers = fyEntries.filter(e => e.Notes && /\#new\b/i.test(e.Notes)).length;
    const children = fyEntries.filter(e => e.Notes && /\#child\b/i.test(e.Notes)).length;
    const uniqueVolunteers = new Set(
      fyEntries
        .map(e => safeParseLookupId(e.VolunteerLookupId))
        .filter((id): id is number => id !== undefined)
    ).size;

    // Enrich sessions for display
    const enriched = enrichSessions(groupSessions, rawEntries, rawGroups);
    const sorted = sortSessionsByDate(enriched);

    const now = new Date();
    const upcoming = sorted.filter(s => s.sessionDate >= now);
    const past = sorted.filter(s => s.sessionDate < now);

    const toSessionResponse = (s: any): SessionResponse => ({
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
    });

    const nextSession = upcoming.length > 0 ? toSessionResponse(upcoming[upcoming.length - 1]) : undefined;
    const recentSessions = past.slice(0, 3).map(toSessionResponse);

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
      nextSession,
      recentSessions
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
      if (safeParseLookupId(s.CrewLookupId) !== groupId) return false;
      const sessionDate = s.Date.substring(0, 10);
      return sessionDate === dateParam;
    });

    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const sessionEntries = entries.filter(e => safeParseLookupId(e.EventLookupId) === spSession.ID);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profileMap = new Map(profiles.map(p => [p.ID, p]));

    const entryResponses: EntryResponse[] = sessionEntries.map(e => {
      const volunteerId = safeParseLookupId(e.VolunteerLookupId);
      const profile = volunteerId !== undefined ? profileMap.get(volunteerId) : undefined;
      return {
        id: e.ID,
        volunteerName: e.Volunteer,
        volunteerSlug: nameToSlug(e.Volunteer),
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
      description: spSession.Description,
      date: spSession.Date,
      groupId: groupId,
      groupName: group.displayName,
      registrations: sessionEntries.length,
      hours: Math.round(totalHours * 10) / 10,
      financialYear: `FY${new Date(spSession.Date).getMonth() >= 3 ? new Date(spSession.Date).getFullYear() : new Date(spSession.Date).getFullYear() - 1}`,
      eventbriteEventId: spSession.EventbriteEventID,
      eventbriteUrl: spSession.Url,
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
      if (safeParseLookupId(s.CrewLookupId) !== spGroup.ID) return false;
      return s.Date.substring(0, 10) === dateParam;
    });
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const spEntry = entries.find(e => {
      if (safeParseLookupId(e.EventLookupId) !== spSession.ID) return false;
      return nameToSlug(e.Volunteer) === slug;
    });
    if (!spEntry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const volunteerId = safeParseLookupId(spEntry.VolunteerLookupId);
    const profile = volunteerId !== undefined ? profiles.find(p => p.ID === volunteerId) : undefined;

    const group = convertGroup(spGroup);

    const data: EntryDetailResponse = {
      id: spEntry.ID,
      volunteerName: spEntry.Volunteer,
      volunteerSlug: nameToSlug(spEntry.Volunteer),
      isGroup: profile?.IsGroup || false,
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

router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const rawProfiles = await profilesRepository.getAll();
    const validProfiles = validateArray(rawProfiles, validateProfile, 'Profile');

    const data: ProfileResponse[] = validProfiles.map(spProfile => {
      const profile = convertProfile(spProfile);
      return {
        id: profile.id,
        slug: nameToSlug(profile.name),
        name: profile.name,
        email: profile.email,
        isGroup: profile.isGroup,
        hoursLastFY: profile.hoursLastFY,
        hoursThisFY: profile.hoursThisFY
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

    const [rawProfiles, rawEntries, rawSessions, rawGroups] = await Promise.all([
      profilesRepository.getAll(),
      entriesRepository.getAll(),
      sessionsRepository.getAll(),
      groupsRepository.getAll()
    ]);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const spProfile = profiles.find(p => nameToSlug(p.Title) === slug);
    if (!spProfile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const profile = convertProfile(spProfile);

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const profileEntries = entries.filter(e => safeParseLookupId(e.VolunteerLookupId) === spProfile.ID);

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const sessionMap = new Map(sessions.map(s => [s.ID, s]));

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const groupMap = new Map(groups.map(g => [g.ID, g]));
    const groupKeyMap = new Map(groups.map(g => [g.ID, (g.Title || '').toLowerCase()]));

    // Calculate FY hours from entries and build group hours breakdown
    const fy = calculateCurrentFY();
    const lastFYStart = fy.startYear - 1;
    let calculatedThisFY = 0;
    let calculatedLastFY = 0;
    const groupHoursMap = new Map<string, number>();

    profileEntries.forEach(e => {
      const sessionId = safeParseLookupId(e.EventLookupId);
      if (sessionId === undefined) return;
      const session = sessionMap.get(sessionId);
      if (!session) return;
      const hours = parseFloat(String(e.Hours)) || 0;
      const sessionFY = calculateFinancialYear(new Date(session.Date));

      if (sessionFY === fy.startYear) {
        calculatedThisFY += hours;
        const groupId = safeParseLookupId(session.CrewLookupId);
        if (groupId !== undefined) {
          const group = groupMap.get(groupId);
          const groupName = group?.Name || group?.Title || 'Unknown';
          groupHoursMap.set(groupName, (groupHoursMap.get(groupName) || 0) + hours);
        }
      } else if (sessionFY === lastFYStart) {
        calculatedLastFY += hours;
      }
    });

    const groupHours = [...groupHoursMap.entries()]
      .map(([groupName, hours]) => ({ groupName, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);

    // Build entry responses sorted by date desc
    const entryResponses: ProfileEntryResponse[] = profileEntries
      .map(e => {
        const sessionId = safeParseLookupId(e.EventLookupId);
        const session = sessionId !== undefined ? sessionMap.get(sessionId) : undefined;
        const groupId = session ? safeParseLookupId(session.CrewLookupId) : undefined;
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

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const fy = calculateCurrentFY();

    const [sessionsFY, entries] = await Promise.all([
      sessionsRepository.getByFinancialYear(fy.key),
      entriesRepository.getAll()
    ]);

    const stats = calculateFYStats(sessionsFY, entries);

    const data: StatsResponse = {
      activeGroupsFY: stats.activeGroups,
      sessionsFY: stats.sessions,
      hoursFY: stats.hours,
      volunteersFY: stats.volunteers,
      financialYear: `${fy.startYear}-${fy.endYear}`
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

export = router;
