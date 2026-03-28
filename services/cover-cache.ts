/**
 * Server-side cache for resolved cover image bytes.
 *
 * Cover images are proxied from SharePoint pre-signed thumbnail URLs, which require
 * an authenticated Graph API lookup on every cache miss. Caching the bytes avoids
 * repeated SharePoint round-trips for the same session cover.
 *
 * Cache key: `${groupKey}/${dateParam}` (matches the /media/:group/:date/ URL structure).
 * TTL: 1 hour — cover images rarely change; busted explicitly on cover change or admin clear.
 */

const COVER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CoverCacheEntry {
  data: Buffer;
  contentType: string;
  fetchedAt: number;
}

const coverCache = new Map<string, CoverCacheEntry>();

export function getCoverCache(key: string): CoverCacheEntry | null {
  const entry = coverCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > COVER_CACHE_TTL_MS) {
    coverCache.delete(key);
    return null;
  }
  return entry;
}

export function setCoverCache(key: string, data: Buffer, contentType: string): void {
  coverCache.set(key, { data, contentType, fetchedAt: Date.now() });
}

export function clearCoverCacheKey(key: string): void {
  coverCache.delete(key);
}

export function clearCoverCache(): void {
  coverCache.clear();
}
