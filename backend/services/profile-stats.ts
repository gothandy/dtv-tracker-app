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
 */

import { profilesRepository } from './repositories/profiles-repository';
import { entriesRepository } from './repositories/entries-repository';
import { sessionsRepository } from './repositories/sessions-repository';
import { recordsRepository } from './repositories/records-repository';
import { regularsRepository } from './repositories/regulars-repository';
import { sharePointClient } from './sharepoint-client';
import { safeParseLookupId, calculateFinancialYear } from './data-layer';
import { PROFILE_LOOKUP, GROUP_LOOKUP, SESSION_LOOKUP, PROFILE_STATS, ENTRY_CANCELLED } from './field-names';
import { computeAndSaveEntryStats } from './entry-stats';

export interface ProfileStatsRefreshResult {
  total: number;
  updated: number;
  updatedIds: number[];
  errors: string[];
}

/**
 * Recomputes and saves Stats for a single profile after an entry or record change.
 * Called as fire-and-forget so the response isn't delayed.
 * Sessions come from cache; entries and records are targeted Graph calls.
 */
export async function computeAndSaveProfileStats(profileId: number): Promise<void> {
  const start = Date.now();

  // Sessions from cache for FY mapping and date-ordering sessionIds
  const sessionsRaw = await sessionsRepository.getAll();
  const sessionFYMap = new Map<number, string>();
  const sessionDateMap = new Map<number, string>();
  for (const s of sessionsRaw) {
    if (!s.Date) continue;
    const fy = calculateFinancialYear(new Date(s.Date));
    sessionFYMap.set(s.ID, `FY${fy}`);
    sessionDateMap.set(s.ID, s.Date.substring(0, 10));
  }

  // Targeted fetches for this profile
  const [profileEntries, profileRecordsRaw, regularsRaw] = await Promise.all([
    entriesRepository.getByProfileId(profileId),
    recordsRepository.available ? recordsRepository.getByProfile(profileId) : Promise.resolve([]),
    regularsRepository.getAll()
  ]);

  // session ID → group ID for repeatGroupIds derivation
  const sessionGroupMap = new Map<number, number>();
  for (const s of sessionsRaw) {
    const groupId = safeParseLookupId(s[GROUP_LOOKUP] as unknown as string);
    if (groupId !== undefined) sessionGroupMap.set(s.ID, groupId);
  }

  const hoursByFY: Record<string, number> = {};
  const sessionsByFY: Record<string, number> = {};
  const sessionIds: number[] = [];
  const repeatGroupIdSet = new Set<number>();

  for (const e of profileEntries) {
    if (e[ENTRY_CANCELLED]) continue; // cancelled bookings excluded from all stats
    const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
    if (sessionId === undefined) continue;
    sessionIds.push(sessionId);
    const groupId = sessionGroupMap.get(sessionId);
    if (groupId !== undefined) repeatGroupIdSet.add(groupId);
    const fyKey = sessionFYMap.get(sessionId);
    if (!fyKey) continue;
    const hours = parseFloat(String(e.Hours)) || 0;
    hoursByFY[fyKey] = (hoursByFY[fyKey] || 0) + hours;
    sessionsByFY[fyKey] = (sessionsByFY[fyKey] || 0) + 1;
  }

  const repeatGroupIds = Array.from(repeatGroupIdSet);

  for (const k of Object.keys(hoursByFY)) {
    hoursByFY[k] = Math.round(hoursByFY[k] * 10) / 10;
  }

  const regularGroupIds = regularsRaw
    .filter(r => safeParseLookupId(r[PROFILE_LOOKUP] as unknown as string) === profileId)
    .map(r => safeParseLookupId(r[GROUP_LOOKUP] as unknown as string))
    .filter((id): id is number => id !== undefined);

  // Other profiles sharing any email with this one — available from cached profiles list
  const profilesRaw = await profilesRepository.getAll();
  const thisProfile = profilesRaw.find(p => p.ID === profileId);
  const thisEmails = new Set((thisProfile?.Email || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean));
  const linkedProfileIds = profilesRaw
    .filter(p => p.ID !== profileId && (p.Email || '').split(',').some((e: string) => thisEmails.has(e.trim().toLowerCase())))
    .map(p => p.ID);

  let isMember = false;
  let cardStatus: string | null = null;
  let isFirstAider = false;
  const today = new Date().toISOString().substring(0, 10);
  for (const r of profileRecordsRaw) {
    if (r.Type === 'Charity Membership' && r.Status === 'Accepted') isMember = true;
    if (r.Type === 'Discount Card' && r.Status) cardStatus = r.Status;
    if (r.Type === 'First Aid Certificate' && r.Status === 'Expires' && r.Date && r.Date.substring(0, 10) > today) isFirstAider = true;
  }

  sessionIds.sort((a, b) => (sessionDateMap.get(a) || '').localeCompare(sessionDateMap.get(b) || ''));

  await profilesRepository.updateStats(profileId, { hoursByFY, sessionsByFY, isMember, cardStatus, regularGroupIds, repeatGroupIds, sessionIds, linkedProfileIds, isFirstAider });
  sharePointClient.clearCacheKey('profiles');

  // Propagate to entry stats for this profile's future sessions (fire-and-forget)
  for (const e of profileEntries) {
    const sid = safeParseLookupId(e[SESSION_LOOKUP]);
    if (sid === undefined) continue;
    const sessionDate = sessionDateMap.get(sid);
    if (sessionDate && sessionDate >= today) {
      computeAndSaveEntryStats(e.ID).catch(err =>
        console.error(`[Stats] Failed entry stats propagation for entry ${e.ID}:`, err)
      );
    }
  }

  console.log(`[Stats] Profile ${profileId} targeted stats update in ${Date.now() - start}ms`);
}

export async function runProfileStatsRefresh(): Promise<ProfileStatsRefreshResult> {
  const start = Date.now();
  console.log('[Stats] Starting profile stats refresh');

  const [profilesRaw, entriesRaw, sessionsRaw, recordsRaw, regularsRaw] = await Promise.all([
    profilesRepository.getAll(),
    entriesRepository.getAll(),
    sessionsRepository.getAll(),
    recordsRepository.available ? recordsRepository.getAll() : Promise.resolve([]),
    regularsRepository.getAll()
  ]);

  console.log(`[Stats] Fetched ${profilesRaw.length} profiles, ${entriesRaw.length} entries, ${recordsRaw.length} records in ${Date.now() - start}ms`);

  // session ID → FY key, date (YYYY-MM-DD), and group ID
  const sessionFYMap = new Map<number, string>();
  const sessionDateMap = new Map<number, string>();
  const sessionGroupMap = new Map<number, number>();
  for (const s of sessionsRaw) {
    if (!s.Date) continue;
    const fy = calculateFinancialYear(new Date(s.Date));
    sessionFYMap.set(s.ID, `FY${fy}`);
    sessionDateMap.set(s.ID, s.Date.substring(0, 10));
    const groupId = safeParseLookupId(s[GROUP_LOOKUP] as unknown as string);
    if (groupId !== undefined) sessionGroupMap.set(s.ID, groupId);
  }

  // Aggregate hours, session counts, session ID lists, and repeat group IDs per profile
  const profileHours = new Map<number, Record<string, number>>();   // profileId → { FY2025: 120.0 }
  const profileSessions = new Map<number, Record<string, number>>(); // profileId → { FY2025: 28 }
  const profileSessionIds = new Map<number, number[]>();             // profileId → [sessionId, ...]
  const profileRepeatGroupIds = new Map<number, Set<number>>();      // profileId → Set of groupIds attended

  for (const e of entriesRaw) {
    if (e[ENTRY_CANCELLED]) continue; // cancelled bookings excluded from all stats
    const profileId = safeParseLookupId(e[PROFILE_LOOKUP]);
    const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
    if (profileId === undefined || sessionId === undefined) continue;

    if (!profileSessionIds.has(profileId)) profileSessionIds.set(profileId, []);
    profileSessionIds.get(profileId)!.push(sessionId);

    const groupId = sessionGroupMap.get(sessionId);
    if (groupId !== undefined) {
      if (!profileRepeatGroupIds.has(profileId)) profileRepeatGroupIds.set(profileId, new Set());
      profileRepeatGroupIds.get(profileId)!.add(groupId);
    }

    const fyKey = sessionFYMap.get(sessionId);
    if (!fyKey) continue;

    const hours = parseFloat(String(e.Hours)) || 0;

    if (!profileHours.has(profileId)) profileHours.set(profileId, {});
    profileHours.get(profileId)![fyKey] = (profileHours.get(profileId)![fyKey] || 0) + hours;

    if (!profileSessions.has(profileId)) profileSessions.set(profileId, {});
    profileSessions.get(profileId)![fyKey] = (profileSessions.get(profileId)![fyKey] || 0) + 1;
  }

  // Regular group IDs per profile
  const profileRegularGroupIds = new Map<number, number[]>();
  for (const r of regularsRaw) {
    const pid = safeParseLookupId(r[PROFILE_LOOKUP] as unknown as string);
    const gid = safeParseLookupId(r[GROUP_LOOKUP] as unknown as string);
    if (pid === undefined || gid === undefined) continue;
    if (!profileRegularGroupIds.has(pid)) profileRegularGroupIds.set(pid, []);
    profileRegularGroupIds.get(pid)!.push(gid);
  }

  // Linked profile IDs — other profiles sharing any email with this one
  const profileLinkedIds = new Map<number, number[]>();
  for (const p of profilesRaw) {
    const emails = (p.Email || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const linked = profilesRaw
      .filter(q => q.ID !== p.ID && (q.Email || '').split(',').some((e: string) => emails.includes(e.trim().toLowerCase())))
      .map(q => q.ID);
    if (linked.length) profileLinkedIds.set(p.ID, linked);
  }

  // membership, card status, and first aider status from records
  const memberIds = new Set<number>();
  const cardStatusMap = new Map<number, string>();
  const firstAiderIds = new Set<number>();
  const today = new Date().toISOString().substring(0, 10);
  for (const r of recordsRaw) {
    const pid = safeParseLookupId(r.ProfileLookupId as unknown as string);
    if (pid === undefined) continue;
    if (r.Type === 'Charity Membership' && r.Status === 'Accepted') memberIds.add(pid);
    if (r.Type === 'Discount Card' && r.Status) cardStatusMap.set(pid, r.Status);
    if (r.Type === 'First Aid Certificate' && r.Status === 'Expires' && r.Date && r.Date.substring(0, 10) > today) firstAiderIds.add(pid);
  }

  // Round hours to 1 decimal place
  function roundHours(obj: Record<string, number>): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) result[k] = Math.round(v * 10) / 10;
    return result;
  }

  const total = profilesRaw.length;
  let updated = 0;
  const updatedIds: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < profilesRaw.length; i += 10) {
    const batch = profilesRaw.slice(i, i + 10);
    await Promise.all(batch.map(async (spProfile) => {
      try {
        const newStats = {
          hoursByFY: roundHours(profileHours.get(spProfile.ID) || {}),
          sessionsByFY: profileSessions.get(spProfile.ID) || {},
          isMember: memberIds.has(spProfile.ID),
          cardStatus: cardStatusMap.get(spProfile.ID) || null,
          regularGroupIds: profileRegularGroupIds.get(spProfile.ID) || [],
          repeatGroupIds: Array.from(profileRepeatGroupIds.get(spProfile.ID) || []),
          sessionIds: (profileSessionIds.get(spProfile.ID) || []).sort((a, b) => (sessionDateMap.get(a) || '').localeCompare(sessionDateMap.get(b) || '')),
          linkedProfileIds: profileLinkedIds.get(spProfile.ID) || [],
          isFirstAider: firstAiderIds.has(spProfile.ID)
        };

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
