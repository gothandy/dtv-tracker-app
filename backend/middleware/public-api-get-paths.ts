import type { Request } from 'express';

/**
 * Full-path prefixes for API GETs allowed without a session (PII-safe).
 * Used by `require-auth.ts` (global) and `require-admin.ts` (mounted under `/api`).
 * `req.path` alone is not enough inside the API router — combine with `req.baseUrl`.
 */
export const PUBLIC_API_GET_PATH_PREFIXES: readonly string[] = [
  '/api/stats',
  '/api/sessions',
  '/api/groups',
  '/api/projects',
  '/api/tags',
  '/api/media',
  '/api/docs',
  '/api/email/sandbox',
];

function fullApiPath(req: Pick<Request, 'path' | 'baseUrl'>): string {
  const base = req.baseUrl ?? '';
  const path = req.path ?? '';
  if (!base) return path;
  return path === '/' ? base : base + path;
}

export function isPublicApiGet(req: Pick<Request, 'method' | 'path' | 'baseUrl'>): boolean {
  if (req.method !== 'GET') return false;
  const full = fullApiPath(req);
  return PUBLIC_API_GET_PATH_PREFIXES.some(p => full.startsWith(p));
}
