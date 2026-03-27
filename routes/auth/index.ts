import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { magicLogin } from '../../services/magic-auth';
import dtvRouter from './dtv';
import googleRouter from './google';
import facebookRouter from './facebook';
import magicRouter from './magic';

// ─── Strategy: Facebook ───────────────────────────────────────────────────────
// Production uses m.facebook.com to prevent Android's intent filter routing OAuth
// to the Facebook native app. m.facebook.com blocks HTTP so use www for local dev.
// WEBSITE_SITE_NAME is set automatically by Azure App Service — no extra env var needed.
const FB_AUTH_URL = process.env.WEBSITE_SITE_NAME
  ? 'https://m.facebook.com/v19.0/dialog/oauth'
  : 'https://www.facebook.com/v19.0/dialog/oauth';

passport.use(new FacebookStrategy(
  {
    clientID:         process.env.FACEBOOK_APP_ID!,
    clientSecret:     process.env.FACEBOOK_APP_SECRET!,
    callbackURL:      '/auth/facebook/callback',
    authorizationURL: FB_AUTH_URL,
    profileFields:    ['id', 'emails', 'displayName'],
  },
  (_accessToken, _refreshToken, profile, done) => done(null, profile),
));

// ─── Strategy: Google ─────────────────────────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL:  '/auth/google/callback',
  },
  (_accessToken, _refreshToken, profile, done) => done(null, profile),
));

// ─── Strategy: Magic Link ─────────────────────────────────────────────────────
passport.use(magicLogin);

// ─── Router ───────────────────────────────────────────────────────────────────
const router: Router = express.Router();

router.use(passport.initialize());

router.use(dtvRouter);
router.use(googleRouter);
router.use(facebookRouter);
router.use(magicRouter);

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
    magic:    !!process.env.SMTP_HOST,
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
