import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import {
  enrichSessions,
  sortSessionsByDate,
  validateArray,
  validateSession,
  validateEntry,
  validateGroup,
  convertGroup,
  groupRegularsByCrewId,
  calculateCurrentFY,
  calculateFinancialYear,
  findGroupByKey,
  safeParseLookupId,
  parseHours
} from '../services/data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP, PROFILE_LOOKUP } from '../services/field-names';
import type { GroupResponse, GroupDetailResponse, SessionResponse } from '../types/api-responses';
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

    const spGroup = findGroupByKey(rawGroups, key);
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

    const totalHours = fyEntries.reduce((sum, e) => sum + parseHours(e.Hours), 0);
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
    const spGroup = findGroupByKey(rawGroups, key);
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

router.delete('/groups/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key).toLowerCase();

    const rawGroups = await groupsRepository.getAll();
    const spGroup = findGroupByKey(rawGroups, key);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    await groupsRepository.delete(spGroup.ID);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete group',
      message: error.message
    });
  }
});

export = router;
