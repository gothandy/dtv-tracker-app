import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { groupsRepository } from '../services/repositories/groups-repository';
import { projectsRepository } from '../services/repositories/projects-repository';
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
  profileSlug,
  extractMetadataTags,
  parseEmails,
  sessionScheduleFields,
} from '../services/data-layer';
import { parseSessionStats } from '../services/data-layer';
import {
  GROUP_LOOKUP, GROUP_DISPLAY, PROJECT_LOOKUP,
  SESSION_LOOKUP, SESSION_NOTES, SESSION_METADATA, SESSION_COVER_MEDIA, SESSION_STATS, SESSION_LIMITS,
  PROFILE_LOOKUP, PROFILE_DISPLAY, PROFILE_STATS, ENTRY_CANCELLED, ENTRY_EVENTBRITE_ATTENDEE_ID
} from '../services/field-names';
import type { SessionResponse, SessionDetailResponse, EntryResponse } from '../../types/api-responses';
import type { ApiResponse } from '../../types/sharepoint';
import { sharePointClient } from '../services/sharepoint-client';
import { trackerAccessForProfileUser } from '../services/tracker-access';
import { taxonomyClient } from '../services/taxonomy-client';
import { runSessionStatsRefresh, refreshSessionMediaStats } from '../services/session-stats';
import { mediaDriveId } from '../services/media-upload';

const router: Router = express.Router();

function projectLookupFromBody(
  projectId: unknown,
  projectsRaw: Awaited<ReturnType<typeof projectsRepository.getAll>>
): string | null {
  if (projectId === null) return null;
  if (typeof projectId !== 'number' || !Number.isFinite(projectId)) {
    throw new Error('projectId must be a number or null');
  }
  const project = projectsRaw.find(p => p.ID === projectId);
  if (!project) {
    const err = new Error('Project not found') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  return String(projectId);
}

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const [sessionsRaw, groupsRaw, regularsRaw, projectsRaw] = await Promise.all([
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
      regularsRepository.getAll(),
      projectsRepository.getAll(),
    ]);

    const groupKeyMap = new Map(groupsRaw.map(g => [g.ID, (g.Title || '').toLowerCase()]));
    const groupNameMap = new Map(groupsRaw.map(g => [g.ID, g.Name || g.Title || '']));
    const groupDescriptionMap = new Map(groupsRaw.map(g => [g.ID, g.Description || undefined]));
    const projectKeyMap = new Map(projectsRaw.map(p => [p.ID, (p.Title || '').toLowerCase()]));
    const projectTitleMap = new Map(projectsRaw.map(p => [p.ID, p.Name || p.Title || '']));

    const groupRegularsCountMap = new Map<number, number>();
    for (const r of regularsRaw) {
      const gid = safeParseLookupId(r[GROUP_LOOKUP]);
      if (gid !== undefined) groupRegularsCountMap.set(gid, (groupRegularsCountMap.get(gid) ?? 0) + 1);
    }

    const today = new Date().toISOString().slice(0, 10);

    const data: SessionResponse[] = sessionsRaw
      .filter(s => s.Date)
      .map(s => {
        const groupId = safeParseLookupId(s[GROUP_LOOKUP]);
        const projectId = safeParseLookupId(s[PROJECT_LOOKUP]);
        const date = s.Date!;
        const tags = extractMetadataTags(s[SESSION_METADATA]);
        const stats = parseSessionStats(s[SESSION_STATS]);

        return {
          id: s.ID,
          displayName: s.Name || undefined,
          description: s[SESSION_NOTES],
          date,
          groupId,
          groupKey: groupId !== undefined ? groupKeyMap.get(groupId) : undefined,
          groupName: groupId !== undefined ? groupNameMap.get(groupId) : undefined,
          groupDescription: groupId !== undefined ? groupDescriptionMap.get(groupId) : undefined,
          projectId,
          projectKey: projectId !== undefined ? projectKeyMap.get(projectId) : undefined,
          projectTitle: projectId !== undefined ? projectTitleMap.get(projectId) : undefined,
          limits: deriveLimits(convertSession(s).limits, groupId !== undefined ? groupRegularsCountMap.get(groupId) : undefined, stats.cancelledRegular ?? 0),
          stats,
          mediaCount: stats.media,
          coverUrl: s[SESSION_COVER_MEDIA] && groupId !== undefined ? `/media/${groupKeyMap.get(groupId) ?? ''}/${date}/${s[SESSION_COVER_MEDIA]}` : undefined,
          regularsCount: groupId !== undefined ? groupRegularsCountMap.get(groupId) : undefined,
          financialYear: `FY${calculateFinancialYear(new Date(s.Date!))}`,
          isBookable: date >= today,
          eventbriteEventId: s.EventbriteEventID,
          metadata: tags.length ? tags : undefined,
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
    const { groupId, date, name, description, projectId } = req.body;

    if (!groupId || !date) {
      res.status(400).json({ success: false, error: 'groupId and date are required' });
      return;
    }

    const dateStr = String(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD format' });
      return;
    }

    const [groups, projectsRaw] = await Promise.all([
      groupsRepository.getAll(),
      projectsRepository.getAll(),
    ]);
    const group = groups.find(g => g.ID === Number(groupId));
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const allSessions = await sessionsRepository.getAll();
    const clash = allSessions.find(s =>
      safeParseLookupId(s[GROUP_LOOKUP]) === Number(groupId) &&
      (s.Date || '').substring(0, 10) === dateStr
    );
    if (clash) {
      res.status(409).json({ success: false, error: `A session for this group already exists on ${dateStr}` });
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
    if (projectId !== undefined) {
      fields[PROJECT_LOOKUP] = projectLookupFromBody(projectId, projectsRaw);
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

router.post('/sessions/bulk-project', async (req: Request, res: Response) => {
  try {
    const { sessionIds, projectId } = req.body;

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      res.status(400).json({ success: false, error: 'sessionIds array is required' });
      return;
    }
    if (!('projectId' in req.body)) {
      res.status(400).json({ success: false, error: 'projectId is required (use null for no project)' });
      return;
    }

    const projectsRaw = await projectsRepository.getAll();
    let lookupValue: string | null;
    try {
      lookupValue = projectLookupFromBody(projectId, projectsRaw);
    } catch (err: any) {
      const status = err.statusCode === 404 ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
      return;
    }

    let updated = 0;
    for (const rawId of sessionIds) {
      const id = parseInt(String(rawId), 10);
      if (isNaN(id)) continue;
      await sessionsRepository.updateFields(id, { [PROJECT_LOOKUP]: lookupValue });
      updated++;
    }

    res.json({ success: true, data: { updated } } as ApiResponse<{ updated: number }>);
  } catch (error: any) {
    console.error('Error bulk updating session projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update session projects',
      message: error.message
    });
  }
});

router.post('/sessions/bulk-media-public', async (req: Request, res: Response) => {
  try {
    const { sessionIds } = req.body;

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      res.status(400).json({ success: false, error: 'sessionIds array is required' });
      return;
    }

    let driveId: string;
    try {
      driveId = mediaDriveId();
    } catch {
      res.status(400).json({ success: false, error: 'Media library not configured' });
      return;
    }

    const [rawSessions, rawGroups] = await Promise.all([
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
    ]);
    const groupKeyMap = new Map(rawGroups.map(g => [g.ID, (g.Title || '').toLowerCase()]));

    let sessionsUpdated = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    for (const rawId of sessionIds) {
      const id = parseInt(String(rawId), 10);
      if (isNaN(id)) continue;

      const spSession = rawSessions.find(s => s.ID === id);
      if (!spSession?.Date) continue;

      const gid = safeParseLookupId(spSession[GROUP_LOOKUP]);
      const groupKey = gid !== undefined ? groupKeyMap.get(gid) : undefined;
      if (!groupKey) continue;

      try {
        const folderPath = `${groupKey}/${spSession.Date}`;
        const photos = await sharePointClient.listFolderPhotos(driveId, folderPath);
        const privateItems = photos.filter(p => !p.isPublic);

        for (const item of privateItems) {
          await sharePointClient.updateMediaItemFields(driveId, item.id, { IsPublic: true });
          itemsUpdated++;
        }

        if (privateItems.length > 0) {
          sharePointClient.clearMediaFolderCache(folderPath);
        }

        await refreshSessionMediaStats(id, groupKey, spSession.Date);
        sessionsUpdated++;
      } catch (err: any) {
        const msg = `Session ${id}: ${err.message}`;
        console.error(`[Bulk media public] ${msg}`);
        errors.push(msg);
      }
    }

    res.json({
      success: true,
      data: { sessionsUpdated, itemsUpdated, errors },
    } as ApiResponse<{ sessionsUpdated: number; itemsUpdated: number; errors: string[] }>);
  } catch (error: any) {
    console.error('Error bulk making session media public:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk make session media public',
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
    const [rawGroups, rawProjects, spSession, rawSessions, rawRegulars] = await Promise.all([
      groupsRepository.getAll(),
      projectsRepository.getAll(),
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
    const sessionProjectId = safeParseLookupId(spSession[PROJECT_LOOKUP]);
    const projectKeyMap = new Map(rawProjects.map(p => [p.ID, (p.Title || '').toLowerCase()]));
    const projectTitleMap = new Map(rawProjects.map(p => [p.ID, p.Name || p.Title || '']));
    const metadata = extractMetadataTags(spSession[SESSION_METADATA]);
    const regularsCount = rawRegulars.filter(r => safeParseLookupId(r[GROUP_LOOKUP]) === groupId).length || undefined;
    const storedStats = parseSessionStats(spSession[SESSION_STATS]);
    const rawLimits = convertSession(spSession).limits;
    const sessionLimits = deriveLimits(rawLimits, regularsCount, storedStats.cancelledRegular ?? 0);

    const today = new Date().toISOString().slice(0, 10);
    const isPast = spSession.Date < today;
    const nextSpSession = isPast ? rawSessions
      .filter(s => safeParseLookupId(s[GROUP_LOOKUP] as unknown as string) === groupId && s.Date >= today)
      .sort((a, b) => a.Date.localeCompare(b.Date))[0] : undefined;
    const nextSession = nextSpSession ? `/sessions/${groupKey}/${nextSpSession.Date}` : undefined;

    // Public (unauthenticated) path: serve entirely from the session record and pre-computed Stats.
    // No entries or profiles fetch — everything shown publicly is already on the session.
    if (!req.session.user) {
      const data: SessionDetailResponse = {
        id: spSession.ID,
        displayName: spSession.Name || spSession.Title,
        description: spSession[SESSION_NOTES],
        date: spSession.Date,
        ...sessionScheduleFields(spSession),
        groupId: groupId,
        groupName: group.displayName,
        groupDescription: group.description,
        projectId: sessionProjectId,
        projectKey: sessionProjectId !== undefined ? projectKeyMap.get(sessionProjectId) : undefined,
        projectTitle: sessionProjectId !== undefined ? projectTitleMap.get(sessionProjectId) : undefined,
        limits: sessionLimits,
        storedLimits: rawLimits,
        regularsCount,
        stats: storedStats,
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
    const hasCheckInTier = role === 'admin' || role === 'checkin';

    const [rawEntries, rawProfiles] = await Promise.all([
      isSelfService ? Promise.resolve([]) : entriesRepository.getBySessionIds([spSession.ID]),
      isSelfService ? Promise.resolve([]) : profilesRepository.getAll(),
    ]);

    const sessionEntries = validateArray(rawEntries, validateEntry, 'Entry');
    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profileMap = new Map(profiles.map(p => [p.ID, p]));

    // All session entries returned to check-in tier users (with cancelled flag).
    const entryResponses: EntryResponse[] = sessionEntries.map(e => {
      const volunteerId = safeParseLookupId(e[PROFILE_LOOKUP]);
      const profile = volunteerId !== undefined ? profileMap.get(volunteerId) : undefined;
      const pStats = JSON.parse(profile?.[PROFILE_STATS] || '{}');
      const isNew = volunteerId !== undefined && Array.isArray(pStats.sessionIds) && pStats.sessionIds[0] === spSession.ID;
      return {
        id: e.ID,
        profileId: volunteerId,
        volunteerName: e[PROFILE_DISPLAY],
        volunteerSlug: volunteerId !== undefined ? profileSlug(e[PROFILE_DISPLAY], volunteerId) : undefined,
        isGroup: profile?.IsGroup || false,
        isMember: pStats.isMember === true,
        cardStatus: pStats.cardStatus ?? undefined,
        profileWarning: pStats.warnings?.length ? true : undefined,
        count: e.Count || 1,
        hours: parseHours(e.Hours),
        checkedIn: e.Checked || false,
        notes: e.Notes,
        accompanyingAdultId: safeParseLookupId(e.AccompanyingAdultLookupId),
        cancelled: e[ENTRY_CANCELLED] || undefined,
        email: hasCheckInTier ? (profile ? parseEmails(profile.Email)[0] : undefined) : undefined,
        ...(hasCheckInTier ? { trackerAccess: trackerAccessForProfileUser(profile?.User) } : {}),
        labels: e.Labels,
        isNew: isNew || undefined,
        noPhoto: pStats.noPhoto === true || undefined,
        isFirstAiderAvailable: pStats.isFirstAider === true || undefined,
        eventbriteAttendeeId: e[ENTRY_EVENTBRITE_ATTENDEE_ID] || undefined
      };
    });

    // Per-user personalised flags — from profile stats (all roles) with live entry fallback for admin/checkin
    // For self-service: also look up their own entry to return userEntryId (needed for cancel flow)
    let isRegistered: boolean | undefined;
    let isAttended: boolean | undefined;
    let isRegular: boolean | undefined;
    let isRepeat: boolean | undefined;
    let userEntryId: number | undefined;
    let userProfileId: number | undefined;

    if (selfProfileId !== undefined) {
      userProfileId = selfProfileId;
      if (selfProfileStats) {
        const selfIsNew = !selfProfileStats.sessionIds?.length;
        isRegular = selfProfileStats.regularGroupIds?.includes(groupId) ?? false;
        isRepeat = !selfIsNew && !isRegular;
      }
      if (isSelfService) {
        // Self-service: fetch own entry to get userEntryId and live isRegistered status
        const selfEntries = await entriesRepository.getByProfileId(selfProfileId);
        // Prefer active entry over cancelled; among ties pick the most recently created
        const sessionEntries = selfEntries
          .filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === spSession.ID)
          .sort((a, b) => {
            if (!!a[ENTRY_CANCELLED] !== !!b[ENTRY_CANCELLED]) return a[ENTRY_CANCELLED] ? 1 : -1;
            return (b.ID ?? 0) - (a.ID ?? 0);
          });
        const ownEntry = sessionEntries[0];
        const attendedAny = sessionEntries.some(e => !e[ENTRY_CANCELLED] && !!e.Checked);
        if (ownEntry) {
          userEntryId = ownEntry.ID;
          // Cancelled entry: not registered (can re-book), but userEntryId still returned for cancel admin flows
          isRegistered = !ownEntry[ENTRY_CANCELLED];
          isAttended = attendedAny;
        } else {
          isRegistered = selfProfileStats?.sessionIds?.includes(spSession.ID) ?? false;
          isAttended = false;
        }
        isRegular = isRegular ?? false;
      } else {
        if (selfProfileStats) {
          isRegistered = selfProfileStats.sessionIds?.includes(spSession.ID) ?? false;
        }
        // Admin/checkin: derive live attended status and userEntryId from the fetched entries
        const ownEntry = entryResponses.find(e => e.profileId === selfProfileId);
        isRegistered = isRegistered ?? ownEntry !== undefined;
        isAttended = ownEntry?.checkedIn ?? false;
        // userEntryId: use the entry even if cancelled so admin can act on it
        userEntryId = ownEntry?.id;
        // If the own entry is cancelled, not registered
        if (ownEntry?.cancelled) isRegistered = false;
        isRegular = isRegular ?? false;
      }
    }

    const data: SessionDetailResponse = {
      id: spSession.ID,
      displayName: spSession.Name || spSession.Title,
      description: spSession[SESSION_NOTES],
      date: spSession.Date,
      ...sessionScheduleFields(spSession),
      groupId: groupId,
      groupName: group.displayName,
      groupDescription: group.description,
      projectId: sessionProjectId,
      projectKey: sessionProjectId !== undefined ? projectKeyMap.get(sessionProjectId) : undefined,
      projectTitle: sessionProjectId !== undefined ? projectTitleMap.get(sessionProjectId) : undefined,
      limits: sessionLimits,
      storedLimits: rawLimits,
      regularsCount,
      // Session stats: persisted Stats JSON on the session item (same for all callers — see AGENTS.md).
      stats: storedStats,
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
        isRepeat,
        userEntryId,
        userProfileId
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
    const { displayName, description, eventbriteEventId, date, groupId, projectId, metadata, coverMediaId, limits } = req.body;

    const [rawGroups, rawProjects, spSession] = await Promise.all([
      groupsRepository.getAll(),
      projectsRepository.getAll(),
      sessionsRepository.getBySlug(groupKey, dateParam)
    ]);

    const fields: Record<string, any> = {};
    if (typeof displayName === 'string') fields.Name = displayName;
    if (typeof description === 'string') fields[SESSION_NOTES] = description;
    if (typeof eventbriteEventId === 'string') fields.EventbriteEventID = eventbriteEventId;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fields.Date = date;
    }
    if (typeof groupId === 'number') fields[GROUP_LOOKUP] = String(groupId);
    if ('projectId' in req.body) {
      fields[PROJECT_LOOKUP] = projectLookupFromBody(projectId, rawProjects);
    }
    if (typeof coverMediaId === 'number') fields[SESSION_COVER_MEDIA] = String(coverMediaId);
    if (coverMediaId === null) fields[SESSION_COVER_MEDIA] = null;
    if (limits === null) {
      fields[SESSION_LIMITS] = null;
    } else if (typeof limits === 'object') {
      fields[SESSION_LIMITS] = JSON.stringify(limits);
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
    // Cover image changed — recompute media stats before responding so list filters stay in sync
    if (SESSION_COVER_MEDIA in fields) {
      try {
        await refreshSessionMediaStats(spSession.ID, groupKey, dateParam);
      } catch (err) {
        console.error(`[Stats] Failed media stats refresh after cover change for session ${spSession.ID}:`, err);
      }
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
