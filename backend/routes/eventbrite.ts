import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { recordsRepository } from '../services/repositories/records-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import { validateArray, validateSession, validateEntry, validateProfile, validateGroup, safeParseLookupId, toMatchName } from '../services/data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP, PROFILE_LOOKUP, ENTRY_CANCELLED, ENTRY_EVENTBRITE_ATTENDEE_ID } from '../services/field-names';
import { getAttendees, getOrgAttendees, getOrgEvents, getEventConfigCheck, getCancelledAttendees, EventbriteConfigCheck } from '../services/eventbrite-client';
import { syncAttendeesForSession, findProfileByAttendee } from '../services/eventbrite-sync';
import { computeAndSaveProfileStats } from '../services/profile-stats';
import { runSessionStatsRefresh } from '../services/session-stats';
import { runProfileStatsRefresh } from '../services/profile-stats';
import { runEntryStatsRefresh } from '../services/entry-stats';
import { runBackupExport } from '../services/backup-export';
import { sharePointClient } from '../services/sharepoint-client';

const router: Router = express.Router();

// Prevent concurrent sync runs (e.g. Logic App retry arriving while first run still in progress)
let syncInProgress = false;

interface SyncSessionsResult {
  totalEvents: number;
  matchedEvents: number;
  newSessions: number;
}

interface SyncAttendeesResult {
  sessionsProcessed: number;
  newProfiles: number;
  newEntries: number;
  newRecords: number;
  updatedRecords: number;
  cancelledEntries: number;
}

async function runSyncSessions(): Promise<SyncSessionsResult> {
  const [orgEvents, rawGroups, rawSessions] = await Promise.all([
    getOrgEvents(),
    groupsRepository.getAll(),
    sessionsRepository.getAll()
  ]);

  const groups = validateArray(rawGroups, validateGroup, 'Group');
  const sessions = validateArray(rawSessions, validateSession, 'Session');

  // Map EventbriteSeriesID → group
  const seriesMap = new Map<string, typeof groups[0]>();
  for (const g of groups) {
    if (g.EventbriteSeriesID) seriesMap.set(g.EventbriteSeriesID, g);
  }

  // Set of existing EventbriteEventIDs for quick lookup
  const existingEventIds = new Set(
    sessions.filter(s => s.EventbriteEventID).map(s => s.EventbriteEventID!)
  );

  let newSessions = 0;
  let matchedEvents = 0;

  for (const event of orgEvents) {
    if (!event.seriesId || !seriesMap.has(event.seriesId)) continue;
    matchedEvents++;

    if (existingEventIds.has(event.id)) continue;

    const group = seriesMap.get(event.seriesId)!;
    const dateStr = event.startDate ? event.startDate.substring(0, 10) : '';
    if (!dateStr) continue;

    const title = `${dateStr} ${group.Title || ''}`.trim();
    await sessionsRepository.create({
      Title: title,
      Date: `${dateStr}T12:00:00Z`,
      [GROUP_LOOKUP]: String(group.ID),
      EventbriteEventID: event.id
    });
    existingEventIds.add(event.id);
    newSessions++;
  }

  console.log(`[Eventbrite Sync] Sessions: ${orgEvents.length} total events, ${matchedEvents} matched, ${newSessions} new sessions`);
  return { totalEvents: orgEvents.length, matchedEvents, newSessions };
}

async function runSyncAttendees(): Promise<SyncAttendeesResult> {
  const [sessionsRaw, entriesRaw, profilesRaw] = await Promise.all([
    sessionsRepository.getAll(),
    entriesRepository.getAll(),
    profilesRepository.getAll(),
  ]);

  const sessions = validateArray(sessionsRaw, validateSession, 'Session');
  const entries = validateArray(entriesRaw, validateEntry, 'Entry');
  const profiles = validateArray(profilesRaw, validateProfile, 'Profile');

  const sessionDateMap = new Map<number, string>(
    sessions.map(s => [s.ID, (s.Date || '').substring(0, 10)])
  );

  // Process sessions with Eventbrite IDs that are today or future, chronologically
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const liveSessions = sessions
    .filter(s => {
      if (!s.EventbriteEventID || !s.Date) return false;
      const d = new Date(s.Date);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .sort((a, b) => (a.Date || '').localeCompare(b.Date || ''));

  console.log(`[Eventbrite Sync] ${liveSessions.length} live sessions with Eventbrite IDs`);

  let newProfiles = 0;
  let newEntries = 0;
  let newRecords = 0;
  let updatedRecords = 0;
  let cancelledEntries = 0;

  const allRecords = await recordsRepository.getAll();

  for (const session of liveSessions) {
    const attendees = await getAttendees(session.EventbriteEventID!);
    console.log(`[Eventbrite Sync] Session ${session.ID} (${session.EventbriteEventID}): ${attendees.length} attendees`);

    const sessionEntries = entries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === session.ID);

    const result = await syncAttendeesForSession(session.ID, attendees, sessionEntries, profiles, allRecords, sessionDateMap);
    newProfiles += result.newProfiles;
    newEntries += result.newEntries;
    newRecords += result.newRecords;
    updatedRecords += result.updatedRecords;

    // Cancellation — skip if no entries exist for this session
    if (!sessionEntries.length) continue;
    const cancelledAttendees = await getCancelledAttendees(session.EventbriteEventID!);
    if (cancelledAttendees.length > 0) {
      console.log(`[Eventbrite Sync] Session ${session.ID}: ${cancelledAttendees.length} cancelled attendees to check`);

      // Primary: match by EventbriteAttendeeID; fallback: name match via findProfileByAttendee
      const entryByAttendeeId = new Map<string, { id: number; profileId: number; alreadyCancelled: boolean }>();
      const entryByProfileId = new Map<number, { id: number; profileId: number; alreadyCancelled: boolean }>();
      for (const entry of sessionEntries) {
        const pid = safeParseLookupId(entry[PROFILE_LOOKUP]);
        if (pid === undefined) continue;
        const info = { id: entry.ID, profileId: pid, alreadyCancelled: !!entry[ENTRY_CANCELLED] };
        if (entry[ENTRY_EVENTBRITE_ATTENDEE_ID]) entryByAttendeeId.set(entry[ENTRY_EVENTBRITE_ATTENDEE_ID], info);
        entryByProfileId.set(pid, info);
      }

      for (const attendee of cancelledAttendees) {
        let entryInfo = entryByAttendeeId.get(attendee.id);
        if (!entryInfo) {
          // Fallback for pre-backfill entries without EventbriteAttendeeID
          const profile = findProfileByAttendee(attendee, profiles);
          if (profile) entryInfo = entryByProfileId.get(profile.ID);
        }
        if (!entryInfo || entryInfo.alreadyCancelled) continue;

        await entriesRepository.updateFields(entryInfo.id, { [ENTRY_CANCELLED]: new Date().toISOString() });
        computeAndSaveProfileStats(entryInfo.profileId).catch(err =>
          console.error('[Eventbrite Sync] computeAndSaveProfileStats failed for profile', entryInfo!.profileId, err)
        );
        cancelledEntries++;
      }
    }
  }

  console.log(`[Eventbrite Sync] Done: ${liveSessions.length} sessions, ${newProfiles} new profiles, ${newEntries} new entries, ${cancelledEntries} cancelled, ${newRecords} new records, ${updatedRecords} updated records`);
  return { sessionsProcessed: liveSessions.length, newProfiles, newEntries, newRecords, updatedRecords, cancelledEntries };
}

const WARMUP_KEYS = ['groups', 'sessions', 'profiles', 'regulars'] as const;

function snapshotCacheState(): Record<string, boolean> {
  return Object.fromEntries(WARMUP_KEYS.map(k => [k, sharePointClient.isCached(k)]));
}

async function runCacheWarmup(): Promise<void> {
  await Promise.all([
    groupsRepository.getAll(),
    sessionsRepository.getAll(),
    profilesRepository.getAll(),
    regularsRepository.getAll(),
  ]);
}

async function handleNightlyUpdate(req: Request, res: Response): Promise<void> {
  if (syncInProgress) {
    console.warn('[Eventbrite Sync] Rejected concurrent request — sync already in progress');
    res.status(409).json({ success: false, error: 'Sync already in progress' });
    return;
  }
  syncInProgress = true;
  const cacheBeforeSync = snapshotCacheState();
  try {
    const sessionResult = await runSyncSessions();
    const attendeeResult = await runSyncAttendees();
    const profileStatsResult = await runProfileStatsRefresh();
    const entryStatsResult = await runEntryStatsRefresh();
    const sessionStatsResult = await runSessionStatsRefresh();
    const backupResult = await runBackupExport();

    const cacheBeforeWarmup = snapshotCacheState();
    try {
      await runCacheWarmup();
    } catch (warmupError: any) {
      console.warn('[Nightly Update] Cache warmup failed (non-fatal):', warmupError.message);
    }

    const cacheStateLine = [
      `before sync: ${WARMUP_KEYS.map(k => `${k} ${cacheBeforeSync[k] ? 'warm' : 'cold'}`).join(', ')}`,
      `before warmup: ${WARMUP_KEYS.map(k => `${k} ${cacheBeforeWarmup[k] ? 'warm' : 'cold'}`).join(', ')}`
    ].join(' / ');
    const sessionIdsStr = sessionStatsResult.updatedIds.length ? ` (${sessionStatsResult.updatedIds.join(', ')})` : '';
    const profileIdsStr = profileStatsResult.updatedIds.length ? ` (${profileStatsResult.updatedIds.join(', ')})` : '';
    const entryIdsStr = entryStatsResult.updatedIds.length ? ` (${entryStatsResult.updatedIds.join(', ')})` : '';
    const parts = [
      `${sessionResult.totalEvents} events, ${sessionResult.matchedEvents} matched, ${sessionResult.newSessions} new sessions / ${attendeeResult.sessionsProcessed} sessions`,
      `${attendeeResult.newProfiles} new profiles, ${attendeeResult.newEntries} new entries, ${attendeeResult.cancelledEntries} cancelled, ${attendeeResult.newRecords} new consent records, ${attendeeResult.updatedRecords} updated consent records`,
      `Profile stats: ${profileStatsResult.updated}/${profileStatsResult.total} updated${profileStatsResult.errors.length ? `, ${profileStatsResult.errors.length} error(s)` : ''}${profileIdsStr}`,
      `Entry stats: ${entryStatsResult.updated}/${entryStatsResult.total} updated${entryStatsResult.errors.length ? `, ${entryStatsResult.errors.length} error(s)` : ''}${entryIdsStr}`,
      `Session stats: ${sessionStatsResult.updated}/${sessionStatsResult.total} updated${sessionStatsResult.errors.length ? `, ${sessionStatsResult.errors.length} error(s)` : ''}${sessionIdsStr}`,
      backupResult.updated.length ? `Backup: ${backupResult.updated.join(', ')} updated` : 'Backup: no changes',
      `Cache at start: ${cacheStateLine}`
    ];
    const summary = parts.join('<br>\n');

    console.log(`[Nightly Update] ${summary}`);
    res.json({ success: true, data: { summary, sessions: sessionResult, attendees: attendeeResult, profileStats: profileStatsResult, entryStats: entryStatsResult, sessionStats: sessionStatsResult, backup: backupResult, cache: { beforeSync: cacheBeforeSync, beforeWarmup: cacheBeforeWarmup } } });
  } catch (error: any) {
    console.error('Error running nightly update:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run nightly update'
    });
  } finally {
    syncInProgress = false;
  }
}

router.post('/eventbrite/nightly-update', handleNightlyUpdate);

router.post('/eventbrite/sync-attendees', async (req: Request, res: Response) => {
  if (syncInProgress) {
    console.warn('[Eventbrite Sync] Rejected concurrent request — sync already in progress');
    res.status(409).json({ success: false, error: 'Sync already in progress' });
    return;
  }
  syncInProgress = true;
  try {
    const attendees = await runSyncAttendees();
    const profileStatsResult = await runProfileStatsRefresh();
    const entryStatsResult = await runEntryStatsRefresh();
    const sessionStatsResult = await runSessionStatsRefresh();
    res.json({ success: true, data: { attendees, profileStats: profileStatsResult, entryStats: entryStatsResult, sessionStats: sessionStatsResult } });
  } catch (error: any) {
    console.error('Error syncing Eventbrite attendees:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync attendees'
    });
  } finally {
    syncInProgress = false;
  }
});

router.post('/eventbrite/sync-sessions', async (req: Request, res: Response) => {
  if (syncInProgress) {
    console.warn('[Eventbrite Sync] Rejected concurrent request — sync already in progress');
    res.status(409).json({ success: false, error: 'Sync already in progress' });
    return;
  }
  syncInProgress = true;
  try {
    const data = await runSyncSessions();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error syncing Eventbrite sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync sessions'
    });
  } finally {
    syncInProgress = false;
  }
});

router.get('/eventbrite/unmatched-events', async (req: Request, res: Response) => {
  try {
    const [orgEvents, rawGroups, rawSessions] = await Promise.all([
      getOrgEvents(),
      groupsRepository.getAll(),
      sessionsRepository.getAll()
    ]);

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const sessions = validateArray(rawSessions, validateSession, 'Session');

    const seriesMap = new Map<string, typeof groups[0]>();
    for (const g of groups) {
      if (g.EventbriteSeriesID) seriesMap.set(g.EventbriteSeriesID, g);
    }

    const existingEventIds = new Set(
      sessions.filter(s => s.EventbriteEventID).map(s => s.EventbriteEventID!)
    );

    const unmatched = orgEvents
      .filter(e => !e.seriesId || !seriesMap.has(e.seriesId))
      .filter(e => !existingEventIds.has(e.id))
      .map(e => ({
        eventId: e.id,
        name: e.name,
        date: e.startDate ? e.startDate.substring(0, 10) : ''
      }));

    res.json({ success: true, data: unmatched });
  } catch (error: any) {
    console.error('Error fetching unmatched events:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch unmatched events'
    });
  }
});

router.get('/eventbrite/event-config-check', async (req: Request, res: Response) => {
  try {
    const [orgEvents, rawGroups] = await Promise.all([
      getOrgEvents(),
      groupsRepository.getAll()
    ]);

    const groups = validateArray(rawGroups, validateGroup, 'Group');

    // Build seriesId → group map
    const seriesMap = new Map(
      groups.filter(g => g.EventbriteSeriesID).map(g => [g.EventbriteSeriesID!, g])
    );

    // One representative event per series (series config is shared across all events)
    const seriesChecked = new Set<string>();
    const results: EventbriteConfigCheck[] = [];
    for (const event of orgEvents) {
      if (!event.seriesId || !seriesMap.has(event.seriesId)) continue;
      if (seriesChecked.has(event.seriesId)) continue;
      seriesChecked.add(event.seriesId);
      const group = seriesMap.get(event.seriesId)!;
      const label = group.Name || group.Title;
      results.push(await getEventConfigCheck(event.id, label));
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error checking event config:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to check event config' });
  }
});

// Lightweight sync for recent Eventbrite registrations. Uses changed_since to fetch only
// attendees modified in the given time window — most sessions return empty, keeping this fast.
// #New tag is omitted: determining first-ever attendance requires a global entries snapshot.
// The full daily sync (event-and-attendee-update) applies #New correctly.
router.post('/eventbrite/quick-sync', async (req: Request, res: Response) => {
  if (syncInProgress) {
    res.status(409).json({ success: false, error: 'Sync already in progress' });
    return;
  }
  syncInProgress = true;
  try {
    const sinceHours: Record<string, number> = { '24h': 24, '48h': 48, '7d': 168 };
    const hours = sinceHours[String(req.query.since)] ?? 24;
    const changedSince = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [rawSessions, rawProfiles] = await Promise.all([
      sessionsRepository.getAll(),
      profilesRepository.getAll(),
    ]);

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const liveSessions = sessions.filter(s => {
      if (!s.EventbriteEventID || !s.Date) return false;
      const d = new Date(s.Date);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    });

    // Single org-wide call — skips all per-session Eventbrite calls
    const recentAttendees = await getOrgAttendees(changedSince);
    if (!recentAttendees.length) {
      console.log(`[QuickSync] No changed attendees in window — skipping`);
      res.json({ success: true, data: { added: 0, sessionsChecked: 0 } });
      return;
    }

    // Group by Eventbrite event ID so we can look up per session below
    const attendeesByEventId = new Map<string, typeof recentAttendees>();
    for (const a of recentAttendees) {
      if (!a.event_id) continue;
      if (!attendeesByEventId.has(a.event_id)) attendeesByEventId.set(a.event_id, []);
      attendeesByEventId.get(a.event_id)!.push(a);
    }

    const allRecords = recordsRepository.available ? await recordsRepository.getAll() : [];

    // Fetch entries once; index per session for syncAttendeesForSession
    const allEntriesRaw = await entriesRepository.getAll();
    const allEntries = validateArray(allEntriesRaw, validateEntry, 'Entry');
    const entriesBySession = new Map<number, typeof allEntries>();
    for (const e of allEntries) {
      const sId = safeParseLookupId(e[SESSION_LOOKUP]);
      if (sId === undefined) continue;
      if (!entriesBySession.has(sId)) entriesBySession.set(sId, []);
      entriesBySession.get(sId)!.push(e);
    }

    let added = 0;

    for (const session of liveSessions) {
      const attendees = attendeesByEventId.get(session.EventbriteEventID!) ?? [];
      if (!attendees.length) continue;

      console.log(`[QuickSync] Session ${session.ID} (${session.EventbriteEventID}): ${attendees.length} new/changed attendees`);

      const sessionEntries = entriesBySession.get(session.ID) ?? [];
      // Pass empty sessionDateMap — quick sync doesn't track #New (entry-stats handles snapshot.booking)
      const result = await syncAttendeesForSession(session.ID, attendees, sessionEntries, profiles, allRecords, new Map());
      added += result.newEntries;
    }

    console.log(`[QuickSync] ${liveSessions.length} sessions checked, ${added} entries added`);

    if (added > 0) {
      await runProfileStatsRefresh();
      await runEntryStatsRefresh();
      await runSessionStatsRefresh();
    }

    res.json({ success: true, data: { added, sessionsChecked: liveSessions.length } });
  } catch (error: any) {
    console.error('Error in quick sync:', error);
    res.status(500).json({ success: false, error: error.message || 'Quick sync failed' });
  } finally {
    syncInProgress = false;
  }
});

// One-time backfill: write EventbriteAttendeeID onto existing entries across all Eventbrite sessions.
// Responds immediately and runs in the background — check server logs for progress and final count.
// Safe to run multiple times — skips entries that already have the ID set.
router.post('/eventbrite/backfill-attendee-ids', async (req: Request, res: Response) => {
  try {
    const [sessionsRaw, entriesRaw, profilesRaw] = await Promise.all([
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      profilesRepository.getAll(),
    ]);

    const sessions = validateArray(sessionsRaw, validateSession, 'Session');
    const entries = validateArray(entriesRaw, validateEntry, 'Entry');
    const profiles = validateArray(profilesRaw, validateProfile, 'Profile');

    const eventbriteSessions = sessions.filter(s => s.EventbriteEventID);
    console.log(`[Backfill] Starting — ${eventbriteSessions.length} Eventbrite sessions to check`);

    // Respond immediately; process in background so the request doesn't time out
    res.json({ success: true, data: { message: `Backfill started for ${eventbriteSessions.length} sessions — check server logs for result` } });

    let updated = 0;
    let skipped = 0;
    let sessionsProcessed = 0;

    for (const session of eventbriteSessions) {
      const sessionEntries = entries.filter(e =>
        safeParseLookupId(e[SESSION_LOOKUP]) === session.ID &&
        !e[ENTRY_EVENTBRITE_ATTENDEE_ID]
      );

      if (!sessionEntries.length) continue;

      const attendees = await getAttendees(session.EventbriteEventID!);
      sessionsProcessed++;

      for (const entry of sessionEntries) {
        const profileId = safeParseLookupId(entry[PROFILE_LOOKUP]);
        if (profileId === undefined) { skipped++; continue; }
        const profile = profiles.find(p => p.ID === profileId);
        if (!profile) { skipped++; continue; }

        const profileNameKey = toMatchName(profile.Title || '');
        const profileMatchKey = toMatchName(profile.MatchName || '');
        const matched = attendees.find(a => {
          if (!a.profile?.name) return false;
          const nameKey = toMatchName(a.profile.name);
          return nameKey === profileNameKey || (profileMatchKey && nameKey === profileMatchKey);
        });

        if (matched) {
          await entriesRepository.updateFields(entry.ID, { [ENTRY_EVENTBRITE_ATTENDEE_ID]: matched.id });
          updated++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`[Backfill] Done — ${sessionsProcessed} sessions fetched from Eventbrite, ${updated} entries updated, ${skipped} skipped`);
  } catch (error: any) {
    console.error('[Backfill] Error:', error);
  }
});

export = router;
