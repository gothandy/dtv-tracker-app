import express, { Request, Response, Router } from 'express';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { recordsRepository } from '../services/repositories/records-repository';
import {
  validateArray,
  validateSession,
  validateEntry,
  validateProfile,
  safeParseLookupId
} from '../services/data-layer';
import { SESSION_LOOKUP, PROFILE_LOOKUP } from '../services/field-names';
import { getAttendees } from '../services/eventbrite-client';

const router: Router = express.Router();

function isNewVolunteer(allEntries: any[], profileId: number, currentSessionId: number): boolean {
  return !allEntries.some(e => {
    const vid = safeParseLookupId(e[PROFILE_LOOKUP]);
    const sid = safeParseLookupId(e[SESSION_LOOKUP]);
    return vid === profileId && sid !== currentSessionId;
  });
}

router.post('/eventbrite/sync-attendees', async (req: Request, res: Response) => {
  try {
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
          if (isNewVolunteer(entries, profileId, session.ID)) {
            entryFields.Notes = '#New';
          }
          await entriesRepository.create(entryFields);
          existingProfileIds.add(profileId);
          newEntries++;
        }

        // Upsert consent records from Eventbrite answers (one per profile+type)
        if (recordsRepository.available && attendee.answers) {
          const consentMap: Record<string, string> = {
            '315115173': 'Privacy Consent',
            '315115803': 'Photo Consent'
          };
          for (const ans of attendee.answers) {
            const type = consentMap[ans.question_id];
            if (!type) continue;
            const status = ans.answer === 'accepted' ? 'Accepted' : 'Declined';
            const date = attendee.created || new Date().toISOString();
            const existing = allRecords.find(r => safeParseLookupId(r.ProfileLookupId as unknown as string) === profileId && r.Type === type);
            if (existing) {
              await recordsRepository.update(existing.ID, { Status: status, Date: date });
            } else {
              const newId = await recordsRepository.create({ ProfileLookupId: profileId, Type: type, Status: status, Date: date });
              allRecords.push({ ID: newId, ProfileLookupId: profileId, Type: type, Status: status, Date: date } as any);
            }
            newRecords++;
          }
        }
      }
    }

    console.log(`[Eventbrite Sync] Done: ${liveSessions.length} sessions, ${newProfiles} new profiles, ${newEntries} new entries, ${newRecords} new records`);
    res.json({
      success: true,
      data: { sessionsProcessed: liveSessions.length, newProfiles, newEntries, newRecords }
    });
  } catch (error: any) {
    console.error('Error syncing Eventbrite attendees:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync attendees'
    });
  }
});

export = router;
