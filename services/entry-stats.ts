/**
 * Entry stats computation — snapshot of volunteer state at session time.
 *
 * Stats are frozen once session.Date < today (and entry already has Stats).
 * The targeted path fires after individual entry/profile/record writes.
 * The bulk path runs nightly between profile and session stats refreshes.
 */

import { entriesRepository } from './repositories/entries-repository';
import { profilesRepository } from './repositories/profiles-repository';
import { sessionsRepository } from './repositories/sessions-repository';
import { recordsRepository } from './repositories/records-repository';
import { regularsRepository } from './repositories/regulars-repository';
import { safeParseLookupId, parseEntryStatsField } from './data-layer';
import { SESSION_LOOKUP, PROFILE_LOOKUP, GROUP_LOOKUP, ACCOMPANYING_ADULT_LOOKUP, ENTRY_STATS, PROFILE_STATS } from './field-names';
import type { SharePointEntry } from '../types/sharepoint';
import type { SharePointProfile } from '../types/sharepoint';
import type { SharePointRecord } from '../types/sharepoint';
import type { EntryStats, EntryStatsSnapshot, EntryStatsManual } from '../types/entry-stats';

export interface EntryStatsRefreshResult {
  total: number;      // eligible (non-frozen) entries processed
  updated: number;
  updatedIds: number[];
  frozen: number;     // skipped — past session + already has stats
  errors: string[];
}

function todayDate(): string {
  return new Date().toISOString().substring(0, 10);
}

/**
 * Compact serialisation — JSON.stringify omits undefined values naturally,
 * so only set fields when truthy. Omit empty snapshot/manual objects entirely.
 */
export function serializeEntryStats(stats: EntryStats): string {
  const out: Partial<EntryStats> = {};
  if (stats.snapshot && Object.keys(stats.snapshot).length > 0) out.snapshot = stats.snapshot;
  if (stats.manual && Object.keys(stats.manual).length > 0) out.manual = stats.manual;
  return JSON.stringify(out);
}

/**
 * Pure function — derives EntryStats from live data.
 * snapshot: computed from profile/records data.
 * manual: preserved from existingManual — never recomputed from Notes.
 */
export function computeEntryStatsForEntry(
  entry: SharePointEntry,
  profile: SharePointProfile | undefined,
  profileStatsJson: string | undefined,
  records: SharePointRecord[],
  sessionGroupId: number | undefined,
  regularGroupIds: number[],
  sessionDate?: string,
  existingManual?: EntryStatsManual
): EntryStats {
  let profileStats: any = {};
  try { profileStats = JSON.parse(profileStatsJson || '{}'); } catch { /* malformed */ }

  // Use session date for certificate expiry checks — this is a snapshot of state at session time.
  // Falls back to today only if sessionDate is unavailable.
  const certReferenceDate = sessionDate ?? todayDate();
  const sessionId = safeParseLookupId(entry[SESSION_LOOKUP]);

  // --- snapshot ---

  // booking — 'Repeat' is the default (omitted)
  let booking: 'New' | 'Regular' | undefined;
  if (sessionGroupId !== undefined && regularGroupIds.includes(sessionGroupId)) {
    booking = 'Regular';
  } else if (profileStats.sessionIds && Array.isArray(profileStats.sessionIds) && profileStats.sessionIds[0] === sessionId) {
    booking = 'New';
  }

  let isMember = false;
  let hasDiscountCard = false;
  let noPhoto = true;
  let noConsent = true;
  let isFirstAider = false;
  let isDigLead = false; // TODO #184: set from Dig Lead Certificate record once that record type exists in SharePoint

  for (const r of records) {
    if (r.Type === 'Charity Membership' && r.Status === 'Accepted') isMember = true;
    if (r.Type === 'Discount Card' && (r.Status === 'Accepted' || r.Status === 'Invited')) hasDiscountCard = true;
    if (r.Type === 'Photo Consent' && r.Status === 'Accepted') noPhoto = false;
    if (r.Type === 'Privacy Consent' && r.Status === 'Accepted') noConsent = false;
    if (r.Type === 'First Aid Certificate' && r.Status === 'Expires' && r.Date && r.Date.substring(0, 10) > certReferenceDate) isFirstAider = true;
  }

  const isChild = !!entry[ACCOMPANYING_ADULT_LOOKUP];

  const snapshot: EntryStatsSnapshot = {};
  if (booking)                      snapshot.booking        = booking;
  if (profile?.IsGroup === true)    snapshot.isGroup        = true;
  if (isChild)                      snapshot.isChild        = true;
  if (isMember)                     snapshot.isMember       = true;
  if (hasDiscountCard)              snapshot.hasDiscountCard = true;
  if (noPhoto)                      snapshot.noPhoto        = true;
  if (noConsent)                    snapshot.noConsent      = true;
  if (isDigLead)                    snapshot.isDigLead      = true;
  if (isFirstAider)                 snapshot.isFirstAider   = true;

  const manual = existingManual && Object.keys(existingManual).length > 0 ? existingManual : undefined;

  return {
    snapshot: Object.keys(snapshot).length > 0 ? snapshot : undefined,
    manual,
  };
}

/**
 * Targeted stats update for a single entry — called fire-and-forget after entry writes.
 * Skips frozen entries (session already passed and Stats already set).
 */
export async function computeAndSaveEntryStats(entryId: number): Promise<void> {
  const entry = await entriesRepository.getById(entryId);
  if (!entry) return;

  const sessionId = safeParseLookupId(entry[SESSION_LOOKUP]);
  if (sessionId === undefined) return;

  const session = await sessionsRepository.getById(sessionId);
  if (!session) return;

  const sessionDate = session.Date?.substring(0, 10);

  // Frozen: session is past and entry already has Stats
  if (sessionDate && sessionDate < todayDate() && entry[ENTRY_STATS]) return;

  const profileId = safeParseLookupId(entry[PROFILE_LOOKUP]);
  const [profile, regularsRaw, records] = await Promise.all([
    profileId !== undefined ? profilesRepository.getById(profileId) : Promise.resolve(null),
    regularsRepository.getAll(),
    profileId !== undefined && recordsRepository.available ? recordsRepository.getByProfile(profileId) : Promise.resolve([]),
  ]);

  const sessionGroupId = safeParseLookupId(session[GROUP_LOOKUP] as unknown as string);
  const regularGroupIds = regularsRaw
    .filter(r => safeParseLookupId(r[PROFILE_LOOKUP] as unknown as string) === profileId)
    .map(r => safeParseLookupId(r[GROUP_LOOKUP] as unknown as string))
    .filter((id): id is number => id !== undefined);

  const existing = entry[ENTRY_STATS];
  const existingManual = existing ? parseEntryStatsField(existing)?.manual : undefined;

  const newStats = computeEntryStatsForEntry(
    entry,
    profile ?? undefined,
    profile?.[PROFILE_STATS],
    records,
    sessionGroupId,
    regularGroupIds,
    sessionDate,
    existingManual
  );

  // Skip write if unchanged
  if (existing) {
    try {
      if (JSON.stringify(JSON.parse(existing)) === JSON.stringify(newStats)) return;
    } catch { /* malformed — fall through to write */ }
  }

  await entriesRepository.updateStats(entryId, newStats);
}

/**
 * Bulk refresh — processes all entries that are not frozen.
 * Run nightly between runProfileStatsRefresh() and runSessionStatsRefresh().
 */
export async function runEntryStatsRefresh(): Promise<EntryStatsRefreshResult> {
  const start = Date.now();
  console.log('[Stats] Starting entry stats refresh');

  const [entriesRaw, profilesRaw, sessionsRaw, recordsRaw, regularsRaw] = await Promise.all([
    entriesRepository.getAll(),
    profilesRepository.getAll(),
    sessionsRepository.getAll(),
    recordsRepository.available ? recordsRepository.getAll() : Promise.resolve([]),
    regularsRepository.getAll(),
  ]);

  console.log(`[Stats] Fetched ${entriesRaw.length} entries, ${profilesRaw.length} profiles in ${Date.now() - start}ms`);

  const today = todayDate();

  const profileMap = new Map(profilesRaw.map(p => [p.ID, p]));
  const sessionMap = new Map(sessionsRaw.map(s => [s.ID, s]));

  // records per profile
  const recordsByProfile = new Map<number, SharePointRecord[]>();
  for (const r of recordsRaw) {
    const pid = safeParseLookupId(r.ProfileLookupId as unknown as string);
    if (pid === undefined) continue;
    if (!recordsByProfile.has(pid)) recordsByProfile.set(pid, []);
    recordsByProfile.get(pid)!.push(r);
  }

  // regular group IDs per profile
  const regularGroupsByProfile = new Map<number, number[]>();
  for (const r of regularsRaw) {
    const pid = safeParseLookupId(r[PROFILE_LOOKUP] as unknown as string);
    const gid = safeParseLookupId(r[GROUP_LOOKUP] as unknown as string);
    if (pid === undefined || gid === undefined) continue;
    if (!regularGroupsByProfile.has(pid)) regularGroupsByProfile.set(pid, []);
    regularGroupsByProfile.get(pid)!.push(gid);
  }

  // group ID per session
  const sessionGroupMap = new Map<number, number>();
  for (const s of sessionsRaw) {
    const gid = safeParseLookupId(s[GROUP_LOOKUP] as unknown as string);
    if (gid !== undefined) sessionGroupMap.set(s.ID, gid);
  }

  let total = 0;
  let updated = 0;
  const updatedIds: number[] = [];
  let frozen = 0;
  const errors: string[] = [];

  for (let i = 0; i < entriesRaw.length; i += 10) {
    const batch = entriesRaw.slice(i, i + 10);
    await Promise.all(batch.map(async (entry) => {
      try {
        const sessionId = safeParseLookupId(entry[SESSION_LOOKUP]);
        if (sessionId === undefined) { frozen++; return; }

        const session = sessionMap.get(sessionId);
        const sessionDate = session?.Date?.substring(0, 10);

        // Frozen: session is past and entry already has Stats
        if (sessionDate && sessionDate < today && entry[ENTRY_STATS]) { frozen++; return; }

        total++;

        const profileId = safeParseLookupId(entry[PROFILE_LOOKUP]);
        const profile = profileId !== undefined ? profileMap.get(profileId) : undefined;
        const records = (profileId !== undefined ? recordsByProfile.get(profileId) : undefined) ?? [];
        const regularGroupIds = (profileId !== undefined ? regularGroupsByProfile.get(profileId) : undefined) ?? [];
        const sessionGroupId = sessionId !== undefined ? sessionGroupMap.get(sessionId) : undefined;

        const existing = entry[ENTRY_STATS];
        const existingManual = existing ? parseEntryStatsField(existing)?.manual : undefined;

        const newStats = computeEntryStatsForEntry(
          entry,
          profile,
          profile?.[PROFILE_STATS],
          records,
          sessionGroupId,
          regularGroupIds,
          sessionDate,
          existingManual
        );

        // Skip write if unchanged
        if (existing) {
          try {
            if (JSON.stringify(JSON.parse(existing)) === JSON.stringify(newStats)) return;
          } catch { /* malformed — fall through to write */ }
        }

        await entriesRepository.updateStats(entry.ID, newStats);
        updated++;
        updatedIds.push(entry.ID);
      } catch (err: any) {
        const msg = `Entry ${entry.ID}: ${err.message}`;
        console.error(`[Stats] Error: ${msg}`);
        errors.push(msg);
      }
    }));
  }

  const elapsed = Date.now() - start;
  console.log(`[Stats] Entry refresh complete: ${updated}/${total} eligible updated, ${frozen} frozen/skipped, ${errors.length} errors, ${elapsed}ms`);

  return { total, updated, updatedIds, frozen, errors };
}
