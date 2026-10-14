import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { validateAuthToken, LOGIN_COOKIE } from '../services/auth-store';
import { resolvePersonalSession, staffSessionUser } from '../services/personal-auth';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { LOGIN_HOURS } from '../config';
import { isClientCredentialsAuthError } from '../services/entra-auth-errors';

// Rebuilds req.session.user from the dtv-auth cookie when there's no session yet,
// e.g. after a restart or deploy, or when the 8-hour session cookie has run out.
//
// The Logins row holds the email the person proved at sign-in, and how. The rebuild
// runs the same check as sign-in on that email, against the profiles as they are now:
//   - Microsoft:  the email must be a profile's `User`; admin comes from the admin list.
//   - Email Code: the profiles whose `Email` includes it get a self-service session.
//
// If SharePoint can't be reached, the request fails with a message rather than
// quietly treating the person as signed out.
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.session.user) {
    // A session never outlives its sign-in: after LOGIN_HOURS it's dropped, and the
    // cookie check below finds the Logins row expired too.
    const signedInAt = Date.parse(req.session.user.freshAuthAt ?? '');
    if (Date.now() - signedInAt < LOGIN_HOURS * 60 * 60 * 1000) { next(); return; }
    delete req.session.user;
  }
  if (req.path === '/auth/sign-out' || req.path === '/auth/logout') { next(); return; } // signing out must always work

  const rawToken: string | undefined = req.cookies?.[LOGIN_COOKIE];
  if (!rawToken) { next(); return; }

  try {
    const login = await validateAuthToken(rawToken);
    if (login?.method === 'Microsoft') {
      const profiles = await profilesRepository.getAll();
      const profile = profiles.find(p => p.User?.toLowerCase() === login.email);
      if (profile) req.session.user = staffSessionUser(profile, login.email, login.createdAt);
    } else if (login) {
      const result = await resolvePersonalSession(login.email, '', '');
      if (result.ok) req.session.user = { ...result.sessionUser, freshAuthAt: login.createdAt };
    }
    // Expired, unknown, or no longer linked: drop the cookie so later requests don't look it up again.
    if (!req.session.user) res.clearCookie(LOGIN_COOKIE);
  } catch (err: any) {
    console.error('[Auth] Could not check sign-in:', err.message);
    // Say what's wrong when it's the app's own key (switched off, or its secret expired); otherwise a retry may help.
    const message = isClientCredentialsAuthError(err) && err.message !== 'Failed to authenticate with SharePoint'
      ? err.message
      : "We couldn't check your sign-in just now. Please try again in a minute; if it keeps happening, contact your admin.";
    if (req.path.startsWith('/api/')) {
      res.status(503).json({ success: false, error: message });
    } else {
      res.status(503).type('text').send(message);
    }
    return;
  }

  next();
}
