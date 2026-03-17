import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { recordsRepository } from '../services/repositories/records-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import { validateArray, validateSession, validateEntry, validateProfile, validateGroup, safeParseLookupId } from '../services/data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP, PROFILE_LOOKUP } from '../services/field-names';
import { getAttendees, getOrgEvents, getEventConfigCheck, EventbriteConfigCheck } from '../services/eventbrite-client';
import { isNewVolunteer, findOrCreateProfile, upsertConsentRecords } from '../services/eventbrite-sync';

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
  duplicateWarnings: number;
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
  const [sessionsRaw, entriesRaw, profilesRaw, regularsRaw] = await Promise.all([
    sessionsRepository.getAll(),
    entriesRepository.getAll(),
    profilesRepository.getAll(),
    regularsRepository.getAll()
  ]);

  const sessions = validateArray(sessionsRaw, validateSession, 'Session');
  const entries = validateArray(entriesRaw, validateEntry, 'Entry');
  const profiles = validateArray(profilesRaw, validateProfile, 'Profile');

  // Build set of groupId-profileId pairs for quick regular lookups
  const regularSet = new Set<string>();
  for (const r of regularsRaw) {
    const gId = safeParseLookupId(r[GROUP_LOOKUP]);
    const pId = safeParseLookupId(r[PROFILE_LOOKUP]);
    if (gId !== undefined && pId !== undefined) regularSet.add(`${gId}-${pId}`);
  }

  // Find sessions with EventbriteEventID that are today or future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const liveSessions = sessions.filter(s => {
    if (!s.EventbriteEventID || !s.Date) return false;
    const sessionDate = new Date(s.Date);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate >= today;
  });

  console.log(`[Eventbrite Sync] ${liveSessions.length} live sessions with Eventbrite IDs`);

  let newProfiles = 0;
  let newEntries = 0;
  let newRecords = 0;
  let updatedRecords = 0;
  let duplicateWarnings = 0;

  // Load existing records for upsert
  const allRecords = await recordsRepository.getAll();

  for (const session of liveSessions) {
    const attendees = await getAttendees(session.EventbriteEventID!);
    console.log(`[Eventbrite Sync] Session ${session.ID} (${session.EventbriteEventID}): ${attendees.length} attendees`);

    // Get existing entry profile IDs for this session
    const sessionEntries = entries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === session.ID);
    const existingProfileIds = new Set(
      sessionEntries.map(e => safeParseLookupId(e[PROFILE_LOOKUP])).filter(id => id !== undefined)
    );

    for (const attendee of attendees) {
      const attendeeName = attendee.profile?.name;
      const attendeeEmail = attendee.profile?.email;
      if (!attendeeName) continue;

      const { profile, isNew, clash } = await findOrCreateProfile(attendeeName, attendeeEmail, profiles, 'Eventbrite Sync');
      if (isNew) newProfiles++;
      if (clash) duplicateWarnings++;

      // Create entry if not already registered
      const profileId = profile.ID;
      if (!existingProfileIds.has(profileId)) {
        const noteTags: string[] = [];
        if (isNewVolunteer(entries, profileId, session.ID)) noteTags.push('#New');
        if (attendee.ticket_class_name?.toLowerCase().includes('child')) noteTags.push('#Child');
        noteTags.push('#Eventbrite');
        if (clash) noteTags.push('#Duplicate');
        const sessionGroupId = safeParseLookupId(session[GROUP_LOOKUP]);
        if (sessionGroupId !== undefined && regularSet.has(`${sessionGroupId}-${profileId}`)) noteTags.push('#Regular');
        await entriesRepository.create({
          [SESSION_LOOKUP]: String(session.ID),
          [PROFILE_LOOKUP]: String(profileId),
          Notes: noteTags.join(' ')
        });
        existingProfileIds.add(profileId);
        newEntries++;
      }

      // Upsert consent records from Eventbrite answers
      const { created, updated } = await upsertConsentRecords(profileId, attendee, allRecords);
      newRecords += created;
      updatedRecords += updated;
    }
  }

  console.log(`[Eventbrite Sync] Done: ${liveSessions.length} sessions, ${newProfiles} new profiles, ${newEntries} new entries, ${newRecords} new records, ${updatedRecords} updated records, ${duplicateWarnings} duplicate warnings`);
  return { sessionsProcessed: liveSessions.length, newProfiles, newEntries, newRecords, updatedRecords, duplicateWarnings };
}

router.post('/eventbrite/event-and-attendee-update', async (req: Request, res: Response) => {
  if (syncInProgress) {
    console.warn('[Eventbrite Sync] Rejected concurrent request — sync already in progress');
    res.status(409).json({ success: false, error: 'Sync already in progress' });
    return;
  }
  syncInProgress = true;
  try {
    const sessionResult = await runSyncSessions();
    const attendeeResult = await runSyncAttendees();

    const parts = [
      `${sessionResult.totalEvents} events, ${sessionResult.matchedEvents} matched, ${sessionResult.newSessions} new sessions`,
      `${attendeeResult.sessionsProcessed} sessions, ${attendeeResult.newProfiles} new profiles, ${attendeeResult.newEntries} new entries, ${attendeeResult.newRecords} new consent records, ${attendeeResult.updatedRecords} updated consent records${attendeeResult.duplicateWarnings ? `, ${attendeeResult.duplicateWarnings} duplicate warning(s) — check session entries` : ''}`
    ];
    const summary = parts.join(' / ');

    console.log(`[Eventbrite Sync] ${summary}`);
    res.json({ success: true, data: { summary, sessions: sessionResult, attendees: attendeeResult } });
  } catch (error: any) {
    console.error('Error running event and attendee update:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run event and attendee update'
    });
  } finally {
    syncInProgress = false;
  }
});

router.post('/eventbrite/sync-attendees', async (req: Request, res: Response) => {
  if (syncInProgress) {
    console.warn('[Eventbrite Sync] Rejected concurrent request — sync already in progress');
    res.status(409).json({ success: false, error: 'Sync already in progress' });
    return;
  }
  syncInProgress = true;
  try {
    const data = await runSyncAttendees();
    res.json({ success: true, data });
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

    const [rawSessions, rawProfiles, regularsRaw] = await Promise.all([
      sessionsRepository.getAll(),
      profilesRepository.getAll(),
      regularsRepository.getAll()
    ]);

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');

    const regularSet = new Set<string>();
    for (const r of regularsRaw) {
      const gId = safeParseLookupId(r[GROUP_LOOKUP]);
      const pId = safeParseLookupId(r[PROFILE_LOOKUP]);
      if (gId !== undefined && pId !== undefined) regularSet.add(`${gId}-${pId}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const liveSessions = sessions.filter(s => {
      if (!s.EventbriteEventID || !s.Date) return false;
      const d = new Date(s.Date);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    });

    const allRecords = recordsRepository.available ? await recordsRepository.getAll() : [];
    let added = 0;

    for (const session of liveSessions) {
      const attendees = await getAttendees(session.EventbriteEventID!, changedSince);
      if (!attendees.length) continue;

      console.log(`[QuickSync] Session ${session.ID} (${session.EventbriteEventID}): ${attendees.length} new/changed attendees`);

      // Load cached entries and filter to this session only
      const allEntriesRaw = await entriesRepository.getAll();
      const sessionEntries = validateArray(allEntriesRaw, validateEntry, 'Entry')
        .filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === session.ID);
      const existingProfileIds = new Set(
        sessionEntries.map(e => safeParseLookupId(e[PROFILE_LOOKUP])).filter((id): id is number => id !== undefined)
      );

      const sessionGroupId = safeParseLookupId(session[GROUP_LOOKUP]);

      for (const attendee of attendees) {
        const attendeeName = attendee.profile?.name;
        const attendeeEmail = attendee.profile?.email;
        if (!attendeeName) continue;

        const { profile, clash } = await findOrCreateProfile(attendeeName, attendeeEmail, profiles, 'QuickSync');

        if (!existingProfileIds.has(profile.ID)) {
          const noteTags: string[] = [];
          if (attendee.ticket_class_name?.toLowerCase().includes('child')) noteTags.push('#Child');
          noteTags.push('#Eventbrite');
          if (clash) noteTags.push('#Duplicate');
          if (sessionGroupId !== undefined && regularSet.has(`${sessionGroupId}-${profile.ID}`)) noteTags.push('#Regular');
          await entriesRepository.create({
            [SESSION_LOOKUP]: String(session.ID),
            [PROFILE_LOOKUP]: String(profile.ID),
            Notes: noteTags.join(' ')
          });
          existingProfileIds.add(profile.ID);
          added++;
        }

        await upsertConsentRecords(profile.ID, attendee, allRecords);
      }
    }

    console.log(`[QuickSync] ${liveSessions.length} sessions checked, ${added} entries added`);
    res.json({ success: true, data: { added, sessionsChecked: liveSessions.length } });
  } catch (error: any) {
    console.error('Error in quick sync:', error);
    res.status(500).json({ success: false, error: error.message || 'Quick sync failed' });
  } finally {
    syncInProgress = false;
  }
});

export = router;
