/**
 * Session stats refresh — shared logic used by the admin endpoint and the nightly Eventbrite sync.
 */

import { sessionsRepository } from './repositories/sessions-repository';
import { entriesRepository } from './repositories/entries-repository';
import { groupsRepository } from './repositories/groups-repository';
import { sharePointClient } from './sharepoint-client';
import { calculateSessionStats, safeParseLookupId, parseSessionLimits } from './data-layer';
import { GROUP_LOOKUP, SESSION_STATS } from './field-names';

export interface SessionStatsRefreshResult {
  total: number;
  updated: number;
  updatedIds: number[];
  errors: string[];
}

export async function runSessionStatsRefresh(): Promise<SessionStatsRefreshResult> {
  const start = Date.now();
  console.log('[Stats] Starting session stats refresh');

  const [sessionsRaw, entriesRaw, groupsRaw] = await Promise.all([
    sessionsRepository.getAll(),
    entriesRepository.getAll(),
    groupsRepository.getAll()
  ]);

  console.log(`[Stats] Fetched ${sessionsRaw.length} sessions, ${entriesRaw.length} entries in ${Date.now() - start}ms`);

  const groupKeyMap = new Map(groupsRaw.map(g => [g.ID, (g.Title || '').toLowerCase()]));
  const statsMap = calculateSessionStats(entriesRaw);

  const mediaDriveId = process.env.MEDIA_LIBRARY_DRIVE_ID;
  const mediaCountsByGroup = new Map<string, Map<string, number>>();
  if (mediaDriveId) {
    const uniqueGroupKeys = [...new Set(
      sessionsRaw
        .map(s => {
          const gid = safeParseLookupId(s[GROUP_LOOKUP]);
          return gid !== undefined ? groupKeyMap.get(gid) : undefined;
        })
        .filter((k): k is string => !!k)
    )];
    const mediaStart = Date.now();
    await Promise.all(uniqueGroupKeys.map(async (groupKey) => {
      const counts = await sharePointClient.listGroupDateCounts(mediaDriveId, groupKey);
      mediaCountsByGroup.set(groupKey, counts);
    }));
    console.log(`[Stats] Media counts fetched for ${uniqueGroupKeys.length} groups in ${Date.now() - mediaStart}ms`);
  }

  const total = sessionsRaw.length;
  let updated = 0;
  const updatedIds: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < sessionsRaw.length; i += 10) {
    const batch = sessionsRaw.slice(i, i + 10);
    await Promise.all(batch.map(async (spSession) => {
      try {
        const entryStats = statsMap.get(String(spSession.ID));
        const gid = safeParseLookupId(spSession[GROUP_LOOKUP]);
        const groupKey = gid !== undefined ? groupKeyMap.get(gid) : undefined;
        const date = spSession.Date;

        let mediaCount = 0;
        if (groupKey && date && mediaCountsByGroup.has(groupKey)) {
          mediaCount = mediaCountsByGroup.get(groupKey)!.get(date) || 0;
        }

        const newStats = {
          count: entryStats?.registrations || 0,
          hours: entryStats ? Math.round(entryStats.hours * 10) / 10 : 0,
          media: mediaCount,
          new: entryStats?.newCount || 0,
          child: entryStats?.childCount || 0,
          regular: entryStats?.regularCount || 0,
          eventbrite: entryStats?.eventbriteCount || 0,
<<<<<<< HEAD
=======
          limits: parseSessionLimits(spSession)
>>>>>>> e36968749c560210849d30e8f2c7734d2dfbc153
        };

        // Skip if stored stats already match — avoids unnecessary Graph writes
        const stored = spSession[SESSION_STATS];
        if (stored) {
          try {
            const existing = JSON.parse(stored);
            if (
              existing.count      === newStats.count &&
              existing.hours      === newStats.hours &&
              existing.media      === newStats.media &&
              existing.new        === newStats.new &&
              existing.child      === newStats.child &&
              existing.regular    === newStats.regular &&
              existing.eventbrite === newStats.eventbrite &&
              JSON.stringify(existing.limits) === JSON.stringify(newStats.limits)
            ) {
              return; // unchanged — skip write
            }
          } catch { /* malformed JSON — fall through to write */ }
        }

        await sessionsRepository.updateStats(spSession.ID, newStats);
        updated++;
        updatedIds.push(spSession.ID);
      } catch (err: any) {
        const msg = `Session ${spSession.ID}: ${err.message}`;
        console.error(`[Stats] Error: ${msg}`);
        errors.push(msg);
      }
    }));
  }

  sharePointClient.clearCacheKey('sessions');

  const elapsed = Date.now() - start;
  console.log(`[Stats] Session refresh complete: ${updated}/${total} updated, ${errors.length} errors, ${elapsed}ms`);

  return { total, updated, updatedIds, errors };
}
