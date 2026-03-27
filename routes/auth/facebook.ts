import express, { Request, Response, Router, NextFunction } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import passport from 'passport';
import { resolvePersonalSession } from '../../services/personal-auth';

const router: Router = express.Router();

// GET /auth/facebook/login — redirect to Facebook OAuth
router.get('/facebook/login', (req: Request, res: Response, next: NextFunction) => {
  if (req.query.returnTo && String(req.query.returnTo).startsWith('/')) {
    req.session.returnTo = req.query.returnTo as string;
  }
  passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});

// GET /auth/facebook/callback — handle redirect from Facebook
router.get('/facebook/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('facebook', { session: false }, async (err: any, profile: any) => {
    try {
      if (err || !profile) {
        console.error('Facebook auth error:', err?.message || 'no profile returned');
        res.redirect('/login.html?reason=not-approved');
        return;
      }

      const email = profile.emails?.[0]?.value as string | undefined;
      if (!email) {
        res.redirect('/login.html?reason=no-email');
        return;
      }

      const result = await resolvePersonalSession(email, profile.displayName, profile.id);
      if (!result.ok) {
        res.redirect(`/login.html?reason=not-approved&email=${encodeURIComponent(email)}`);
        return;
      }

      req.session.user = result.sessionUser;
      const dest = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(dest);
    } catch (error: any) {
      console.error('Error in Facebook auth callback:', error.message);
      res.redirect('/login.html?reason=not-approved');
    }
  })(req, res, next);
});

export = router;
