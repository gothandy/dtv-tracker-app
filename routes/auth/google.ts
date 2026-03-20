import express, { Request, Response, Router } from 'express';
import { randomBytes } from 'crypto';
/// <reference path="../../types/express-session.d.ts" />
import { getGoogleAuthUrl, getGoogleRedirectUri, exchangeGoogleCode } from '../../services/google-auth';
import { resolvePersonalSession } from '../../services/personal-auth';
import { profilesRepository } from '../../services/repositories/profiles-repository';
import { parseEmails } from '../../services/data-layer';

const router: Router = express.Router();

// GET /auth/google/login — redirect to Google OAuth
router.get('/google/login', (req: Request, res: Response) => {
  const returnTo = req.query.returnTo as string | undefined;
  if (returnTo && returnTo.startsWith('/')) {
    req.session.returnTo = returnTo;
  }
  const state = randomBytes(16).toString('hex');
  (req.session as any).oauthState = state;
  const redirectUri = getGoogleRedirectUri(req);
  res.redirect(getGoogleAuthUrl(redirectUri, state));
});

// GET /auth/google/callback — handle redirect from Google
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    // Verify CSRF state
    const expectedState = (req.session as any).oauthState;
    delete (req.session as any).oauthState;
    if (!expectedState || req.query.state !== expectedState) {
      res.redirect('/login.html?reason=invalid-state');
      return;
    }

    if (req.query.error) {
      console.error('Google auth error:', req.query.error);
      res.redirect('/login.html?reason=not-approved');
      return;
    }

    const code = req.query.code as string;
    if (!code) {
      res.redirect('/login.html?reason=not-approved');
      return;
    }

    const redirectUri = getGoogleRedirectUri(req);
    const googleUser = await exchangeGoogleCode(code, redirectUri);
    const profiles = await profilesRepository.getAll();
    const target = googleUser.email.toLowerCase();
    const matchedProfiles = profiles.filter(p => parseEmails(p.Email).includes(target));
    // TEMP DEBUG — remove before go-live
    if (target === 'gothandy@gmail.com') {
      res.json({
        target,
        redirectUri,
        protocol: req.protocol,
        host: req.get('host'),
        totalProfiles: profiles.length,
        matched: matchedProfiles.length,
        candidates: profiles
          .filter(p => p.Email)
          .map(p => ({ id: p.ID, title: p.Title, rawEmail: p.Email, parsed: parseEmails(p.Email) }))
          .filter(p => p.rawEmail!.toLowerCase().includes(target.split('@')[0]))
      });
      return;
    }

    const result = await resolvePersonalSession(googleUser.email, googleUser.name, googleUser.id);
    if (!result.ok) {
      res.redirect(`/login.html?reason=not-approved&email=${encodeURIComponent(googleUser.email)}`);
      return;
    }
    req.session.user = result.sessionUser;
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (error: any) {
    console.error('Error in Google auth callback:', error.message);
    // TEMP DEBUG — remove before go-live
    res.json({ debugError: error.message, stack: error.stack });
  }
});

export = router;
