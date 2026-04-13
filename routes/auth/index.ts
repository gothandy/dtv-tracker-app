import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import dtvRouter from './dtv';
import magicRouter from './magic';
import verifyRouter from './verify';

const router: Router = express.Router();

router.use(dtvRouter);
router.use(magicRouter);
router.use(verifyRouter);

// GET /auth/logout — clear app session and cookie, return to homepage
router.get('/logout', (req: Request, res: Response) => {
  res.clearCookie('dtv-auth');
  const name = req.session.user?.displayName;
  req.session.destroy(() => {
    const qs = name ? `?flashKey=signed-out&flashName=${encodeURIComponent(name)}` : '?flashKey=signed-out';
    res.redirect(`/${qs}`);
  });
});

// GET /auth/providers — which self-service login methods are configured
router.get('/providers', (_req: Request, res: Response) => {
  res.json({ magic: !!process.env.MAIL_SENDER, verify: !!process.env.MAIL_SENDER });
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
