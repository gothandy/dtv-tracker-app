const TTL_MS = 12 * 60 * 60 * 1000; // 12h — governance PDFs change rarely

interface CacheEntry {
  data: Buffer;
  contentType: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getGovernanceDocCache(slugPath: string): CacheEntry | null {
  const entry = cache.get(slugPath);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) {
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
