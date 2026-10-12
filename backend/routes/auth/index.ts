import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import dtvRouter from './dtv';
import verifyRouter from './verify';
import { revokeAuthToken, LOGIN_COOKIE, LOGIN_HINT_COOKIE } from '../../services/auth-store';
import { requestOrigin } from '../../services/request-origin';
import { entra } from '../../config';

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
  const signedInWithMicrosoft =
    req.session.user?.role === 'admin' || req.session.user?.role === 'checkin' || !!req.cookies?.[LOGIN_HINT_COOKIE];

  const rawToken: string | undefined = req.cookies?.[LOGIN_COOKIE];
  if (rawToken) {
    try {
      await revokeAuthToken(rawToken);
    } catch (err: any) {
      // The person is still signed out on this device; the row expires on its own.
      console.error('[Auth] Could not delete Logins row at sign-out:', err.message);
    }
  }
  res.clearCookie(LOGIN_COOKIE);
  res.clearCookie(LOGIN_HINT_COOKIE);
  const name = req.session.user?.displayName;
  req.session.destroy(() => {
    if (signedInWithMicrosoft) {
      if (name) res.cookie(SIGNED_OUT_NAME_COOKIE, name, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
      // Microsoft returns to /auth/signed-out, which must be a registered redirect URI.
      const back = encodeURIComponent(`${requestOrigin(req)}/auth/signed-out`);
      res.redirect(`https://login.microsoftonline.com/${entra.tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${back}`);
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

// GET /auth/me — return current user info (no auth required)
router.get('/me', (req: Request, res: Response) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

export = router;
