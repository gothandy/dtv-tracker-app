import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { recordsRepository } from '../services/repositories/records-repository';
import {
  validateArray,
  validateSession,
  validateEntry,
  validateProfile,
  validateGroup,
  safeParseLookupId
} from '../services/data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP, PROFILE_LOOKUP } from '../services/field-names';
import { getAttendees, getOrgEvents, getEventConfigCheck, EventbriteConfigCheck } from '../services/eventbrite-client';

const router: Router = express.Router();

function isNewVolunteer(allEntries: any[], profileId: number, currentSessionId: number): boolean {
  return !allEntries.some(e => {
    const vid = safeParseLookupId(e[PROFILE_LOOKUP]);
    const sid = safeParseLookupId(e[SESSION_LOOKUP]);
    return vid === profileId && sid !== currentSessionId;
  });
}

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
    const fields: { Title: string; Date: string; [key: string]: any } = {
      Title: title,
      Date: dateStr,
      [GROUP_LOOKUP]: String(group.ID),
      EventbriteEventID: event.id
    };
    if (event.name) fields.Name = event.name;

    await sessionsRepository.create(fields);
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
    profilesRepository.getAll()
  ]);

  const sessions = validateArray(sessionsRaw, validateSession, 'Session');
  const entries = validateArray(entriesRaw, validateEntry, 'Entry');
  const profiles = validateArray(profilesRaw, validateProfile, 'Profile');

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

      // Match to existing profile: MatchName first, then Title
      const nameLower = attendeeName.toLowerCase();
      let profile = profiles.find(p =>
        p.MatchName && p.MatchName.toLowerCase() === nameLower
      ) || profiles.find(p =>
        p.Title && p.Title.toLowerCase() === nameLower
      );

      if (!profile) {
        const newId = await profilesRepository.create({
          Title: attendeeName,
          Email: attendeeEmail || undefined
        });
        console.log(`[Eventbrite Sync] Created profile: ${attendeeName} (ID: ${newId})`);
        profile = { ID: newId, Title: attendeeName, Email: attendeeEmail, MatchName: undefined, IsGroup: false } as any;
        profiles.push(profile!);
        newProfiles++;
      }

      // Create entry if not already registered
      const profileId = profile!.ID;
      if (!existingProfileIds.has(profileId)) {
        const entryFields: Record<string, any> = {
          [SESSION_LOOKUP]: String(session.ID),
          [PROFILE_LOOKUP]: String(profileId)
        };
        const noteTags: string[] = [];
        if (isNewVolunteer(entries, profileId, session.ID)) noteTags.push('#New');
        if (attendee.ticket_class_name?.toLowerCase().includes('child')) noteTags.push('#Child');
        if (noteTags.length > 0) entryFields.Notes = noteTags.join(' ');
        await entriesRepository.create(entryFields);
        existingProfileIds.add(profileId);
        newEntries++;
      }

      // Upsert consent records from Eventbrite answers (one per profile+type)
      if (recordsRepository.available && attendee.answers) {
        for (const ans of attendee.answers) {
          if (!ans.answer) continue; // skip attendees who registered before the form was added
          const consentMap: Record<string, string> = {
            'Personal Data Consent': 'Privacy Consent',
            'Photo and Video Consent': 'Photo Consent'
          };
          const type = consentMap[ans.question] ?? null;
          if (!type) continue;
          const status = ans.answer === 'accepted' ? 'Accepted' : 'Declined';
          const date = attendee.created || new Date().toISOString();
          const existing = allRecords.find(r => safeParseLookupId(r.ProfileLookupId as unknown as string) === profileId && r.Type === type);
          if (existing) {
            if (existing.Status !== status || existing.Date !== date) {
              await recordsRepository.update(existing.ID, { Status: status, Date: date });
              updatedRecords++;
            }
          } else {
            const newId = await recordsRepository.create({ ProfileLookupId: profileId, Type: type, Status: status, Date: date });
            allRecords.push({ ID: newId, ProfileLookupId: profileId, Type: type, Status: status, Date: date } as any);
            newRecords++;
          }
        }
      }
    }
  }

  console.log(`[Eventbrite Sync] Done: ${liveSessions.length} sessions, ${newProfiles} new profiles, ${newEntries} new entries, ${newRecords} new records, ${updatedRecords} updated records`);
  return { sessionsProcessed: liveSessions.length, newProfiles, newEntries, newRecords, updatedRecords };
}

router.post('/eventbrite/event-and-attendee-update', async (req: Request, res: Response) => {
  try {
    const sessionResult = await runSyncSessions();
    const attendeeResult = await runSyncAttendees();

    const parts = [
      `${sessionResult.totalEvents} events, ${sessionResult.matchedEvents} matched, ${sessionResult.newSessions} new sessions`,
      `${attendeeResult.sessionsProcessed} sessions, ${attendeeResult.newProfiles} new profiles, ${attendeeResult.newEntries} new entries, ${attendeeResult.newRecords} new consent records, ${attendeeResult.updatedRecords} updated consent records`
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
  }
});

router.post('/eventbrite/sync-attendees', async (req: Request, res: Response) => {
  try {
    const data = await runSyncAttendees();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error syncing Eventbrite attendees:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync attendees'
    });
  }
});

router.post('/eventbrite/sync-sessions', async (req: Request, res: Response) => {
  try {
    const data = await runSyncSessions();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error syncing Eventbrite sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync sessions'
    });
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
