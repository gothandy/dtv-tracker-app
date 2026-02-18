import express, { Request, Response, Router } from 'express';
import { sharePointClient } from '../services/sharepoint-client';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import { recordsRepository } from '../services/repositories/records-repository';
import {
  validateArray,
  validateSession,
  validateEntry,
  validateGroup,
  validateProfile,
  convertProfile,
  calculateCurrentFY,
  calculateFinancialYear,
  buildBadgeLookups,
  safeParseLookupId,
  parseHours,
  nameToSlug
} from '../services/data-layer';
import {
  GROUP_LOOKUP,
  SESSION_LOOKUP,
  PROFILE_LOOKUP, PROFILE_DISPLAY
} from '../services/field-names';
import type { ProfileResponse, ProfileDetailResponse, ProfileEntryResponse, ProfileGroupHours, ConsentRecordResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const groupFilter = req.query.group ? String(req.query.group).toLowerCase() : undefined;

    const [rawProfiles, rawEntries, rawSessions, rawGroups, rawRecords] = await Promise.all([
      profilesRepository.getAll(),
      entriesRepository.getAll(),
      sessionsRepository.getAll(),
      groupFilter ? groupsRepository.getAll() : Promise.resolve([]),
      recordsRepository.available ? recordsRepository.getAll() : Promise.resolve([])
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
      const hours = parseHours(e.Hours);
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

    const { memberIds, cardStatusMap } = buildBadgeLookups(rawRecords);

    const profileRecordsMap = new Map<number, Array<{ type: string; status: string }>>();
    for (const r of rawRecords) {
      const pid = safeParseLookupId(r.ProfileLookupId as unknown as string);
      if (pid === undefined) continue;
      if (!profileRecordsMap.has(pid)) profileRecordsMap.set(pid, []);
      profileRecordsMap.get(pid)!.push({ type: r.Type || '', status: r.Status || '' });
    }

    const data: ProfileResponse[] = validProfiles.map(spProfile => {
      const profile = convertProfile(spProfile);
      const ps = profileStats.get(spProfile.ID);
      return {
        id: profile.id,
        slug: nameToSlug(profile.name),
        name: profile.name,
        email: profile.email,
        isGroup: profile.isGroup,
        isMember: memberIds.has(spProfile.ID),
        cardStatus: cardStatusMap.get(spProfile.ID),
        hoursLastFY: ps ? Math.round(ps.hoursLastFY * 10) / 10 : 0,
        hoursThisFY: ps ? Math.round(ps.hoursThisFY * 10) / 10 : 0,
        sessionsLastFY: ps ? ps.sessionsLastFY.size : 0,
        sessionsThisFY: ps ? ps.sessionsThisFY.size : 0,
        records: profileRecordsMap.get(spProfile.ID) || []
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

router.get('/profiles/export', async (req: Request, res: Response) => {
  try {
    const fyParam = String(req.query.fy || 'thisFy');
    const groupFilter = req.query.group ? String(req.query.group).toLowerCase() : undefined;
    const searchFilter = req.query.search ? String(req.query.search).toLowerCase() : undefined;
    const typeFilter = req.query.type ? String(req.query.type) : undefined;
    const hoursFilter = req.query.hours ? String(req.query.hours) : undefined;
    const recordTypeFilter = req.query.recordType ? String(req.query.recordType) : undefined;
    const recordStatusFilter = req.query.recordStatus ? String(req.query.recordStatus) : undefined;

    const [rawProfiles, rawEntries, rawSessions, rawGroups, rawRecords] = await Promise.all([
      profilesRepository.getAll(),
      entriesRepository.getAll(),
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
      recordsRepository.available ? recordsRepository.getAll() : Promise.resolve([])
    ]);

    const validProfiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const sessionMap = new Map(sessions.map(s => [s.ID, s]));

    // Group filter: restrict to sessions belonging to that group
    let groupSessionIds: Set<number> | undefined;
    if (groupFilter) {
      const spGroup = groups.find(g => (g.Title || '').toLowerCase() === groupFilter);
      if (spGroup) {
        groupSessionIds = new Set(
          sessions.filter(s => safeParseLookupId(s[GROUP_LOOKUP]) === spGroup.ID).map(s => s.ID)
        );
      }
    }

    const fy = calculateCurrentFY();
    const lastFYStart = fy.startYear - 1;

    // Calculate hours and session counts per profile
    const profileStats = new Map<number, { hoursThisFY: number; hoursLastFY: number; sessionsThisFY: Set<number>; sessionsLastFY: Set<number> }>();
    entries.forEach(e => {
      const volunteerId = safeParseLookupId(e[PROFILE_LOOKUP]);
      if (volunteerId === undefined) return;
      const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
      if (sessionId === undefined) return;
      if (groupSessionIds && !groupSessionIds.has(sessionId)) return;
      const session = sessionMap.get(sessionId);
      if (!session) return;
      const hours = parseHours(e.Hours);
      const sessionFY = calculateFinancialYear(new Date(session.Date));
      if (!profileStats.has(volunteerId)) {
        profileStats.set(volunteerId, { hoursThisFY: 0, hoursLastFY: 0, sessionsThisFY: new Set(), sessionsLastFY: new Set() });
      }
      const ps = profileStats.get(volunteerId)!;
      if (sessionFY === fy.startYear) { ps.hoursThisFY += hours; ps.sessionsThisFY.add(sessionId); }
      else if (sessionFY === lastFYStart) { ps.hoursLastFY += hours; ps.sessionsLastFY.add(sessionId); }
    });

    // Build records map
    const profileRecordsMap = new Map<number, Array<{ type: string; status: string }>>();
    for (const r of rawRecords) {
      const pid = safeParseLookupId(r.ProfileLookupId as unknown as string);
      if (pid === undefined) continue;
      if (!profileRecordsMap.has(pid)) profileRecordsMap.set(pid, []);
      profileRecordsMap.get(pid)!.push({ type: r.Type || '', status: r.Status || '' });
    }

    // Build profile list with stats
    let profileList = validProfiles.map(spProfile => {
      const profile = convertProfile(spProfile);
      const ps = profileStats.get(spProfile.ID);
      return {
        name: profile.name || '',
        email: profile.email || '',
        isGroup: profile.isGroup,
        hoursThisFY: ps ? Math.round(ps.hoursThisFY * 10) / 10 : 0,
        hoursLastFY: ps ? Math.round(ps.hoursLastFY * 10) / 10 : 0,
        sessionsThisFY: ps ? ps.sessionsThisFY.size : 0,
        sessionsLastFY: ps ? ps.sessionsLastFY.size : 0,
        records: profileRecordsMap.get(spProfile.ID) || []
      };
    });

    // Apply filters
    if (searchFilter) {
      profileList = profileList.filter(p =>
        p.name.toLowerCase().includes(searchFilter) ||
        p.email.toLowerCase().includes(searchFilter)
      );
    }
    if (typeFilter === 'individuals') profileList = profileList.filter(p => !p.isGroup);
    else if (typeFilter === 'groups') profileList = profileList.filter(p => p.isGroup);

    // Hours filter uses FY-appropriate hours
    const getHours = (p: typeof profileList[0]) => {
      if (fyParam === 'lastFy') return p.hoursLastFY;
      if (fyParam === 'all') return p.hoursThisFY + p.hoursLastFY;
      return p.hoursThisFY;
    };
    if (hoursFilter === '0') profileList = profileList.filter(p => getHours(p) === 0);
    else if (hoursFilter === 'lt15') profileList = profileList.filter(p => { const h = getHours(p); return h > 0 && h < 15; });
    else if (hoursFilter === '15plus') profileList = profileList.filter(p => getHours(p) >= 15);
    else if (hoursFilter === '15to30') profileList = profileList.filter(p => { const h = getHours(p); return h >= 15 && h <= 30; });
    else if (hoursFilter === '30plus') profileList = profileList.filter(p => getHours(p) > 30);

    // Record filters
    if (recordTypeFilter) {
      profileList = profileList.filter(p => {
        const recs = p.records.filter(r => r.type === recordTypeFilter);
        if (recordStatusFilter === 'none') return recs.length === 0;
        if (recordStatusFilter) return recs.some(r => r.status === recordStatusFilter);
        return recs.length > 0;
      });
    } else if (recordStatusFilter === 'none') {
      profileList = profileList.filter(p => p.records.length === 0);
    }

    // Filter out profiles with no activity unless explicitly showing 0h
    if (fyParam === 'thisFy' && hoursFilter !== '0') {
      profileList = profileList.filter(p => p.hoursThisFY > 0 || p.sessionsThisFY > 0 || hoursFilter === '0');
    } else if (fyParam === 'lastFy' && hoursFilter !== '0') {
      profileList = profileList.filter(p => p.hoursLastFY > 0 || p.sessionsLastFY > 0 || hoursFilter === '0');
    }

    // Sort by name
    profileList.sort((a, b) => a.name.localeCompare(b.name));

    // Sessions/Hours based on FY
    const getSessions = (p: typeof profileList[0]) => {
      if (fyParam === 'lastFy') return p.sessionsLastFY;
      if (fyParam === 'all') return p.sessionsThisFY + p.sessionsLastFY;
      return p.sessionsThisFY;
    };

    const csvHeader = '"Name","Email","Sessions","Hours"';
    const csvRows = profileList.map(p => {
      const name = p.name.replace(/"/g, '""');
      const email = p.email.replace(/"/g, '""');
      return `"${name}","${email}",${getSessions(p)},${getHours(p)}`;
    });

    const csv = [csvHeader, ...csvRows].join('\n');
    const todayStr = new Date().toISOString().substring(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${todayStr} Profiles.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    console.error('Error exporting profiles CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to export profiles', message: error.message });
  }
});

router.get('/records/options', async (req: Request, res: Response) => {
  try {
    if (!recordsRepository.available) {
      res.json({ success: true, data: { types: [], statuses: [] } });
      return;
    }
    const listGuid = process.env.RECORDS_LIST_GUID!;
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

router.post('/profiles/:id/records', async (req: Request, res: Response) => {
  try {
    const profileId = parseInt(String(req.params.id), 10);
    if (isNaN(profileId)) {
      res.status(400).json({ success: false, error: 'Invalid profile ID' });
      return;
    }
    if (!recordsRepository.available) {
      res.status(400).json({ success: false, error: 'Records list not configured' });
      return;
    }

    const { type, status, date } = req.body;
    if (!type || !status) {
      res.status(400).json({ success: false, error: 'type and status are required' });
      return;
    }

    const id = await recordsRepository.create({
      ProfileLookupId: profileId,
      Type: type,
      Status: status,
      Date: date || new Date().toISOString()
    });
    res.json({ success: true, data: { id } } as ApiResponse<{ id: number }>);
  } catch (error: any) {
    console.error('Error creating record:', error);
    res.status(500).json({ success: false, error: 'Failed to create record', message: error.message });
  }
});

router.patch('/records/:id', async (req: Request, res: Response) => {
  try {
    const recordId = parseInt(String(req.params.id), 10);
    if (isNaN(recordId)) {
      res.status(400).json({ success: false, error: 'Invalid record ID' });
      return;
    }
    if (!recordsRepository.available) {
      res.status(400).json({ success: false, error: 'Records list not configured' });
      return;
    }

    const { status, date } = req.body;
    const fields: { Status?: string; Date?: string } = {};
    if (typeof status === 'string') fields.Status = status;
    if (typeof date === 'string') fields.Date = date;

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    await recordsRepository.update(recordId, fields);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error updating record:', error);
    res.status(500).json({ success: false, error: 'Failed to update record', message: error.message });
  }
});

router.delete('/records/:id', async (req: Request, res: Response) => {
  try {
    const recordId = parseInt(String(req.params.id), 10);
    if (isNaN(recordId)) {
      res.status(400).json({ success: false, error: 'Invalid record ID' });
      return;
    }
    if (!recordsRepository.available) {
      res.status(400).json({ success: false, error: 'Records list not configured' });
      return;
    }

    await recordsRepository.delete(recordId);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting record:', error);
    res.status(500).json({ success: false, error: 'Failed to delete record', message: error.message });
  }
});

router.post('/records/bulk', async (req: Request, res: Response) => {
  try {
    if (!recordsRepository.available) {
      res.status(400).json({ success: false, error: 'Records list not configured' });
      return;
    }

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

      const existing = allRecords.find(
        r => safeParseLookupId(r.ProfileLookupId as unknown as string) === id && r.Type === type
      );

      if (existing) {
        await recordsRepository.update(existing.ID, { Status: status, Date: recordDate });
        updated++;
      } else {
        await recordsRepository.create({ ProfileLookupId: id, Type: type, Status: status, Date: recordDate });
        created++;
      }
    }

    res.json({ success: true, data: { created, updated } } as ApiResponse<{ created: number; updated: number }>);
  } catch (error: any) {
    console.error('Error bulk updating records:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk update records', message: error.message });
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
      const hours = parseHours(e.Hours);
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
          hours: parseHours(e.Hours),
          checkedIn: e.Checked || false,
          notes: e.Notes,
          financialYear: `FY${sessionFY}`
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Fetch consent records if available (one per profile+type)
    const profileRecords = await recordsRepository.getByProfile(spProfile.ID);
    const records: ConsentRecordResponse[] = profileRecords.map(r => ({
      id: r.ID,
      type: r.Type || '',
      status: r.Status || '',
      date: r.Date || ''
    }));

    const data: ProfileDetailResponse = {
      id: profile.id,
      slug: nameToSlug(profile.name),
      name: profile.name,
      email: profile.email,
      matchName: spProfile.MatchName,
      user: spProfile.User,
      isGroup: profile.isGroup,
      hoursLastFY: Math.round(calculatedLastFY * 10) / 10,
      hoursThisFY: Math.round(calculatedThisFY * 10) / 10,
      groupHours,
      entries: entryResponses,
      records: records.length > 0 ? records : undefined
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
    const { name, email, matchName, user, isGroup } = req.body;

    const fields: Record<string, any> = {};
    if (typeof name === 'string' && name.trim()) fields.Title = name.trim();
    if (typeof email === 'string') fields.Email = email.trim();
    if (typeof matchName === 'string') fields.MatchName = matchName;
    if (typeof user === 'string') fields.User = user.trim();
    if (typeof isGroup === 'boolean') fields.IsGroup = isGroup;

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

router.post('/profiles/:slug/transfer', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const { targetProfileId, deleteAfter } = req.body;

    if (!targetProfileId || typeof targetProfileId !== 'number') {
      res.status(400).json({ success: false, error: 'targetProfileId is required and must be a number' });
      return;
    }

    const [rawProfiles, rawEntries, rawRegulars, rawRecords] = await Promise.all([
      profilesRepository.getAll(),
      entriesRepository.getAll(),
      regularsRepository.getAll(),
      recordsRepository.available ? recordsRepository.getAll() : Promise.resolve([])
    ]);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const sourceProfile = profiles.find(p => nameToSlug(p.Title) === slug);
    if (!sourceProfile) {
      res.status(404).json({ success: false, error: 'Source profile not found' });
      return;
    }

    const targetProfile = profiles.find(p => p.ID === targetProfileId);
    if (!targetProfile) {
      res.status(404).json({ success: false, error: 'Target profile not found' });
      return;
    }

    if (sourceProfile.ID === targetProfile.ID) {
      res.status(400).json({ success: false, error: 'Source and target profiles must be different' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const sourceEntries = entries.filter(e => safeParseLookupId(e[PROFILE_LOOKUP]) === sourceProfile.ID);
    const entriesListGuid = process.env.ENTRIES_LIST_GUID!;

    // Transfer entries
    let entriesTransferred = 0;
    for (const entry of sourceEntries) {
      await sharePointClient.updateListItem(entriesListGuid, entry.ID, {
        [PROFILE_LOOKUP]: String(targetProfile.ID)
      });
      entriesTransferred++;
    }

    // Transfer regulars (skip if target already has the same group)
    const sourceRegulars = rawRegulars.filter(r => safeParseLookupId(r[PROFILE_LOOKUP]) === sourceProfile.ID);
    const targetRegularGroups = new Set(
      rawRegulars
        .filter(r => safeParseLookupId(r[PROFILE_LOOKUP]) === targetProfile.ID)
        .map(r => safeParseLookupId(r[GROUP_LOOKUP]))
        .filter((id): id is number => id !== undefined)
    );
    const regularsListGuid = process.env.REGULARS_LIST_GUID!;

    let regularsTransferred = 0;
    for (const regular of sourceRegulars) {
      const groupId = safeParseLookupId(regular[GROUP_LOOKUP]);
      if (groupId !== undefined && !targetRegularGroups.has(groupId)) {
        await sharePointClient.updateListItem(regularsListGuid, regular.ID, {
          [PROFILE_LOOKUP]: String(targetProfile.ID)
        });
        regularsTransferred++;
      } else {
        await regularsRepository.delete(regular.ID);
      }
    }

    // Transfer records (skip if target already has the same type)
    let recordsTransferred = 0;
    if (recordsRepository.available) {
      const sourceRecords = rawRecords.filter(r =>
        safeParseLookupId(r.ProfileLookupId as unknown as string) === sourceProfile.ID
      );
      const targetRecordTypes = new Set(
        rawRecords
          .filter(r => safeParseLookupId(r.ProfileLookupId as unknown as string) === targetProfile.ID)
          .map(r => r.Type)
      );
      const recordsListGuid = process.env.RECORDS_LIST_GUID!;

      for (const record of sourceRecords) {
        if (!targetRecordTypes.has(record.Type)) {
          await sharePointClient.updateListItem(recordsListGuid, record.ID, {
            ProfileLookupId: String(targetProfile.ID)
          });
          recordsTransferred++;
        } else {
          await sharePointClient.deleteListItem(recordsListGuid, record.ID);
        }
      }
      sharePointClient.cache.del('records');
    }

    // Clear caches
    sharePointClient.cache.del('entries');
    sharePointClient.cache.del('regulars');

    // Delete source profile if requested
    const deleted = !!deleteAfter;
    if (deleted) {
      await profilesRepository.delete(sourceProfile.ID);
    }

    const targetSlug = nameToSlug(targetProfile.Title);
    console.log(`[Transfer] ${sourceProfile.Title} → ${targetProfile.Title}: ${entriesTransferred} entries, ${regularsTransferred} regulars, ${recordsTransferred} records${deleted ? ', deleted source' : ''}`);

    res.json({
      success: true,
      data: { entriesTransferred, regularsTransferred, recordsTransferred, deleted, targetSlug }
    });
  } catch (error: any) {
    console.error('Error transferring profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer profile',
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

export = router;
