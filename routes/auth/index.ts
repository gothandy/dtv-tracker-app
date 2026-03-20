import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import dtvRouter from './dtv';
import googleRouter from './google';
import facebookRouter from './facebook';

const router: Router = express.Router();

router.use(dtvRouter);
router.use(googleRouter);
router.use(facebookRouter);

// GET /auth/logout — clear app session and return to homepage (no DTV Account sign-out)
router.get('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// GET /auth/providers — return which personal account OAuth providers are configured
router.get('/providers', (_req: Request, res: Response) => {
  console.log(`[Auth] Providers`);
  res.json({
    google:   !!process.env.GOOGLE_CLIENT_ID,
    facebook: !!process.env.FACEBOOK_APP_ID,
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
