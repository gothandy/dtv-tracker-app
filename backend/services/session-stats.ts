/**
 * Session stats refresh — shared logic used by the admin endpoint and the nightly Eventbrite sync.
 */

import { sessionsRepository } from './repositories/sessions-repository';
import { entriesRepository } from './repositories/entries-repository';
import { groupsRepository } from './repositories/groups-repository';
import { profilesRepository } from './repositories/profiles-repository';
import { sharePointClient } from './sharepoint-client';
import {
  calculateSessionStats,
  safeParseLookupId,
  mediaStatsFromFolderItems,
} from './data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP, SESSION_STATS, SESSION_COVER_MEDIA, ENTRY_CANCELLED, PROFILE_LOOKUP } from './field-names';
import type { MediaStatus } from '../../types/api-responses';

export interface SessionStatsRefreshResult {
  total: number;
  updated: number;
  updatedIds: number[];
  errors: string[];
}

function storedStatsMatch(
  existing: Record<string, unknown>,
  newStats: Record<string, unknown>,
): boolean {
  const keys = [
    'count', 'hours', 'media', 'mediaStatus', 'new', 'child',
    'regular', 'cancelledRegular', 'eventbrite',
  ] as const;
  return keys.every(k => existing[k] === newStats[k]);
}

/** Recomputes media count + mediaStatus for one session and merges into stored Stats. */
export async function refreshSessionMediaStats(
  sessionId: number,
  groupKey: string,
  date: string,
): Promise<void> {
  const mediaDriveId = process.env.MEDIA_LIBRARY_DRIVE_ID;
  if (!mediaDriveId) return;

  const spSession = await sessionsRepository.getById(sessionId);
  if (!spSession) return;

  sharePointClient.clearMediaFolderCache(`${groupKey}/${date}`);

  let existingStats: Record<string, unknown> = {};
  try {
    existingStats = JSON.parse(spSession[SESSION_STATS] || '{}');
  } catch { /* malformed — overwrite with fresh entry fields on next entry write */ }

  const coverMediaId = safeParseLookupId(spSession[SESSION_COVER_MEDIA] as unknown as string) ?? null;
  const photos = await sharePointClient.listFolderPhotos(mediaDriveId, `${groupKey}/${date}`);
  const { media, mediaStatus } = mediaStatsFromFolderItems(photos, coverMediaId);

  await sessionsRepository.updateStats(sessionId, {
    ...existingStats,
    media,
    mediaStatus,
  });
}

export async function runSessionStatsRefresh(): Promise<SessionStatsRefreshResult> {
  const start = Date.now();
  console.log('[Stats] Starting session stats refresh');

  const [sessionsRaw, entriesRaw, groupsRaw, profilesRaw] = await Promise.all([
    sessionsRepository.getAll(),
    entriesRepository.getAll(),
    groupsRepository.getAll(),
    profilesRepository.getAll()
  ]);

  console.log(`[Stats] Fetched ${sessionsRaw.length} sessions, ${entriesRaw.length} entries in ${Date.now() - start}ms`);

  // Build profileId → first sessionId from profile.stats.sessionIds[0]
  const profileFirstSessionMap = new Map<number, number>();
  for (const p of profilesRaw) {
    try {
      const ps = JSON.parse(p.Stats || '{}');
      if (Array.isArray(ps.sessionIds) && ps.sessionIds.length > 0)
        profileFirstSessionMap.set(p.ID, ps.sessionIds[0]);
    } catch { /* malformed */ }
  }

  const groupKeyMap = new Map(groupsRaw.map(g => [g.ID, (g.Title || '').toLowerCase()]));
  const statsMap = calculateSessionStats(entriesRaw, profileFirstSessionMap);

  // Build per-session cancelled regular counts
  const cancelledRegularMap = new Map<string, number>();
  for (const e of entriesRaw) {
    if (!e[ENTRY_CANCELLED]) continue;
    if (!e.Labels?.includes('Regular')) continue;
    const sid = String(e[SESSION_LOOKUP] ?? '');
    if (sid) cancelledRegularMap.set(sid, (cancelledRegularMap.get(sid) ?? 0) + 1);
  }

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

        let media = mediaCount;
        let mediaStatus: MediaStatus = 'none';
        if (mediaCount === 0) {
          mediaStatus = 'none';
        } else if (mediaDriveId && groupKey && date) {
          const coverMediaId = safeParseLookupId(spSession[SESSION_COVER_MEDIA] as unknown as string) ?? null;
          const photos = await sharePointClient.listFolderPhotos(mediaDriveId, `${groupKey}/${date}`);
          const computed = mediaStatsFromFolderItems(photos, coverMediaId);
          media = computed.media;
          mediaStatus = computed.mediaStatus;
        }

        const cancelledRegular = cancelledRegularMap.get(String(spSession.ID)) ?? 0;
        const newStats = {
          count: entryStats?.registrations || 0,
          hours: entryStats ? Math.round(entryStats.hours * 10) / 10 : 0,
          media,
          mediaStatus,
          new: entryStats?.newCount || 0,
          child: entryStats?.childCount || 0,
          regular: entryStats?.regularCount || 0,
          cancelledRegular,
          eventbrite: entryStats?.eventbriteCount || 0,
        };

        // Skip if stored stats already match — avoids unnecessary Graph writes
        const stored = spSession[SESSION_STATS];
        if (stored) {
          try {
            const existing = JSON.parse(stored);
            if (storedStatsMatch(existing, newStats)) {
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
