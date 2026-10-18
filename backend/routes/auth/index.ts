import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import dtvRouter from './dtv';
import verifyRouter from './verify';
import { endSignInOnThisBrowser, LOGOUT_HINT_COOKIE, ACCESS_COOKIE } from '../../services/auth-store';
import { requestOrigin } from '../../services/request-origin';
import { entra, platform } from '../../config';

/** How long an Admin's choice of access is remembered on a device (as the remembered account). */
const ACCESS_CHOICE_DAYS = 365;

const router: Router = express.Router();

router.use(dtvRouter);
router.use(verifyRouter);

/** Carries the person's name across Microsoft's sign-out page, for the "signed out" banner. */
const SIGNED_OUT_NAME_COOKIE = 'dtv-signed-out-name';

function homeWithSignedOutBanner(name?: string): string {
  return name ? `/?flashKey=signed-out&flashName=${encodeURIComponent(name)}` : '/?flashKey=signed-out';
}

// GET /auth/sign-out — end the sign-in (Logins row, cookie and session), return to homepage.
// After a Microsoft sign-in, also sign out of Microsoft in this browser, so the next
// person on a shared device can't get straight back in. If the browser has more than
// one Microsoft account, Microsoft asks which one to sign out of.
async function signOut(req: Request, res: Response): Promise<void> {
  const logoutHint: string | undefined = req.cookies?.[LOGOUT_HINT_COOKIE];
  const signedInWithMicrosoft =
    req.session.user?.role === 'admin' || req.session.user?.role === 'checkin' || !!logoutHint;

  await endSignInOnThisBrowser(req, res);
  const name = req.session.user?.displayName;
  req.session.destroy(() => {
    if (signedInWithMicrosoft) {
      if (name) res.cookie(SIGNED_OUT_NAME_COOKIE, name, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
      // Microsoft returns to /auth/signed-out, which must be a registered redirect URI.
      const params = new URLSearchParams({ post_logout_redirect_uri: `${requestOrigin(req)}/auth/signed-out` });
      // Names the account, so Microsoft doesn't ask which one to sign out of.
      if (logoutHint) params.set('logout_hint', logoutHint);
      res.redirect(`https://login.microsoftonline.com/${entra.tenantId}/oauth2/v2.0/logout?${params}`);
      return;
    }
    res.redirect(homeWithSignedOutBanner(name));
  });
}

router.get('/sign-out', signOut);
// Old address: pages opened before the rename still link here. Remove with #283.
router.get('/logout', signOut);

// Old address for starting a Microsoft sign-in, kept for pages opened before the rename. Remove with #283.
router.get('/login', (req: Request, res: Response) => {
  const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  res.redirect(`/auth/sign-in${query}`);
});

// GET /auth/signed-out — Microsoft returns here after signing out; show the usual banner.
router.get('/signed-out', (req: Request, res: Response) => {
  const name: string | undefined = req.cookies?.[SIGNED_OUT_NAME_COOKIE];
  res.clearCookie(SIGNED_OUT_NAME_COOKIE);
  res.redirect(homeWithSignedOutBanner(name));
});

// POST /auth/access { role: 'admin' | 'checkin' } — someone on the admin list switches Admin
// on or off. Admins work as Check In by default (safer day to day, and a real test of what
// Check In can do); this takes effect at once and is remembered on this device.
router.post('/access', (req: Request, res: Response) => {
  const user = req.session.user;
  const role = (req.body as { role?: unknown })?.role;
  if (!user?.canBeAdmin) {
    res.status(403).json({ success: false, error: 'Not permitted' });
    return;
  }
  if (role !== 'admin' && role !== 'checkin') {
    res.status(400).json({ success: false, error: "role must be 'admin' or 'checkin'" });
    return;
  }
  user.role = role;
  if (role === 'admin') {
    res.cookie(ACCESS_COOKIE, 'admin', {
      httpOnly: true, secure: !platform.isLocal, sameSite: 'lax', maxAge: ACCESS_CHOICE_DAYS * 24 * 60 * 60 * 1000,
    });
  } else {
    res.clearCookie(ACCESS_COOKIE);
  }
  res.json({ success: true, user });
});

// GET /auth/me — return current user info (no auth required)
router.get('/me', (req: Request, res: Response) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

export = router;
