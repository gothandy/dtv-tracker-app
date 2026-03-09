/**
 * Shared Eventbrite sync helpers used by both the global sync
 * (routes/eventbrite.ts) and the per-session refresh (routes/entries.ts).
 */

import { profilesRepository } from './repositories/profiles-repository';
import { recordsRepository } from './repositories/records-repository';
import { toMatchName, safeParseLookupId } from './data-layer';
import type { EventbriteAttendee } from './eventbrite-client';
import type { SharePointProfile, SharePointEntry } from '../types/sharepoint';
import { SESSION_LOOKUP, PROFILE_LOOKUP } from './field-names';

/**
 * Returns true if this is the volunteer's first-ever session (no entries
 * outside the current session exist in the provided entries snapshot).
 */
export function isNewVolunteer(
  allEntries: SharePointEntry[],
  profileId: number,
  currentSessionId: number
): boolean {
  return !allEntries.some(e => {
    const vid = safeParseLookupId(e[PROFILE_LOOKUP]);
    const sid = safeParseLookupId(e[SESSION_LOOKUP]);
    return vid === profileId && sid !== currentSessionId;
  });
}

/**
 * Finds an existing profile by name match (normalised). If the name matches
 * but both sides have different emails, a new profile is created and
 * clash=true is returned so the caller can tag the entry with #Duplicate
 * for admin review. Email is never matched alone — name is always required.
 * Mutates `profiles` by pushing any newly-created profile so subsequent
 * lookups within the same batch stay consistent.
 */
export async function findOrCreateProfile(
  attendeeName: string,
  attendeeEmail: string | undefined,
  profiles: SharePointProfile[],
  logPrefix: string
): Promise<{ profile: SharePointProfile; isNew: boolean; clash?: boolean }> {
  const normalizedEmail = attendeeEmail?.toLowerCase();

  // Step 1: Name + email match — high confidence
  const nameKey = toMatchName(attendeeName);
  const byName = profiles.find(p =>
    p.MatchName && toMatchName(p.MatchName) === nameKey
  ) || profiles.find(p =>
    p.Title && toMatchName(p.Title) === nameKey
  );

  if (byName) {
    const profileEmail = byName.Email?.toLowerCase();
    if (normalizedEmail && profileEmail && normalizedEmail !== profileEmail) {
      // Same name, different emails — likely a different person; create new profile and flag
      console.warn(`[${logPrefix}] Name clash: "${attendeeName}" matches profile ID ${byName.ID} but emails differ. Creating new profile.`);
    } else {
      // Same name, emails match or one/both are absent — treat as the same person
      if (normalizedEmail && !profileEmail) {
        // Backfill email on the existing profile
        await profilesRepository.updateFields(byName.ID, { Email: attendeeEmail });
        byName.Email = attendeeEmail;
      }
      return { profile: byName, isNew: false };
    }
  }

  // Step 3: No confident match — create new profile
  const matchName = toMatchName(attendeeName);
  const newId = await profilesRepository.create({
    Title: attendeeName,
    Email: attendeeEmail || undefined,
    MatchName: matchName
  });
  const clash = !!byName; // true if we found a name match but emails differed
  console.log(`[${logPrefix}] Created profile: ${attendeeName} (ID: ${newId})${clash ? ' [duplicate warning]' : ''}`);
  const newProfile = {
    ID: newId, Title: attendeeName, Email: attendeeEmail,
    MatchName: matchName, IsGroup: false
  } as SharePointProfile;
  profiles.push(newProfile);
  return { profile: newProfile, isNew: true, clash };
}

const CONSENT_MAP: Record<string, string> = {
  'Personal Data Consent': 'Privacy Consent',
  'Photo and Video Consent': 'Photo Consent'
};

/**
 * Upserts consent records for a profile from Eventbrite attendee answers.
 * Only writes to SharePoint if the status or date has changed.
 * Mutates `records` by pushing any newly-created record so subsequent
 * lookups within the same batch stay consistent.
 */
export async function upsertConsentRecords(
  profileId: number,
  attendee: EventbriteAttendee,
  records: any[]
): Promise<{ created: number; updated: number }> {
  if (!recordsRepository.available || !attendee.answers) return { created: 0, updated: 0 };

  let created = 0;
  let updated = 0;

  for (const ans of attendee.answers) {
    if (!ans.answer) continue; // skip attendees who registered before the form was added
    const type = CONSENT_MAP[ans.question] ?? null;
    if (!type) continue;
    const status = ans.answer === 'accepted' ? 'Accepted' : 'Declined';
    const date = attendee.created || new Date().toISOString();
    const existing = records.find(r =>
      safeParseLookupId(r.ProfileLookupId as unknown as string) === profileId && r.Type === type
    );
    if (existing) {
      // Only update if status changed — date comparison is unreliable because
      // SharePoint's date-only field strips the time component from attendee.created.
      if (existing.Status !== status) {
        await recordsRepository.update(existing.ID, { Status: status });
        updated++;
      }
    } else {
      const newId = await recordsRepository.create({ ProfileLookupId: profileId, Type: type, Status: status, Date: date });
      records.push({ ID: newId, ProfileLookupId: profileId, Type: type, Status: status, Date: date });
      created++;
    }
  }

  return { created, updated };
}
