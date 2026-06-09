import { describe, it, expect } from 'vitest';
import { FILE_PROXY_CACHE_TTL_MS, isFileProxyCacheValid } from './file-proxy-cache-ttl';

describe('isFileProxyCacheValid', () => {
  it('returns true within TTL', () => {
    const now = 1_000_000;
    expect(isFileProxyCacheValid(now - FILE_PROXY_CACHE_TTL_MS + 1, now)).toBe(true);
  });

  it('returns false when expired', () => {
    const now = 1_000_000;
    expect(isFileProxyCacheValid(now - FILE_PROXY_CACHE_TTL_MS, now)).toBe(false);
  });
});
