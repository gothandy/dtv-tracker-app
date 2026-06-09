import { isFileProxyCacheValid } from './file-proxy-cache-ttl';

interface CacheEntry {
  data: Buffer;
  contentType: string;
  fetchedAt: number;
}

/** Keys are `{projectKey}/{driveItemId}`. */
const cache = new Map<string, CacheEntry>();

export function getProjectDocCache(cacheKey: string): CacheEntry | null {
  const entry = cache.get(cacheKey);
  if (!entry) return null;
  if (!isFileProxyCacheValid(entry.fetchedAt)) {
    cache.delete(cacheKey);
    return null;
  }
  return entry;
}

export function setProjectDocCache(cacheKey: string, data: Buffer, contentType: string): void {
  cache.set(cacheKey, { data, contentType, fetchedAt: Date.now() });
}

export function clearProjectDocsCache(projectKey?: string): void {
  if (!projectKey) {
    cache.clear();
    return;
  }
  const prefix = `${projectKey}/`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
