import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { validateAuthToken } from '../services/auth-store';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { profileSlug, parseEmails } from '../services/data-layer';

// Populates req.session.user from the dtv-auth cookie for self-service volunteers.
// DTV account (MSAL) users already have req.session.user set by their own auth flow — skip them.
// On SharePoint error, degrades gracefully to unauthenticated rather than 500ing the page.
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (req.session.user) { next(); return; } // DTV session already active

  const rawToken: string | undefined = req.cookies?.['dtv-auth'];
  if (!rawToken) { next(); return; }

  const record = await validateAuthToken(rawToken); // returns null on error
  if (!record) { next(); return; }

  try {
    const profiles = await profilesRepository.getAll();
    const profile = profiles.find(p => p.ID === record.profileId);
    if (!profile) { next(); return; }

    const adminUsers = parseEmails(process.env.ADMIN_USERS);
    const emails = parseEmails(profile.Email);
    const primaryEmail = emails[0] || '';

    let trustedRole: 'admin' | 'checkin' | undefined;
    const linkedDTVEmail = profile.User?.toLowerCase();
    if (emails.some(e => adminUsers.includes(e)) || (linkedDTVEmail && adminUsers.includes(linkedDTVEmail))) {
      trustedRole = 'admin';
    } else if (profile.User) {
      trustedRole = 'checkin';
    }

    // Find all profiles sharing any of this volunteer's email addresses
    const profileIds = profiles
      .filter(p => parseEmails(p.Email).some(e => emails.includes(e)))
      .map(p => p.ID);

    req.session.user = {
      id: `auth:${record.profileId}`,
      displayName: profile.Title || primaryEmail,
      email: primaryEmail,
      role: 'selfservice',
      profileSlug: profileSlug(profile.Title, profile.ID),
      profileId: profile.ID,
      profileIds,
      trustedRole,
      freshAuthAt: record.createdAt,
    };
  } catch (err: any) {
    console.error('[Auth] authMiddleware error building session user:', err.message);
    // Degrade gracefully — leave req.session.user undefined
  }

  next();
}
