import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { validateAuthToken, LOGIN_COOKIE } from '../services/auth-store';
import { resolvePersonalSession, staffSessionUser } from '../services/personal-auth';
import { profilesRepository } from '../services/repositories/profiles-repository';

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
  if (req.session.user) { next(); return; } // session already active
  if (req.path === '/auth/sign-out') { next(); return; } // signing out must always work

  const rawToken: string | undefined = req.cookies?.[LOGIN_COOKIE];
  if (!rawToken) { next(); return; }

  try {
    const login = await validateAuthToken(rawToken);
    if (!login) { next(); return; }

    if (login.method === 'Microsoft') {
      const profiles = await profilesRepository.getAll();
      const profile = profiles.find(p => p.User?.toLowerCase() === login.email);
      if (profile) req.session.user = staffSessionUser(profile, login.email, login.createdAt);
    } else {
      const result = await resolvePersonalSession(login.email, '', '');
      if (result.ok) req.session.user = { ...result.sessionUser, freshAuthAt: login.createdAt };
    }
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
