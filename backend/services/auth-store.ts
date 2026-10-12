import crypto from 'crypto';
import type { Response } from 'express';
import { sharePointClient } from './sharepoint-client';
import { sharePoint, platform, LOGIN_HOURS } from '../config';

// SharePoint Logins list: one row per sign-in, for both volunteers (email code) and
// staff (Microsoft). It lets a sign-in survive server restarts and deploys.
//   Title   = SHA-256 hash of the raw token in the dtv-auth cookie (the token itself is never stored)
//   Email   = the address the person proved they control: the @dtv.org.uk account Microsoft
//             confirmed, or the address the code was sent to. Access is worked out from this.
//   Profile = lookup to Profiles list (for people reading the list; not used for access)
//   Method  = 'Email Code' or 'Microsoft': how the person proved who they are
//   Agent   = browser user agent (for the person's own reference)
//   Created = sign-in time (auto-managed by SharePoint); rows older than LOGIN_HOURS are expired
// The list is restricted to site owners: anyone who could add rows could forge a sign-in.

export type LoginMethod = 'Email Code' | 'Microsoft';

export const LOGIN_COOKIE = 'dtv-auth';

/**
 * Remembers the DTV account used last time on this device, so the next Microsoft sign-in
 * goes straight to it (login_hint) even if the browser is also signed in to a work account.
 * Forgotten on sign-out.
 */
export const LOGIN_HINT_COOKIE = 'dtv-login-hint';

function loginsListGuid(): string {
  return sharePoint.lists.logins;
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function oldestValidSignIn(): string {
  return new Date(Date.now() - LOGIN_HOURS * 60 * 60 * 1000).toISOString();
}

// Create a 128-bit token, store its hash in the Logins list, return the raw token.
// Throws if the SharePoint write fails; the caller must not set the cookie then.
export async function createAuthToken(profileId: number, method: LoginMethod, email: string, userAgent?: string): Promise<string> {
  const rawToken = crypto.randomBytes(16).toString('hex'); // 128-bit = 32 hex chars
  const fields: Record<string, unknown> = {
    Title: hashToken(rawToken),
    ProfileLookupId: profileId,
    Method: method,
    Email: email.toLowerCase(),
  };
  if (userAgent) fields.Agent = userAgent.slice(0, 255); // single line of text, 255 max
  await sharePointClient.createListItem(loginsListGuid(), fields);
  return rawToken;
}

export function setLoginCookie(res: Response, rawToken: string): void {
  res.cookie(LOGIN_COOKIE, rawToken, {
    httpOnly: true,
    secure: !platform.isDevelopment,
    sameSite: 'lax',
    maxAge: LOGIN_HOURS * 60 * 60 * 1000,
  });
}

// Look up a token. Returns null if it doesn't exist, has expired, or has no Email
// (rows from before the Email column: those people sign in again).
// Throws if SharePoint can't be reached, so the caller can say so rather than
// quietly treating the person as signed out.
export async function validateAuthToken(rawToken: string): Promise<{ email: string; method: LoginMethod; createdAt: string } | null> {
  const items = await sharePointClient.getListItems(
    loginsListGuid(),
    'Title,Email,Method,Created',
    `fields/Title eq '${hashToken(rawToken)}' and fields/Created ge '${oldestValidSignIn()}'`
  );
  if (items.length === 0) return null;

  const email = (items[0].Email as string | undefined)?.trim().toLowerCase();
  if (!email) return null;

  const method: LoginMethod = items[0].Method === 'Microsoft' ? 'Microsoft' : 'Email Code';
  return { email, method, createdAt: items[0].Created as string };
}

// Sign-out: delete the token's row, so a copy of the cookie stops working too.
export async function revokeAuthToken(rawToken: string): Promise<void> {
  const items = await sharePointClient.getListItems(
    loginsListGuid(),
    'Title',
    `fields/Title eq '${hashToken(rawToken)}'`
  );
  for (const item of items) {
    await sharePointClient.deleteListItem(loginsListGuid(), Number(item.ID));
  }
}

// Nightly: delete expired rows, so the list doesn't keep a sign-in history.
export async function deleteExpiredLogins(): Promise<number> {
  const items = await sharePointClient.getListItems(
    loginsListGuid(),
    'Title',
    `fields/Created lt '${oldestValidSignIn()}'`
  );
  for (const item of items) {
    await sharePointClient.deleteListItem(loginsListGuid(), Number(item.ID));
  }
  return items.length;
}
