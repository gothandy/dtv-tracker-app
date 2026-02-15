import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import {
  validateArray,
  validateSession,
  validateEntry,
  validateProfile,
  convertGroup,
  calculateCurrentFY,
  calculateFinancialYear,
  findGroupByKey,
  findSessionByGroupAndDate,
  safeParseLookupId,
  parseHours,
  nameToSlug
} from '../services/data-layer';
import {
  GROUP_LOOKUP,
  SESSION_LOOKUP,
  PROFILE_LOOKUP, PROFILE_DISPLAY
} from '../services/field-names';
import type { EntryDetailResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

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
    const sessions = validateArray(rawSessions, validateSession, 'Session');
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
      const h = parseHours(e.Hours);
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
      hours: parseHours(spEntry.Hours),
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

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const sessionEntries = entries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === spSession.ID);
    const existingVolunteerIds = new Set(
      sessionEntries.map(e => safeParseLookupId(e[PROFILE_LOOKUP])).filter(id => id !== undefined)
    );

    const groupRegulars = rawRegulars.filter(r => safeParseLookupId(r[GROUP_LOOKUP]) === spGroup.ID);
    const toAdd = groupRegulars.filter(r => {
      const vid = safeParseLookupId(r[PROFILE_LOOKUP]);
      return vid !== undefined && !existingVolunteerIds.has(vid);
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

export = router;
