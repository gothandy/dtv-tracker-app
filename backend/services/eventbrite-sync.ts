/**
 * Shared Eventbrite sync helpers used by both the global sync
 * (routes/eventbrite.ts) and the per-session refresh (routes/entries.ts).
 */

import { entriesRepository } from './repositories/entries-repository';
import { profilesRepository } from './repositories/profiles-repository';
import { recordsRepository } from './repositories/records-repository';
import { toMatchName, safeParseLookupId, parseEmails } from './data-layer';
import type { EventbriteAttendee } from './eventbrite-client';
import type { SharePointProfile, SharePointEntry } from '../../types/sharepoint';
import { SESSION_LOOKUP, PROFILE_LOOKUP, ENTRY_EVENTBRITE_ATTENDEE_ID } from './field-names';

/**
 * Returns the booking email for an attendee — the order contact email (whoever
 * clicked Buy), falling back to the attendee's own profile email if unavailable.
 */
export function bookingEmailFor(attendee: EventbriteAttendee): string | undefined {
  return attendee.order?.email || attendee.profile?.email || undefined;
}

/**
 * Given all attendees for a single event and a child attendee's order_id,
 * finds the SharePoint profile of the accompanying adult (the adult ticket
 * holder in the same order). Returns undefined if the adult cannot be matched.
 *
 * Used by ongoing sync.
 */
export function resolveAccompanyingAdult(
  attendees: EventbriteAttendee[],
  childOrderId: string,
  profiles: SharePointProfile[]
): SharePointProfile | undefined {
  const orderMates = attendees.filter(a => a.order_id === childOrderId);
  const adults = orderMates.filter(a => !a.ticket_class_name?.toLowerCase().includes('child'));
  if (!adults.length) return undefined;

  // Use the first adult in the order. If multiple adults exist (unlikely), first is fine.
  const adult = adults[0];
  const adultName = adult.profile?.name;
  const adultEmail = adult.profile?.email?.toLowerCase();
  if (!adultName) return undefined;

  const nameKey = toMatchName(adultName);

  // Name + email match first
  if (adultEmail) {
    const byNameAndEmail = profiles.find(p => {
      const nameMatches = (p.MatchName && toMatchName(p.MatchName) === nameKey) ||
                          (p.Title && toMatchName(p.Title) === nameKey);
      return nameMatches && parseEmails(p.Email).includes(adultEmail);
    });
    if (byNameAndEmail) return byNameAndEmail;
  }

  // Name-only — only when emails are compatible (absent on one/both sides)
  const byName = profiles.find(p =>
    (p.MatchName && toMatchName(p.MatchName) === nameKey) ||
    (p.Title && toMatchName(p.Title) === nameKey)
  );
  if (!byName) return undefined;

  const profileEmail = byName.Email?.toLowerCase();
  if (adultEmail && profileEmail && adultEmail !== profileEmail) return undefined;

  return byName;
}

/**
 * Returns true if currentSessionId is the first (oldest) session for this volunteer.
 * Reads sessionIds from profile Stats — stored oldest-first by profile-stats.ts.
 * Empty sessionIds (new profile, no stats yet) also returns true.
 */
export function isFirstSession(
  profile: SharePointProfile,
  currentSessionId: number
): boolean {
  try {
    const stats = JSON.parse(profile.Stats || '{}');
    const sessionIds: number[] = stats.sessionIds || [];
    return sessionIds.length === 0 || sessionIds[0] === currentSessionId;
  } catch {
    return true;
  }
}

/**
 * Adds sessionId to a profile's in-memory Stats.sessionIds (oldest-first).
 * Called after entry creation during a sync batch so subsequent sessions
 * in the same batch see the updated state when calling isFirstSession.
 */
export function addSessionToProfileStats(
  profile: SharePointProfile,
  sessionId: number,
  sessionDateMap: Map<number, string>
): void {
  try {
    const stats = JSON.parse(profile.Stats || '{}');
    const sessionIds: number[] = stats.sessionIds || [];
    if (!sessionIds.includes(sessionId)) {
      sessionIds.push(sessionId);
      sessionIds.sort((a, b) => (sessionDateMap.get(a) || '').localeCompare(sessionDateMap.get(b) || ''));
    }
    profile.Stats = JSON.stringify({ ...stats, sessionIds });
  } catch {
    profile.Stats = JSON.stringify({ sessionIds: [sessionId] });
  }
}

/**
 * Finds an existing profile by name match (normalised). If the name matches
 * but both sides have different emails, a new profile is created and
 * clash=true is returned so the caller can tag the entry with #Duplicate
 * for admin review. Email is never matched alone — name is always required.
 * Mutates `profiles` by pushing any newly-created profile so subsequent
 * lookups within the same batch stay consistent.
 */
/**
 * Find a profile matching an Eventbrite attendee by name + email — find-only, no create.
 * Uses the same matching priority as findOrCreateProfile (name+email first, name-only second).
 */
export function findProfileByAttendee(
  attendee: EventbriteAttendee,
  profiles: SharePointProfile[]
): SharePointProfile | undefined {
  const attendeeName = attendee.profile?.name;
  if (!attendeeName) return undefined;
  const nameKey = toMatchName(attendeeName);
  const email = bookingEmailFor(attendee)?.toLowerCase();

  if (email) {
    const byNameAndEmail = profiles.find(p => {
      const nameMatches = (p.MatchName && toMatchName(p.MatchName) === nameKey) ||
                          (p.Title && toMatchName(p.Title) === nameKey);
      return nameMatches && parseEmails(p.Email).some(e => e.toLowerCase() === email);
    });
    if (byNameAndEmail) return byNameAndEmail;
  }

  return profiles.find(p =>
    (p.MatchName && toMatchName(p.MatchName) === nameKey) ||
    (p.Title && toMatchName(p.Title) === nameKey)
  );
}

export async function findOrCreateProfile(
  attendeeName: string,
  attendeeEmail: string | undefined,
  profiles: SharePointProfile[],
  logPrefix: string
): Promise<{ profile: SharePointProfile; isNew: boolean; clash?: boolean }> {
  const normalizedEmail = attendeeEmail?.toLowerCase();
  const nameKey = toMatchName(attendeeName);

  // Step 1: Name + email match — highest confidence. Scans all profiles so that
  // a clash profile created in a prior sync run is found even when an older
  // same-name profile with a different email appears first in the list.
  if (normalizedEmail) {
    const byNameAndEmail = profiles.find(p => {
      const nameMatches = (p.MatchName && toMatchName(p.MatchName) === nameKey) ||
                          (p.Title && toMatchName(p.Title) === nameKey);
      return nameMatches && parseEmails(p.Email).includes(normalizedEmail);
    });
    if (byNameAndEmail) return { profile: byNameAndEmail, isNew: false };
  }

  // Step 2: Name-only match — use if emails are compatible, otherwise flag clash
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

  // Step 3: No name+email or name-only match — create new profile
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

export interface SyncAttendeesForSessionResult {
  newProfiles: number;
  newEntries: number;
  newRecords: number;
  updatedRecords: number;
}

/**
 * Syncs Eventbrite attendees for a single session. Used by both the nightly bulk
 * sync and the per-session refresh so the logic lives in one place.
 *
 * Matching priority for existing entries:
 *   1. EventbriteAttendeeID match (deterministic, post-backfill)
 *   2. Profile ID match (fallback for pre-backfill entries)
 *
 * No Notes tags are written — the presence of EventbriteAttendeeID is the source
 * of truth for the Eventbrite icon; child/new/etc. are handled by live fields and
 * entry-stats snapshot computation.
 */
export async function syncAttendeesForSession(
  sessionId: number,
  attendees: EventbriteAttendee[],
  sessionEntries: SharePointEntry[],
  profiles: SharePointProfile[],
  records: any[],
  sessionDateMap: Map<number, string>
): Promise<SyncAttendeesForSessionResult> {
  let newProfiles = 0;
  let newEntries = 0;
  let newRecords = 0;
  let updatedRecords = 0;

  // Index existing entries by EventbriteAttendeeID and by profile ID for fast lookup
  const entryByAttendeeId = new Map<string, SharePointEntry>();
  const existingProfileIds = new Set<number>();
  for (const entry of sessionEntries) {
    if (entry.EventbriteAttendeeID) entryByAttendeeId.set(entry.EventbriteAttendeeID, entry);
    const pid = safeParseLookupId(entry[PROFILE_LOOKUP]);
    if (pid !== undefined) existingProfileIds.add(pid);
  }

  for (const attendee of attendees) {
    const attendeeName = attendee.profile?.name;
    const attendeeEmail = attendee.profile?.email;
    if (!attendeeName) continue;

    // If we already have an entry for this exact attendee ID, only update consent
    if (entryByAttendeeId.has(attendee.id)) {
      const profileId = safeParseLookupId(entryByAttendeeId.get(attendee.id)![PROFILE_LOOKUP]);
      if (profileId !== undefined) {
        const { created, updated } = await upsertConsentRecords(profileId, attendee, records);
        newRecords += created;
        updatedRecords += updated;
      }
      continue;
    }

    const { profile, isNew } = await findOrCreateProfile(attendeeName, attendeeEmail, profiles, `Sync:${sessionId}`);
    if (isNew) newProfiles++;

    if (!existingProfileIds.has(profile.ID)) {
      const isChild = !!attendee.ticket_class_name?.toLowerCase().includes('child');
      const entryFields: Record<string, any> = {
        [SESSION_LOOKUP]: String(sessionId),
        [PROFILE_LOOKUP]: String(profile.ID),
        [ENTRY_EVENTBRITE_ATTENDEE_ID]: attendee.id,
        BookedBy: bookingEmailFor(attendee)
      };
      if (isChild && attendee.order_id) {
        const adultProfile = resolveAccompanyingAdult(attendees, attendee.order_id, profiles);
        if (adultProfile) entryFields.AccompanyingAdultLookupId = String(adultProfile.ID);
      }
      await entriesRepository.create(entryFields);
      existingProfileIds.add(profile.ID);
      addSessionToProfileStats(profile, sessionId, sessionDateMap);
      newEntries++;
    }

    const { created, updated } = await upsertConsentRecords(profile.ID, attendee, records);
    newRecords += created;
    updatedRecords += updated;
  }

  return { newProfiles, newEntries, newRecords, updatedRecords };
}
