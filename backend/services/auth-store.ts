import crypto from 'crypto';
import { sharePointClient } from './sharepoint-client';
import { safeParseLookupId } from './data-layer';

// SharePoint Logins list — stores hashed auth tokens for self-service volunteer auth.
// Title = SHA-256 hash of the raw token (indexed by default).
// Profile = lookup to Profiles list.
// Created = auth issue date (auto-managed by SharePoint) — used as freshAuthAt.
const LOGINS_LIST_GUID = 'e3b5c7fb-313a-44b4-9363-a4e4d2b65a57';

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Create a 128-bit auth token, store its hash in the Logins list, return the raw token.
// The caller is responsible for setting this in the dtv-auth cookie.
// Throws if the SharePoint write fails — caller must not set the cookie if this throws.
export async function createAuthToken(profileId: number, userAgent?: string): Promise<string> {
  const rawToken = crypto.randomBytes(16).toString('hex'); // 128-bit = 32 hex chars
  const hash = hashToken(rawToken);
  const fields: Record<string, unknown> = { Title: hash, ProfileLookupId: profileId };
  if (userAgent) fields.Agent = userAgent.slice(0, 255); // single line of text — 255 char max
  await sharePointClient.createListItem(LOGINS_LIST_GUID, fields);
  return rawToken;
}

// Validate a raw auth token by hashing it and querying the Logins list.
// Returns { profileId, createdAt } if the token exists and is within the TTL window.
// Returns null if invalid, expired, or on SharePoint error (degrades gracefully).
export async function validateAuthToken(rawToken: string): Promise<{ profileId: number; createdAt: string } | null> {
  try {
    const hash = hashToken(rawToken);
    const ttlHours = parseInt(process.env.AUTH_BASIC_TTL_HOURS || '72', 10);
    const since = new Date(Date.now() - ttlHours * 60 * 60 * 1000).toISOString();

    const items = await sharePointClient.getListItems(
      LOGINS_LIST_GUID,
      'Title,ProfileLookupId,Created',
      `fields/Title eq '${hash}' and fields/Created ge '${since}'`
    );

    if (items.length === 0) return null;

    const profileId = safeParseLookupId(items[0].ProfileLookupId);
    if (!profileId) return null;

    return { profileId, createdAt: items[0].Created as string };
  } catch (err: any) {
    console.error('[AuthStore] validateAuthToken error:', err.message);
    return null; // degrade gracefully — treat as unauthenticated
  }
}
