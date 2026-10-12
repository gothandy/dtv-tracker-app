import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { validateAuthToken, LOGIN_COOKIE } from '../services/auth-store';
import { staffSessionUser } from '../services/personal-auth';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { profileSlug, parseEmails } from '../services/data-layer';
import { PROFILE_STATS } from '../services/field-names';
import { isAdminEmail } from '../config';

// Rebuilds req.session.user from the dtv-auth cookie when there's no session yet,
// e.g. after a restart or deploy, or when the 8-hour session cookie has run out.
// The Logins row says how the person signed in: Microsoft sign-ins get their staff
// role back (worked out afresh from the current admin list); email-code sign-ins
// get a self-service session.
// If SharePoint can't be reached, the request fails with a message rather than
// quietly treating the person as signed out.
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.session.user) { next(); return; } // session already active

  const rawToken: string | undefined = req.cookies?.[LOGIN_COOKIE];
  if (!rawToken) { next(); return; }

  try {
    const record = await validateAuthToken(rawToken);
    if (!record) { next(); return; }

    const profiles = await profilesRepository.getAll();
    const profile = profiles.find(p => p.ID === record.profileId);
    if (!profile) { next(); return; }

    if (record.method === 'Microsoft') {
      // Only while the profile is still linked to a DTV account.
      if (!profile.User) { next(); return; }
      req.session.user = staffSessionUser(profile, profile.User, record.createdAt);
      next();
      return;
    }

    const emails = parseEmails(profile.Email);
    const primaryEmail = emails[0] || '';

    let trustedRole: 'admin' | 'checkin' | undefined;
    const linkedDTVEmail = profile.User?.toLowerCase();
    if (emails.some(isAdminEmail) || isAdminEmail(linkedDTVEmail)) {
      trustedRole = 'admin';
    } else if (profile.User) {
      trustedRole = 'checkin';
    }

    // Find all profiles sharing any of this volunteer's email addresses
    const profileIds = profiles
      .filter(p => parseEmails(p.Email).some(e => emails.includes(e)))
      .map(p => p.ID);

    let profileStats: NonNullable<import('express-session').SessionData['user']>['profileStats'];
    if (profile[PROFILE_STATS]) {
      try { profileStats = JSON.parse(profile[PROFILE_STATS]); } catch {}
    }

    req.session.user = {
      id: `auth:${record.profileId}`,
      displayName: profile.Title || primaryEmail,
      email: primaryEmail,
      role: 'selfservice',
      profileSlug: profileSlug(profile.Title, profile.ID),
      profileId: profile.ID,
      profileIds,
      trustedRole,
      profileStats,
      freshAuthAt: record.createdAt,
    };
  } catch (err: any) {
    console.error('[Auth] Could not check sign-in:', err.message);
    const message = "We couldn't check your sign-in just now. Please try again in a minute; if it keeps happening, contact your admin.";
    if (req.path.startsWith('/api/')) {
      res.status(503).json({ success: false, error: message });
    } else {
      res.status(503).type('text').send(message);
    }
    return;
  }

  next();
}
