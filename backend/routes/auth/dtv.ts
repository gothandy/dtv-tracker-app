import { randomBytes } from 'crypto';
import express, { Request, Response, Router } from 'express';
import axios from 'axios';
/// <reference path="../../types/express-session.d.ts" />
import { msalClient, AUTH_SCOPES, getRedirectUri } from '../../services/auth-config';
import { profilesRepository } from '../../services/repositories/profiles-repository';
import { staffSessionUser } from '../../services/personal-auth';
import { createAuthToken, setLoginCookie } from '../../services/auth-store';
import { platform } from '../../config';

const router: Router = express.Router();

/**
 * Remembers the DTV account used last time on this device, so the next sign-in goes
 * straight to it (login_hint) even if the browser is also signed in to a work account.
 */
const LOGIN_HINT_COOKIE = 'dtv-login-hint';
const LOGIN_HINT_DAYS = 365;

/** Back to the login page with a reason (and Microsoft's message, if any) to show. */
function loginPageWithReason(reason: string, detail?: string, returnTo?: string): string {
  const params = new URLSearchParams({ reason });
  if (detail) params.set('detail', detail.slice(0, 300));
  if (returnTo && returnTo.startsWith('/')) params.set('returnTo', returnTo);
  return `/login?${params}`;
}

// GET /auth/login — redirect to DTV Account (Entra ID) login
router.get('/login', async (req: Request, res: Response) => {
  try {
    const returnTo = req.query.returnTo as string | undefined;
    if (returnTo && returnTo.startsWith('/')) {
      req.session.returnTo = returnTo;
    }
    // Checked on the callback, so a callback we didn't start is rejected.
    const state = randomBytes(16).toString('hex');
    req.session.authState = state;

    // domain_hint sends Microsoft to DTV's sign-in; login_hint picks the DTV account
    // used last time. No account picker, so a work account signed in to the same
    // browser isn't offered.
    const authCodeUrl = await msalClient().getAuthCodeUrl({
      scopes: AUTH_SCOPES,
      redirectUri: getRedirectUri(req),
      domainHint: 'dtv.org.uk',
      loginHint: req.cookies?.[LOGIN_HINT_COOKIE] || undefined,
      state,
    });
    res.redirect(authCodeUrl);
  } catch (error: any) {
    console.error('Error generating auth URL:', error.message);
    res.redirect(loginPageWithReason('microsoft-error', error.message));
  }
});

// GET /auth/callback — handle redirect from DTV Account (Entra ID)
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const savedReturnTo = req.session.returnTo;

    // Microsoft sent the person back with an error (e.g. they cancelled). Say so; don't loop.
    if (req.query.error) {
      const description = String(req.query.error_description || req.query.error);
      console.error('Auth error:', req.query.error, description);
      res.redirect(loginPageWithReason('microsoft-error', description, savedReturnTo));
      return;
    }

    const expectedState = req.session.authState;
    delete req.session.authState;
    if (!expectedState || req.query.state !== expectedState) {
      console.error('Auth callback: state missing or does not match');
      res.redirect(loginPageWithReason('microsoft-restart', undefined, savedReturnTo));
      return;
    }

    const code = req.query.code as string;
    if (!code) {
      res.status(400).send('Missing authorization code');
      return;
    }

    const tokenResponse = await msalClient().acquireTokenByCode({
      code,
      scopes: AUTH_SCOPES,
      redirectUri: getRedirectUri(req),
    });

    // Fetch user profile from Microsoft Graph
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
    });

    const graphProfile = graphResponse.data;
    const email = graphProfile.mail || graphProfile.userPrincipalName;

    // Remember this DTV account for next time on this device.
    res.cookie(LOGIN_HINT_COOKIE, email, {
      httpOnly: true,
      secure: !platform.isDevelopment,
      sameSite: 'lax',
      maxAge: LOGIN_HINT_DAYS * 24 * 60 * 60 * 1000,
    });

    const profiles = await profilesRepository.getAll();
    const matchedProfile = profiles.find(p => p.User?.toLowerCase() === email.toLowerCase());

    if (!matchedProfile) {
      req.session.destroy((destroyErr) => {
        if (destroyErr) console.error('Session destroy:', destroyErr.message);
        const q = 'reason=dtv-not-authorised';
        const path =
          savedReturnTo && savedReturnTo.startsWith('/')
            ? `/login?${q}&returnTo=${encodeURIComponent(savedReturnTo)}`
            : `/login?${q}`;
        res.redirect(path);
      });
      return;
    }

    // Record the sign-in in the Logins list, so it survives restarts and deploys.
    const rawToken = await createAuthToken(matchedProfile.ID, 'Microsoft', req.get('user-agent'));
    setLoginCookie(res, rawToken);

    delete req.session.returnTo;
    req.session.user = staffSessionUser(matchedProfile, email, new Date().toISOString());

    const returnToPath = savedReturnTo && savedReturnTo.startsWith('/') ? savedReturnTo : '/';
    const returnToWithNotice = returnToPath.includes('?')
      ? `${returnToPath}&flashKey=signed-in`
      : `${returnToPath}?flashKey=signed-in`;
    res.redirect(returnToWithNotice);
  } catch (error: any) {
    console.error('Error in auth callback:', error.message);
    res.redirect(loginPageWithReason('microsoft-error', error.message));
  }
});

export = router;
