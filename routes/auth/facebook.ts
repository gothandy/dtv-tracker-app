import express, { Request, Response, Router } from 'express';
import { randomBytes } from 'crypto';
/// <reference path="../../types/express-session.d.ts" />
import { getFacebookAuthUrl, getFacebookRedirectUri, exchangeFacebookCode } from '../../services/facebook-auth';
import { resolvePersonalSession } from '../../services/personal-auth';

const router: Router = express.Router();

// GET /auth/facebook/login — redirect to Facebook OAuth
router.get('/facebook/login', (req: Request, res: Response) => {
  const returnTo = req.query.returnTo as string | undefined;
  if (returnTo && returnTo.startsWith('/')) req.session.returnTo = returnTo;
  const state = randomBytes(16).toString('hex');
  (req.session as any).oauthState = state;
  const redirectUri = getFacebookRedirectUri(req);
  res.redirect(getFacebookAuthUrl(redirectUri, state));
});

// GET /auth/facebook/callback — handle redirect from Facebook
router.get('/facebook/callback', async (req: Request, res: Response) => {
  try {
    // Verify CSRF state — same session-based approach as Google.
    const expectedState = (req.session as any).oauthState;
    delete (req.session as any).oauthState;
    if (!expectedState || req.query.state !== expectedState) {
      res.redirect('/login.html?reason=invalid-state');
      return;
    }

    if (req.query.error) {
      console.error('Facebook auth error:', req.query.error);
      res.redirect('/login.html?reason=not-approved');
      return;
    }

    const code = req.query.code as string;
    if (!code) {
      res.redirect('/login.html?reason=not-approved');
      return;
    }

    const redirectUri = getFacebookRedirectUri(req);
    const fbUser = await exchangeFacebookCode(code, redirectUri);

    if (!fbUser.email) {
      res.redirect('/login.html?reason=no-email');
      return;
    }

    const result = await resolvePersonalSession(fbUser.email, fbUser.name, fbUser.id);
    if (!result.ok) {
      res.redirect(`/login.html?reason=not-approved&email=${encodeURIComponent(fbUser.email)}`);
      return;
    }

    req.session.user = result.sessionUser;
    // Redirect via login.html so BroadcastChannel can notify the waiting tab/PWA — the OAuth
    // may have completed in a Chrome Custom Tab or separate browser context on Android.
    const dest = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(`/login.html?fbcomplete=1&returnTo=${encodeURIComponent(dest)}`);
  } catch (error: any) {
    console.error('Error in Facebook auth callback:', error.message);
    res.redirect('/login.html?reason=not-approved');
  }
});

export = router;
