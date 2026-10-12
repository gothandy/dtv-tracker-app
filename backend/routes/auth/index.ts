import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import dtvRouter from './dtv';
import verifyRouter from './verify';
import { revokeAuthToken, LOGIN_COOKIE } from '../../services/auth-store';

const router: Router = express.Router();

router.use(dtvRouter);
router.use(verifyRouter);

// GET /auth/logout — end the sign-in (Logins row, cookie and session), return to homepage
router.get('/logout', async (req: Request, res: Response) => {
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
  const name = req.session.user?.displayName;
  req.session.destroy(() => {
    const qs = name ? `?flashKey=signed-out&flashName=${encodeURIComponent(name)}` : '?flashKey=signed-out';
    res.redirect(`/${qs}`);
  });
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
