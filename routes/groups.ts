import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
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
  convertSession,
  deriveLimits,
  groupRegularsByCrewId,
  calculateCurrentFY,
  calculateFinancialYear,
  findGroupByKey,
  safeParseLookupId,
  parseHours,
  extractMetadataTags
} from '../services/data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP, PROFILE_LOOKUP, SESSION_STATS, SESSION_NOTES, SESSION_METADATA } from '../services/field-names';
import type { GroupResponse, GroupDetailResponse, SessionResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';
import { sharePointClient } from '../services/sharepoint-client';

const router: Router = express.Router();

router.get('/groups', async (req: Request, res: Response) => {
  try {
    const [rawGroups, rawRegulars] = await Promise.all([
      groupsRepository.getAll(),
      regularsRepository.getAll()
    ]);
    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const regularsMap = groupRegularsByCrewId(rawRegulars);

    const role = req.session.user?.role;
    const isTrusted = !!req.session.user && role !== 'selfservice';
    const selfServiceProfileIds = role === 'selfservice'
      ? (req.session.user?.profileIds || [])
      : [];

    const data: GroupResponse[] = groups.map(spGroup => {
      const group = convertGroup(spGroup);
      const regulars = regularsMap.get(group.sharePointId) || [];

      if (isTrusted) {
        return {
          id: group.sharePointId,
          key: (group.lookupKeyName || '').toLowerCase(),
          displayName: group.displayName,
          description: group.description,
          eventbriteSeriesId: group.eventbriteSeriesId,
          regularsCount: regulars.length,
          regulars
        };
      }

      // Self-service or public: hide regulars list, but tell self-service if they personally are one
      const isCurrentUserRegular = selfServiceProfileIds.length > 0
        ? rawRegulars.some(r =>
            safeParseLookupId(r[GROUP_LOOKUP]) === group.sharePointId &&
            selfServiceProfileIds.includes(safeParseLookupId(r[PROFILE_LOOKUP]) as number)
          )
        : undefined;

      return {
        id: group.sharePointId,
        key: (group.lookupKeyName || '').toLowerCase(),
        displayName: group.displayName,
        description: group.description,
        eventbriteSeriesId: group.eventbriteSeriesId,
        regularsCount: 0,
        regulars: [],
        ...(isCurrentUserRegular !== undefined && { isCurrentUserRegular })
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

    const [rawGroups, rawRegulars, rawSessions] = await Promise.all([
      groupsRepository.getAll(),
      regularsRepository.getAll(),
      sessionsRepository.getAll()
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
    const groupSessions = rawSessions.filter(s => s.Date && safeParseLookupId(s[GROUP_LOOKUP]) === groupId);

    // FY sessions for stats
    const fyStart = new Date(Date.UTC(fy.startYear, 3, 1));
    const fyEnd = new Date(Date.UTC(fy.endYear, 2, 31, 23, 59, 59));
    const fySessions = groupSessions.filter(s => {
      const d = new Date(s.Date!);
      return d >= fyStart && d <= fyEnd;
    });

    // Aggregate FY stats from pre-computed Stats field on each session
    let totalHours = 0, newVolunteers = 0, children = 0, totalRegistrations = 0;
    for (const s of fySessions) {
      let stats: Record<string, any> = {};
      try { stats = JSON.parse(s[SESSION_STATS] || '{}'); } catch {}
      totalHours      += stats.hours || 0;
      newVolunteers   += stats.new   || 0;
      children        += stats.child || 0;
      totalRegistrations += stats.count || 0;
    }

    // Build session responses from Stats field — no entries or media calls needed
    const today = new Date().toISOString().slice(0, 10);

    const allSessionResponses: SessionResponse[] = groupSessions
      .map(s => {
        let stats: Record<string, any> = {};
        try { stats = JSON.parse(s[SESSION_STATS] || '{}'); } catch {}
        const date = s.Date!;
        const tags = extractMetadataTags(s[SESSION_METADATA]);
        return {
          id: s.ID,
          displayName: s.Name || undefined,
          description: s[SESSION_NOTES],
          date,
          groupId,
          groupKey: key,
          groupName: group.displayName,
          limits: deriveLimits(convertSession(s).limits, regulars.length),
          registrations: stats.count || 0,
          hours: stats.hours || 0,
          mediaCount: stats.media || undefined,
          financialYear: `FY${calculateFinancialYear(new Date(date))}`,
          isBookable: date >= today,
          eventbriteEventId: s.EventbriteEventID,
          metadata: tags.length ? tags : undefined
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const role = req.session.user?.role;
    const isTrusted = !!req.session.user && role !== 'selfservice';
    const selfServiceProfileIds = role === 'selfservice'
      ? (req.session.user?.profileIds || [])
      : [];

    const isCurrentUserRegular = selfServiceProfileIds.length > 0
      ? rawRegulars.some(r =>
          safeParseLookupId(r[GROUP_LOOKUP]) === groupId &&
          selfServiceProfileIds.includes(safeParseLookupId(r[PROFILE_LOOKUP]) as number)
        )
      : undefined;

    const data: GroupDetailResponse = {
      id: group.sharePointId,
      key: (group.lookupKeyName || '').toLowerCase(),
      displayName: group.displayName,
      description: group.description,
      eventbriteSeriesId: group.eventbriteSeriesId,
      regulars: isTrusted ? regulars : [],
      ...(isCurrentUserRegular !== undefined && { isCurrentUserRegular }),
      financialYear: `${fy.startYear}-${fy.endYear}`,
      stats: {
        sessions: fySessions.length,
        hours: Math.round(totalHours * 10) / 10,
        newVolunteers,
        children,
        totalVolunteers: totalRegistrations  // total registrations — unique volunteer count deferred to Phase 2
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
    const { displayName, description, eventbriteSeriesId, key: newKeyRaw } = req.body;

    const fields: Record<string, any> = {};
    if (typeof displayName === 'string') fields.Name = displayName;
    if (typeof description === 'string') fields.Description = description;
    if (typeof eventbriteSeriesId === 'string') fields.EventbriteSeriesID = eventbriteSeriesId;
    if (typeof newKeyRaw === 'string' && newKeyRaw.trim()) {
      if (/\s/.test(newKeyRaw.trim())) {
        res.status(400).json({ success: false, error: 'Key Name cannot contain spaces' });
        return;
      }
      fields.Title = newKeyRaw.trim();
    }

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

    if (fields.Title) {
      const rawSessions = await sessionsRepository.getAll();
      const groupSessions = validateArray(rawSessions, validateSession, 'Session')
        .filter(s => safeParseLookupId(s[GROUP_LOOKUP]) === spGroup.ID);
      await Promise.all(
        groupSessions.map(s =>
          sessionsRepository.updateFields(s.ID, { Title: `${s.Date} ${fields.Title}` })
        )
      );
    }

    const resultKey = fields.Title ? fields.Title.toLowerCase() : key;
    res.json({ success: true, data: { key: resultKey } } as ApiResponse<{ key: string }>);
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
