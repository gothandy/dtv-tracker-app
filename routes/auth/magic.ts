import express, { Request, Response, Router, NextFunction } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import passport from 'passport';
import { magicLogin } from '../../services/magic-auth';
import { resolvePersonalSession } from '../../services/personal-auth';

const router: Router = express.Router();

// POST /auth/magic/send — accept email, send magic login link
// Body: { "destination": "user@example.com" }
router.post('/magic/send', (req: Request, res: Response) => {
  magicLogin.send(req, res);
});

// GET /auth/magic/callback — user clicks link from email; token verified by passport-magic-login
router.get('/magic/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('magiclogin', { session: false }, async (err: any, payload: any) => {
    try {
      if (err || !payload?.destination) {
        console.error('Magic link auth error:', err?.message || 'invalid or expired token');
        res.redirect('/login.html?reason=invalid-state');
        return;
      }

      const email = payload.destination as string;
      const result = await resolvePersonalSession(email, '', '');
      if (!result.ok) {
        res.redirect(`/login.html?reason=not-approved&email=${encodeURIComponent(email)}`);
        return;
      }

      req.session.user = result.sessionUser;
      const dest = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(dest);
    } catch (error: any) {
      console.error('Error in magic link callback:', error.message);
      res.redirect('/login.html?reason=not-approved');
    }
  })(req, res, next);
});

export = router;
