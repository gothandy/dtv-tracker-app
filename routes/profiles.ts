import express, { Request, Response, Router } from 'express';
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
    const { name, email, matchName, isGroup } = req.body;

    const fields: Record<string, any> = {};
    if (typeof name === 'string' && name.trim()) fields.Title = name.trim();
    if (typeof email === 'string') fields.Email = email.trim();
    if (typeof matchName === 'string') fields.MatchName = matchName;
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
