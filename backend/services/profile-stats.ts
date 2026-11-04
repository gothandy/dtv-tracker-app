/**
 * Profile stats refresh — shared logic used by the admin endpoint and the nightly sync.
 *
 * Stats JSON stored per profile:
 * { "hoursByFY": { "FY2025": 120.0, "FY2026": 45.5 },
 *   "sessionsByFY": { "FY2025": 28, "FY2026": 12 },
 *   "isMember": true, "cardStatus": "Accepted" }
 *
 * thisFY / lastFY are derived at request time from the dict using calculateCurrentFY(),
 * so stats never go stale across financial year boundaries.
 *
 * One function, buildProfileStats(), works out a Profile's Stats; the targeted update (after an
 * entry or record change) and the nightly refresh both call it, so they can't drift apart.
 */

import { profilesRepository } from './repositories/profiles-repository';
import { entriesRepository } from './repositories/entries-repository';
import { sessionsRepository } from './repositories/sessions-repository';
import { recordsRepository } from './repositories/records-repository';
import { regularsRepository } from './repositories/regulars-repository';
import { sharePointClient } from './sharepoint-client';
import { safeParseLookupId, calculateFinancialYear, toMatchName } from './data-layer';
import { PROFILE_LOOKUP, GROUP_LOOKUP, SESSION_LOOKUP, PROFILE_STATS, ENTRY_CANCELLED } from './field-names';
import { ukToday } from '../../types/uk-date';
import { isOfType, recordProfileId, statusOn } from './records';
import type { SharePointEntry, SharePointProfile, SharePointRecord, SharePointRegular } from '../../types/sharepoint';
import type { SharePointSession } from '../../types/session';

export interface ProfileStatsRefreshResult {
  total: number;
  updated: number;
  updatedIds: number[];
  errors: string[];
}

/** The Stats JSON stored on each Profile. Key order matters: the nightly refresh skips unchanged Stats by comparing JSON. */
export interface StoredProfileStats {
  hoursByFY: Record<string, number>;
  sessionsByFY: Record<string, number>;
  isMember: boolean;
  cardStatus: string | null;
  regularGroupIds: number[];
  repeatGroupIds: number[];
  sessionIds: number[];
  linkedProfileIds: number[];
  isFirstAider: boolean;
  noPhoto: boolean;
  warnings: Array<{ text: string; url?: string }>;
}

/** Per-session lookups the Stats need: FY key, date (YYYY-MM-DD) and group. */
export interface SessionLookups {
  fy: Map<number, string>;
  date: Map<number, string>;
  group: Map<number, number>;
}

export function buildSessionLookups(sessions: SharePointSession[]): SessionLookups {
  const lookups: SessionLookups = { fy: new Map(), date: new Map(), group: new Map() };
  for (const s of sessions) {
    if (!s.Date) continue;
    lookups.fy.set(s.ID, `FY${calculateFinancialYear(new Date(s.Date))}`);
    lookups.date.set(s.ID, s.Date.substring(0, 10));
    const groupId = safeParseLookupId(s[GROUP_LOOKUP] as unknown as string);
    if (groupId !== undefined) lookups.group.set(s.ID, groupId);
  }
  return lookups;
}

/** Profiles that share a name (Title) or Match Name with another Profile. */
export function findPossibleDuplicates(profiles: SharePointProfile[]): Set<number> {
  const byTitle = new Map<string, number[]>();
  const byMatchName = new Map<string, number[]>();
  for (const p of profiles) {
    const tk = toMatchName(p.Title);
    if (tk) byTitle.set(tk, [...(byTitle.get(tk) ?? []), p.ID]);
    const mk = toMatchName(p.MatchName);
    if (mk) byMatchName.set(mk, [...(byMatchName.get(mk) ?? []), p.ID]);
  }
  const ids = new Set<number>();
  for (const group of [...byTitle.values(), ...byMatchName.values()]) {
    if (group.length > 1) group.forEach(id => ids.add(id));
  }
  return ids;
}

function profileEmails(profile: SharePointProfile | undefined): string[] {
  return (profile?.Email || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
}

/** Other Profiles sharing any email with this one. */
export function findLinkedProfileIds(profileId: number, profile: SharePointProfile | undefined, profiles: SharePointProfile[]): number[] {
  const emails = new Set(profileEmails(profile));
  return profiles
    .filter(p => p.ID !== profileId && profileEmails(p).some(e => emails.has(e)))
    .map(p => p.ID);
}

/** Works out one Profile's Stats from its own entries, records and regulars. */
export function buildProfileStats(input: {
  profileId: number;
  profile: SharePointProfile | undefined;
  entries: SharePointEntry[];
  records: SharePointRecord[];
  regulars: SharePointRegular[];
  sessions: SessionLookups;
  linkedProfileIds: number[];
  isPossibleDuplicate: boolean;
  today: string;
}): StoredProfileStats {
  const { profileId, profile, sessions, today } = input;
  const activeEntries = input.entries.filter(e => !e[ENTRY_CANCELLED]); // cancelled bookings excluded from all stats

  const hoursByFY: Record<string, number> = {};
  const sessionsByFY: Record<string, number> = {};
  const sessionIds: number[] = [];
  const repeatGroupIds = new Set<number>();
  for (const e of activeEntries) {
    const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
    if (sessionId === undefined) continue;
    sessionIds.push(sessionId);
    const groupId = sessions.group.get(sessionId);
    if (groupId !== undefined) repeatGroupIds.add(groupId);
    const fyKey = sessions.fy.get(sessionId);
    if (!fyKey) continue;
    hoursByFY[fyKey] = (hoursByFY[fyKey] || 0) + (parseFloat(String(e.Hours)) || 0);
    sessionsByFY[fyKey] = (sessionsByFY[fyKey] || 0) + 1;
  }
  for (const k of Object.keys(hoursByFY)) hoursByFY[k] = Math.round(hoursByFY[k] * 10) / 10;
  sessionIds.sort((a, b) => (sessions.date.get(a) || '').localeCompare(sessions.date.get(b) || ''));

  const regularGroupIds = input.regulars
    .map(r => safeParseLookupId(r[GROUP_LOOKUP] as unknown as string))
    .filter((id): id is number => id !== undefined);

  let isMember = false;
  let cardStatus: string | null = null;
  let isFirstAider = false;
  let noPhoto = true;
  let hasPrivacyConsent = false;
  for (const r of input.records) {
    const status = statusOn(r, today);
    if (isOfType(r, 'Charity Membership') && status === 'Accepted') isMember = true;
    if (isOfType(r, 'Discount Card') && status) cardStatus = status;
    if (isOfType(r, 'First Aid Certificate') && status === 'Expires' && r.Date && r.Date.substring(0, 10) > today) isFirstAider = true;
    if (isOfType(r, 'Photo Consent') && status === 'Accepted') noPhoto = false;
    if (isOfType(r, 'Privacy Consent') && status === 'Accepted') hasPrivacyConsent = true;
  }

  const name = profile?.Title || '';
  const hasChildNoAdult = activeEntries.some(e => e.Notes?.toLowerCase().includes('#child') && !e.AccompanyingAdultLookupId);
  const hasFutureBooking = activeEntries.some(e => {
    const sid = safeParseLookupId(e[SESSION_LOOKUP]);
    return sid !== undefined && (sessions.date.get(sid) ?? '') > today;
  });
  const warnings: Array<{ text: string; url?: string }> = [];
  if (input.isPossibleDuplicate) warnings.push({ text: 'Possible Duplicate', url: `/profiles?fy=all&search=${encodeURIComponent(name)}` });
  if (profile?.Title && profile.MatchName && toMatchName(profile.Title) !== profile.MatchName) warnings.push({ text: 'Match Name Error' });
  if (hasChildNoAdult) warnings.push({ text: 'Child No Adult', url: `/entries?q=%23child&fy=all&accompanyingAdult=empty&profileId=${profileId}&profileName=${encodeURIComponent(name)}` });
  if (!profile?.IsGroup && hasFutureBooking && !hasPrivacyConsent) warnings.push({ text: 'No Consent' });
  if (profile?.IsGroup && isMember) warnings.push({ text: 'Group + Member' });

  return {
    hoursByFY,
    sessionsByFY,
    isMember,
    cardStatus,
    regularGroupIds,
    repeatGroupIds: Array.from(repeatGroupIds),
    sessionIds,
    linkedProfileIds: input.linkedProfileIds,
    isFirstAider,
    noPhoto,
    warnings,
  };
}

/**
 * Recomputes and saves Stats for a single profile after an entry or record change.
 * Called as fire-and-forget so the response isn't delayed.
 * Sessions and profiles come from cache; entries and records are targeted Graph calls.
 */
export async function computeAndSaveProfileStats(profileId: number): Promise<void> {
  const start = Date.now();

  const [sessionsRaw, profilesRaw, entries, records, regularsRaw] = await Promise.all([
    sessionsRepository.getAll(),
    profilesRepository.getAll(),
    entriesRepository.getByProfileId(profileId),
    recordsRepository.getByProfile(profileId),
    regularsRepository.getAll()
  ]);
  const profile = profilesRaw.find(p => p.ID === profileId);

  const stats = buildProfileStats({
    profileId,
    profile,
    entries,
    records,
    regulars: regularsRaw.filter(r => safeParseLookupId(r[PROFILE_LOOKUP] as unknown as string) === profileId),
    sessions: buildSessionLookups(sessionsRaw),
    linkedProfileIds: findLinkedProfileIds(profileId, profile, profilesRaw),
    isPossibleDuplicate: findPossibleDuplicates(profilesRaw).has(profileId),
    today: ukToday(),
  });

  await profilesRepository.updateStats(profileId, stats);
  sharePointClient.clearCacheKey('profiles');

  console.log(`[Stats] Profile ${profileId} targeted stats update in ${Date.now() - start}ms`);
}

function groupByProfile<T>(items: T[], profileIdOf: (item: T) => number | undefined): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const pid = profileIdOf(item);
    if (pid === undefined) continue;
    const list = map.get(pid);
    if (list) list.push(item); else map.set(pid, [item]);
  }
  return map;
}

export async function runProfileStatsRefresh(): Promise<ProfileStatsRefreshResult> {
  const start = Date.now();
  console.log('[Stats] Starting profile stats refresh');

  const [profilesRaw, entriesRaw, sessionsRaw, recordsRaw, regularsRaw] = await Promise.all([
    profilesRepository.getAll(),
    entriesRepository.getAll(),
    sessionsRepository.getAll(),
    recordsRepository.getAll(),
    regularsRepository.getAll()
  ]);

  console.log(`[Stats] Fetched ${profilesRaw.length} profiles, ${entriesRaw.length} entries, ${recordsRaw.length} records in ${Date.now() - start}ms`);

  const sessions = buildSessionLookups(sessionsRaw);
  const entriesByProfile = groupByProfile(entriesRaw, e => safeParseLookupId(e[PROFILE_LOOKUP]));
  const recordsByProfile = groupByProfile(recordsRaw, recordProfileId);
  const regularsByProfile = groupByProfile(regularsRaw, r => safeParseLookupId(r[PROFILE_LOOKUP] as unknown as string));
  const possibleDuplicates = findPossibleDuplicates(profilesRaw);
  const today = ukToday();

  const total = profilesRaw.length;
  let updated = 0;
  const updatedIds: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < profilesRaw.length; i += 10) {
    const batch = profilesRaw.slice(i, i + 10);
    await Promise.all(batch.map(async (spProfile) => {
      try {
        const newStats = buildProfileStats({
          profileId: spProfile.ID,
          profile: spProfile,
          entries: entriesByProfile.get(spProfile.ID) ?? [],
          records: recordsByProfile.get(spProfile.ID) ?? [],
          regulars: regularsByProfile.get(spProfile.ID) ?? [],
          sessions,
          linkedProfileIds: findLinkedProfileIds(spProfile.ID, spProfile, profilesRaw),
          isPossibleDuplicate: possibleDuplicates.has(spProfile.ID),
          today,
        });

        // Skip if stored stats already match
        const stored = spProfile[PROFILE_STATS];
        if (stored) {
          try {
            const existing = JSON.parse(stored);
            if (JSON.stringify(existing) === JSON.stringify(newStats)) return;
          } catch { /* malformed JSON — fall through to write */ }
        }

        await profilesRepository.updateStats(spProfile.ID, newStats);
        updated++;
        updatedIds.push(spProfile.ID);
      } catch (err: any) {
        const msg = `Profile ${spProfile.ID}: ${err.message}`;
        console.error(`[Stats] Error: ${msg}`);
        errors.push(msg);
      }
    }));
  }

  sharePointClient.clearCacheKey('profiles');

  const elapsed = Date.now() - start;
  console.log(`[Stats] Profile refresh complete: ${updated}/${total} updated, ${errors.length} errors, ${elapsed}ms`);

  return { total, updated, updatedIds, errors };
}
