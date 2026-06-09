import { isFileProxyCacheValid } from './file-proxy-cache-ttl';

interface CacheEntry {
  data: Buffer;
  contentType: string;
  fetchedAt: number;
}

const cache = new Map<number, CacheEntry>();

export function getMediaCache(listItemId: number): CacheEntry | null {
  const entry = cache.get(listItemId);
  if (!entry) return null;
  if (!isFileProxyCacheValid(entry.fetchedAt)) {
    cache.delete(listItemId);
    return null;
  }
  return entry;
}

export function setMediaCache(listItemId: number, data: Buffer, contentType: string): void {
  cache.set(listItemId, { data, contentType, fetchedAt: Date.now() });
}

export function clearMediaCache(): void {
  cache.clear();
}
