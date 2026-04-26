import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { recordsRepository } from '../services/repositories/records-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import { validateArray, validateSession, validateEntry, validateProfile, validateGroup, safeParseLookupId } from '../services/data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP } from '../services/field-names';
import { getAttendees, getOrgEvents, getEventConfigCheck, getCancelledAttendees, EventbriteConfigCheck } from '../services/eventbrite-client';
import { syncAttendeesForSession } from '../services/eventbrite-sync';
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
    const cancelledAttendees = await getCancelledAttendees(session.EventbriteEventID!);
    if (cancelledAttendees.length > 0)
      console.log(`[Eventbrite Sync] Session ${session.ID}: ${cancelledAttendees.length} cancelled attendees to check`);

    const result = await syncAttendeesForSession(session.ID, attendees, sessionEntries, profiles, allRecords, sessionDateMap, cancelledAttendees);
    newProfiles += result.newProfiles;
    newEntries += result.newEntries;
    newRecords += result.newRecords;
    updatedRecords += result.updatedRecords;
    cancelledEntries += result.cancelledEntries;
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

export = router;
