/**
 * Session stats refresh — shared logic used by the admin endpoint and the nightly Eventbrite sync.
 *
 * Always computes from live SharePoint/list data. Stored Stats are only used to skip
 * unchanged Graph writes — never to decide what to fetch or how to classify media.
 *
 * Callers that need accurate session "new" counts should run profile stats refresh first
 * (session new-count uses profile.sessionIds). This module does not run profile stats itself.
 */

import { sessionsRepository } from './repositories/sessions-repository';
import { entriesRepository } from './repositories/entries-repository';
import { groupsRepository } from './repositories/groups-repository';
import { profilesRepository } from './repositories/profiles-repository';
import { sharePointClient } from './sharepoint-client';
import { calculateSessionStats, safeParseLookupId, mediaStatsFromFolderItems } from './data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP, SESSION_STATS, SESSION_COVER_MEDIA, ENTRY_CANCELLED } from './field-names';
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

function buildProfileFirstSessionMap(profilesRaw: Awaited<ReturnType<typeof profilesRepository.getAll>>): Map<number, number> {
  const profileFirstSessionMap = new Map<number, number>();
  for (const p of profilesRaw) {
    try {
      const ps = JSON.parse(p.Stats || '{}');
      if (Array.isArray(ps.sessionIds) && ps.sessionIds.length > 0)
        profileFirstSessionMap.set(p.ID, ps.sessionIds[0]);
    } catch { /* malformed */ }
  }
  return profileFirstSessionMap;
}

async function liveMediaStats(
  mediaDriveId: string,
  groupKey: string,
  date: string,
  coverMediaId: number | null,
): Promise<{ media: number; mediaStatus: MediaStatus }> {
  const photos = await sharePointClient.listFolderPhotos(mediaDriveId, `${groupKey}/${date}`);
  return mediaStatsFromFolderItems(photos, coverMediaId);
}

/** Recomputes media count + mediaStatus for one session from the live media folder. */
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

  const coverMediaId = safeParseLookupId(spSession[SESSION_COVER_MEDIA] as unknown as string) ?? null;
  const { media, mediaStatus } = await liveMediaStats(mediaDriveId, groupKey, date, coverMediaId);

  let existingStats: Record<string, unknown> = {};
  try {
    existingStats = JSON.parse(spSession[SESSION_STATS] || '{}');
  } catch { /* malformed */ }

  await sessionsRepository.updateStats(sessionId, {
    ...existingStats,
    media,
    mediaStatus,
  });
}

export async function runSessionStatsRefresh(): Promise<SessionStatsRefreshResult> {
  const start = Date.now();
  console.log('[Stats] Starting session stats refresh');

  // Bust cached media listings so every session reads the live folder.
  sharePointClient.clearCacheByPrefix('media_folder_');
  sharePointClient.clearCacheByPrefix('media-counts-');

  const [sessionsRaw, entriesRaw, groupsRaw, profilesRaw] = await Promise.all([
    sessionsRepository.getAll(),
    entriesRepository.getAll(),
    groupsRepository.getAll(),
    profilesRepository.getAll(),
  ]);

  console.log(`[Stats] Fetched ${sessionsRaw.length} sessions, ${entriesRaw.length} entries in ${Date.now() - start}ms`);

  const profileFirstSessionMap = buildProfileFirstSessionMap(profilesRaw);
  const groupKeyMap = new Map(groupsRaw.map(g => [g.ID, (g.Title || '').toLowerCase()]));
  const statsMap = calculateSessionStats(entriesRaw, profileFirstSessionMap);

  const cancelledRegularMap = new Map<string, number>();
  for (const e of entriesRaw) {
    if (!e[ENTRY_CANCELLED]) continue;
    if (!e.Labels?.includes('Regular')) continue;
    const sid = String(e[SESSION_LOOKUP] ?? '');
    if (sid) cancelledRegularMap.set(sid, (cancelledRegularMap.get(sid) ?? 0) + 1);
  }

  const mediaDriveId = process.env.MEDIA_LIBRARY_DRIVE_ID;
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

        let media = 0;
        let mediaStatus: MediaStatus = 'none';
        if (mediaDriveId && groupKey && date) {
          const coverMediaId = safeParseLookupId(spSession[SESSION_COVER_MEDIA] as unknown as string) ?? null;
          const computed = await liveMediaStats(mediaDriveId, groupKey, date, coverMediaId);
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

        const stored = spSession[SESSION_STATS];
        if (stored) {
          try {
            const existing = JSON.parse(stored);
            if (storedStatsMatch(existing, newStats)) {
              return;
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
