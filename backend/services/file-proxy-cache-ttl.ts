/**
 * Shared TTL for session media, project docs, and governance docs:
 * SharePoint folder listings (NodeCache) and in-memory proxied file bytes.
 */
export const FILE_PROXY_CACHE_TTL_SEC = 6 * 60 * 60; // 6 hr
export const FILE_PROXY_CACHE_TTL_MS = FILE_PROXY_CACHE_TTL_SEC * 1000;

export function isFileProxyCacheValid(fetchedAt: number, now = Date.now()): boolean {
  return now - fetchedAt < FILE_PROXY_CACHE_TTL_MS;
}
