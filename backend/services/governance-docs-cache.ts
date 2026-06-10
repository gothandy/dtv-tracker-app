import { isFileProxyCacheValid } from './file-proxy-cache-ttl';

interface CacheEntry {
  data: Buffer;
  contentType: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getGovernanceDocCache(slugPath: string): CacheEntry | null {
  const entry = cache.get(slugPath);
  if (!entry) return null;
  if (!isFileProxyCacheValid(entry.fetchedAt)) {
    cache.delete(slugPath);
    return null;
  }
  return entry;
}

export function setGovernanceDocCache(slugPath: string, data: Buffer, contentType: string): void {
  cache.set(slugPath, { data, contentType, fetchedAt: Date.now() });
}

export function clearGovernanceDocsCache(): void {
  cache.clear();
}
