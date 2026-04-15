import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
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
  convertSession,
  deriveLimits,
  calculateCurrentFY,
  calculateFinancialYear,
  findGroupByKey,
  safeParseLookupId,
  parseHours,
  nameToSlug,
  profileSlug,
  extractMetadataTags,
  calculateSessionStats
} from '../services/data-layer';
import {
  GROUP_LOOKUP, GROUP_DISPLAY,
  SESSION_LOOKUP, SESSION_NOTES, SESSION_METADATA, SESSION_COVER_MEDIA, SESSION_STATS, SESSION_LIMITS,
  PROFILE_LOOKUP, PROFILE_DISPLAY, PROFILE_STATS
} from '../services/field-names';
import type { SessionResponse, SessionDetailResponse, EntryResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';
import { sharePointClient } from '../services/sharepoint-client';
import { taxonomyClient } from '../services/taxonomy-client';
import { runSessionStatsRefresh } from '../services/session-stats';
import { clearCoverCacheKey } from '../services/cover-cache';

const router: Router = express.Router();

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const profileId = req.session.user?.profileId;

    // TODO #70: remove per-user flag embedding after public/ migration — Vue frontend derives from profileStats client-side
    const profileStats = req.session.user?.profileStats;
    const hasProfileStats = profileId !== undefined && profileStats !== undefined;

    const [sessionsRaw, groupsRaw, entriesRaw, regularsRaw] = await Promise.all([
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
      // Skip broad entries fetch when profile stats give us session IDs
      profileId !== undefined && !hasProfileStats ? entriesRepository.getAll() : Promise.resolve([]),
      regularsRepository.getAll(),
    ]);

    const groupKeyMap = new Map(groupsRaw.map(g => [g.ID, (g.Title || '').toLowerCase()]));
    const groupNameMap = new Map(groupsRaw.map(g => [g.ID, g.Name || g.Title || '']));
    const groupDescriptionMap = new Map(groupsRaw.map(g => [g.ID, g.Description || undefined]));

    // Count regulars per group for the X/Y Regular stat
    const groupRegularsCountMap = new Map<number, number>();
    for (const r of regularsRaw) {
      const gid = safeParseLookupId(r[GROUP_LOOKUP]);
      if (gid !== undefined) groupRegularsCountMap.set(gid, (groupRegularsCountMap.get(gid) ?? 0) + 1);
    }

    // Build per-user lookup maps — from profile stats if available, otherwise from fetched entries/regulars
    const registeredSessionIds = new Set<number>(profileStats?.sessionIds ?? []);
    const regularGroupIdSet = new Set<number>(profileStats?.regularGroupIds ?? []);

    if (profileId !== undefined && !hasProfileStats) {
      for (const e of entriesRaw) {
        const sid = safeParseLookupId(e[SESSION_LOOKUP]);
        const pid = safeParseLookupId(e[PROFILE_LOOKUP]);
        if (sid !== undefined && pid === profileId) registeredSessionIds.add(sid);
      }
      for (const r of regularsRaw) {
        const pid = safeParseLookupId(r[PROFILE_LOOKUP]);
        const gid = safeParseLookupId(r[GROUP_LOOKUP]);
        if (pid === profileId && gid !== undefined) regularGroupIdSet.add(gid);
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    const data: SessionResponse[] = sessionsRaw
      .filter(s => s.Date)
      .map(s => {
        const groupId = safeParseLookupId(s[GROUP_LOOKUP]);
        const date = s.Date!;
        const tags = extractMetadataTags(s[SESSION_METADATA]);

        let stats: Record<string, any> = {};
        try { stats = JSON.parse(s[SESSION_STATS] || '{}'); } catch {}

        return {
          id: s.ID,
          displayName: s.Name || undefined,
          description: s[SESSION_NOTES],
          date,
          groupId,
          groupKey: groupId !== undefined ? groupKeyMap.get(groupId) : undefined,
          groupName: groupId !== undefined ? groupNameMap.get(groupId) : undefined,
          groupDescription: groupId !== undefined ? groupDescriptionMap.get(groupId) : undefined,
          limits: deriveLimits(convertSession(s).limits, groupId !== undefined ? groupRegularsCountMap.get(groupId) : undefined),
          registrations: stats.count || 0,
          hours: stats.hours || 0,
          newCount: stats.new || undefined,
          childCount: stats.child || undefined,
          regularCount: stats.regular || undefined,
          eventbriteCount: stats.eventbrite || undefined,
          mediaCount: stats.media || undefined,
          regularsCount: groupId !== undefined ? groupRegularsCountMap.get(groupId) : undefined,
          financialYear: `FY${calculateFinancialYear(new Date(s.Date!))}`,
          isBookable: date >= today,
          eventbriteEventId: s.EventbriteEventID,
          metadata: tags.length ? tags : undefined,
          ...(profileId !== undefined && {
            isRegistered: registeredSessionIds.has(s.ID),
            isAttended: false, // attended status not available from profile stats; live on entry
            isRegular: groupId !== undefined && regularGroupIdSet.has(groupId),
          }),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

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

router.post('/sessions/bulk-tag', async (req: Request, res: Response) => {
  try {
    const { sessionIds, tags } = req.body;

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      res.status(400).json({ success: false, error: 'sessionIds array is required' });
      return;
    }
    if (!Array.isArray(tags) || tags.length === 0) {
      res.status(400).json({ success: false, error: 'tags array is required' });
      return;
    }

    const listGuid = process.env.SESSIONS_LIST_GUID;
    if (!listGuid) {
      res.status(400).json({ success: false, error: 'Sessions list not configured' });
      return;
    }

    const newTags: Array<{ label: string; termGuid: string }> = tags
      .map((t: any) => ({ label: t.label ?? '', termGuid: t.termGuid ?? '' }))
      .filter(t => t.label);

    if (newTags.length === 0) {
      res.status(400).json({ success: false, error: 'No valid tags provided' });
      return;
    }

    const rawSessions = await sessionsRepository.getAll();
    let updated = 0;

    for (const rawId of sessionIds) {
      const id = parseInt(String(rawId), 10);
      if (isNaN(id)) continue;

      const spSession = rawSessions.find(s => s.ID === id);
      if (!spSession) continue;

      // Merge new tags with existing — deduplicate by termGuid
      const existing = extractMetadataTags(spSession[SESSION_METADATA]);
      const existingGuids = new Set(existing.map(t => t.termGuid));
      const merged = [...existing, ...newTags.filter(t => !existingGuids.has(t.termGuid))];

      await taxonomyClient.updateManagedMetadataField(listGuid, id, SESSION_METADATA, merged);
      updated++;
    }

    res.json({ success: true, data: { updated } } as ApiResponse<{ updated: number }>);
  } catch (error: any) {
    console.error('Error bulk tagging sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk tag sessions',
      message: error.message
    });
  }
});


router.get('/sessions/:group/:date', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);

    // Phase 1: resolve group + session
    // getBySlug uses a 1h slug lookup cache; on miss does a single targeted OData query by Title.
    const [rawGroups, spSession, rawSessions, rawRegulars] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getBySlug(groupKey, dateParam),
      sessionsRepository.getAll(),
      regularsRepository.getAll()
    ]);

    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const groupId = spGroup.ID;
    const group = convertGroup(spGroup);
    const metadata = extractMetadataTags(spSession[SESSION_METADATA]);
    const regularsCount = rawRegulars.filter(r => safeParseLookupId(r[GROUP_LOOKUP]) === groupId).length || undefined;
    const sessionLimits = deriveLimits(convertSession(spSession).limits, regularsCount);

    const today = new Date().toISOString().slice(0, 10);
    const isPast = spSession.Date < today;
    const nextSpSession = isPast ? rawSessions
      .filter(s => safeParseLookupId(s[GROUP_LOOKUP] as unknown as string) === groupId && s.Date >= today)
      .sort((a, b) => a.Date.localeCompare(b.Date))[0] : undefined;
    const nextSession = nextSpSession ? `/sessions/${groupKey}/${nextSpSession.Date}` : undefined;

    // Public (unauthenticated) path: serve entirely from the session record and pre-computed Stats.
    // No entries or profiles fetch — everything shown publicly is already on the session.
    if (!req.session.user) {
      const statsJson = JSON.parse(spSession[SESSION_STATS] || '{}');
      const data: SessionDetailResponse = {
        id: spSession.ID,
        displayName: spSession.Name || spSession.Title,
        description: spSession[SESSION_NOTES],
        date: spSession.Date,
        groupId: groupId,
        groupName: group.displayName,
        groupDescription: group.description,
        limits: sessionLimits,
        regularsCount,
        registrations: statsJson.count ?? 0,
        hours: statsJson.hours ?? 0,
        newCount: statsJson.new || undefined,
        childCount: statsJson.child || undefined,
        regularCount: statsJson.regular || undefined,
        eventbriteCount: statsJson.eventbrite || undefined,
        financialYear: `FY${calculateFinancialYear(new Date(spSession.Date))}`,
        isBookable: spSession.Date >= today,
        eventbriteEventId: spSession.EventbriteEventID,
        groupEventbriteSeriesId: spGroup.EventbriteSeriesID || undefined,
        metadata: metadata.length ? metadata : undefined,
        coverMediaId: safeParseLookupId(spSession[SESSION_COVER_MEDIA] as unknown as string) ?? null,
        statsRaw: spSession[SESSION_STATS] || null,
        entries: [],
        nextSession
      };
      res.json({ success: true, data } as ApiResponse<SessionDetailResponse>);
      return;
    }

    // Authenticated path
    // Self-service: all personal flags come from profile stats cached at login — no entry fetch needed.
    // Admin/checkin: fetch all session entries + profiles to show the full volunteer list.
    const role = req.session.user?.role;
    const selfProfileId = req.session.user?.profileId;
    const selfProfileStats = req.session.user?.profileStats;
    const isSelfService = role === 'selfservice';

    const [rawEntries, rawProfiles] = await Promise.all([
      isSelfService ? Promise.resolve([]) : entriesRepository.getBySessionIds([spSession.ID]),
      isSelfService ? Promise.resolve([]) : profilesRepository.getAll(),
    ]);

    const sessionEntries = validateArray(rawEntries, validateEntry, 'Entry');
    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profileMap = new Map(profiles.map(p => [p.ID, p]));

    const entryResponses: EntryResponse[] = sessionEntries.map(e => {
      const volunteerId = safeParseLookupId(e[PROFILE_LOOKUP]);
      const profile = volunteerId !== undefined ? profileMap.get(volunteerId) : undefined;
      // isMember and cardStatus come from the pre-computed Profile.Stats field — no records fetch needed
      const stats = JSON.parse(profile?.[PROFILE_STATS] || '{}');
      return {
        id: e.ID,
        profileId: volunteerId,
        volunteerName: e[PROFILE_DISPLAY],
        volunteerSlug: volunteerId !== undefined ? profileSlug(e[PROFILE_DISPLAY], volunteerId) : nameToSlug(e[PROFILE_DISPLAY]),
        profileName: e[PROFILE_DISPLAY],
        profileSlug: volunteerId !== undefined ? profileSlug(e[PROFILE_DISPLAY], volunteerId) : nameToSlug(e[PROFILE_DISPLAY]),
        isGroup: profile?.IsGroup || false,
        isMember: stats.isMember === true,
        cardStatus: stats.cardStatus ?? undefined,
        count: e.Count || 1,
        hours: parseHours(e.Hours),
        checkedIn: e.Checked || false,
        notes: e.Notes,
        accompanyingAdultId: e.AccompanyingAdultLookupId
      };
    });

    const totalHours = sessionEntries.reduce((sum, e) => sum + parseHours(e.Hours), 0);
    const newCount = sessionEntries.filter(e => /#New\b/i.test(String(e.Notes || ''))).length;
    const childCount = sessionEntries.filter(e => /#Child\b/i.test(String(e.Notes || ''))).length;
    const regularCount = sessionEntries.filter(e => /#Regular\b/i.test(String(e.Notes || ''))).length;
    const eventbriteCount = sessionEntries.filter(e => /#Eventbrite\b/i.test(String(e.Notes || ''))).length;

    // Per-user personalised flags — from profile stats (all roles) with live entry fallback for admin/checkin
    let isRegistered: boolean | undefined;
    let isAttended: boolean | undefined;
    let isRegular: boolean | undefined;
    let userEntryId: number | undefined;

    if (selfProfileId !== undefined) {
      if (selfProfileStats) {
        isRegistered = selfProfileStats.sessionIds?.includes(spSession.ID) ?? false;
        isRegular = selfProfileStats.regularGroupIds?.includes(groupId) ?? false;
      }
      if (!isSelfService) {
        // Admin/checkin: derive live attended status from the fetched entries
        const ownEntry = entryResponses.find(e => e.profileId === selfProfileId);
        isRegistered = isRegistered ?? ownEntry !== undefined;
        isAttended = ownEntry?.checkedIn ?? false;
        userEntryId = ownEntry?.id;
        isRegular = isRegular ?? false;
      }
    }

    const data: SessionDetailResponse = {
      id: spSession.ID,
      displayName: spSession.Name || spSession.Title,
      description: spSession[SESSION_NOTES],
      date: spSession.Date,
      groupId: groupId,
      groupName: group.displayName,
      groupDescription: group.description,
      limits: sessionLimits,
      regularsCount,
      registrations: isSelfService ? (JSON.parse(spSession[SESSION_STATS] || '{}').count ?? 0) : sessionEntries.length,
      hours: Math.round(totalHours * 10) / 10,
      newCount: newCount || undefined,
      childCount: childCount || undefined,
      regularCount: regularCount || undefined,
      eventbriteCount: eventbriteCount || undefined,
      financialYear: `FY${calculateFinancialYear(new Date(spSession.Date))}`,
      isBookable: spSession.Date >= today,
      eventbriteEventId: spSession.EventbriteEventID,
      groupEventbriteSeriesId: spGroup.EventbriteSeriesID || undefined,
      metadata: metadata.length ? metadata : undefined,
      coverMediaId: safeParseLookupId(spSession[SESSION_COVER_MEDIA] as unknown as string) ?? null,
      statsRaw: spSession[SESSION_STATS] || null,
      entries: entryResponses,
      nextSession,
      ...(selfProfileId !== undefined && {
        isRegistered,
        isAttended,
        isRegular,
        userEntryId
      })
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
    const { displayName, description, eventbriteEventId, date, groupId, metadata, coverMediaId, limits } = req.body;

    const fields: Record<string, any> = {};
    if (typeof displayName === 'string') fields.Name = displayName;
    if (typeof description === 'string') fields[SESSION_NOTES] = description;
    if (typeof eventbriteEventId === 'string') fields.EventbriteEventID = eventbriteEventId;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fields.Date = date;
    }
    if (typeof groupId === 'number') fields[GROUP_LOOKUP] = String(groupId);
    if (typeof coverMediaId === 'number') fields[SESSION_COVER_MEDIA] = String(coverMediaId);
    if (coverMediaId === null) fields[SESSION_COVER_MEDIA] = null;
    if (limits === null) {
      fields[SESSION_LIMITS] = null;
    } else if (typeof limits === 'string') {
      try { JSON.parse(limits); fields[SESSION_LIMITS] = limits; } catch { /* ignore invalid JSON */ }
    }

    // Metadata is a Managed Metadata column — handled separately via the hidden companion field.
    // Graph API rejects direct writes to taxonomy fields but accepts writes to the hidden "_0" field.
    // Tags arrive as {label, termGuid}[] from the tree picker.
    const metadataTags: Array<{ label: string; termGuid: string }> | null =
      Array.isArray(metadata)
        ? metadata.map((t: any) => ({ label: t.label ?? t, termGuid: t.termGuid ?? '' })).filter(t => t.label)
        : null;

    if (Object.keys(fields).length === 0 && metadataTags === null) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    const [rawGroups, spSession] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getBySlug(groupKey, dateParam)
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    // Auto-update Title when date changes, if Title was auto-generated (starts with old date)
    if (fields.Date && typeof date === 'string') {
      const currentTitle = spSession.Title || '';
      if (currentTitle.startsWith(dateParam)) {
        fields.Title = `${date}${currentTitle.substring(dateParam.length)}`;
      }
    }

    let newGroupKey = groupKey;
    if (fields[GROUP_LOOKUP]) {
      const targetGroup = rawGroups.find(g => g.ID === groupId);
      if (!targetGroup) {
        res.status(404).json({ success: false, error: 'Target group not found' });
        return;
      }
      newGroupKey = (targetGroup.Title || '').toLowerCase();
    }

    // Update regular fields via Graph API, then taxonomy via its hidden companion field
    if (Object.keys(fields).length > 0) {
      await sessionsRepository.updateFields(spSession.ID, fields);
    }
    if (metadataTags !== null) {
      await taxonomyClient.updateManagedMetadataField(
        process.env.SESSIONS_LIST_GUID!, spSession.ID, SESSION_METADATA, metadataTags
      );
    }
    // Cover image changed — bust the server-side cover cache for this session
    if (SESSION_COVER_MEDIA in fields) {
      clearCoverCacheKey(`${groupKey}/${dateParam}`);
    }

    const newDate = fields.Date || dateParam;
    res.json({ success: true, data: { date: newDate, groupKey: newGroupKey } } as ApiResponse<{ date: string; groupKey: string }>);
  } catch (error: any) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session',
      message: error.message
    });
  }
});

// Full refresh of Stats field on all Sessions — admin or API key auth.
// Fetches sessions + entries + groups in one pass, then media counts per group,
// then patches Stats JSON to each session item in batches of 10.
// Returns { total, updated, errors } for display in the admin UI.
router.post('/sessions/refresh-stats', async (req: Request, res: Response) => {
  try {
    const result = await runSessionStatsRefresh();
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Stats] Session refresh failed:', error);
    res.status(500).json({ success: false, error: 'Stats refresh failed', message: error.message });
  }
});

router.delete('/sessions/:group/:date', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);

    const [rawGroups, spSession] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getBySlug(groupKey, dateParam)
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

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
