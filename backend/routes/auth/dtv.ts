import { randomBytes } from 'crypto';
import express, { Request, Response, Router } from 'express';
import { CryptoProvider } from '@azure/msal-node';
/// <reference path="../../types/express-session.d.ts" />
import { msalClient, AUTH_SCOPES, getRedirectUri } from '../../services/auth-config';
import { profilesRepository } from '../../services/repositories/profiles-repository';
import { staffSessionUser } from '../../services/personal-auth';
import {
  createAuthToken, setLoginCookie, endSignInOnThisBrowser, LOGIN_HINT_COOKIE, LOGOUT_HINT_COOKIE,
} from '../../services/auth-store';
import { safeReturnPath } from '../../services/safe-return';
import { platform, LOGIN_HOURS } from '../../config';

const router: Router = express.Router();
const pkce = new CryptoProvider();

const LOGIN_HINT_DAYS = 365;

/** Back to the login page with a reason (and Microsoft's message, if any) to show. */
function signInPageWithReason(reason: string, detail?: string, returnTo?: string): string {
  const params = new URLSearchParams({ reason });
  if (detail) params.set('detail', detail.slice(0, 300));
  const safe = safeReturnPath(returnTo);
  if (safe) params.set('returnTo', safe);
  return `/login?${params}`;
}

/** Start a fresh session (new ID) for the signed-in person, so an ID from before sign-in can't be reused. */
function newSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => req.session.regenerate(err => (err ? reject(err) : resolve())));
}

// GET /auth/sign-in — start a Microsoft (DTV account) sign-in
router.get('/sign-in', async (req: Request, res: Response) => {
  try {
    const returnTo = safeReturnPath(req.query.returnTo);
    if (returnTo) req.session.returnTo = returnTo;

    // Both checked when Microsoft sends the person back: `state` proves we started this
    // sign-in; the PKCE verifier proves the sign-in code is being redeemed by us.
    const state = randomBytes(16).toString('hex');
    const { verifier, challenge } = await pkce.generatePkceCodes();
    req.session.authState = state;
    req.session.pkceVerifier = verifier;

    // domain_hint sends Microsoft to DTV's sign-in; login_hint picks the DTV account
    // used last time. No account picker, so a work account signed in to the same
    // browser isn't offered.
    const authCodeUrl = await msalClient().getAuthCodeUrl({
      scopes: AUTH_SCOPES,
      redirectUri: getRedirectUri(req),
      domainHint: 'dtv.org.uk',
      loginHint: req.cookies?.[LOGIN_HINT_COOKIE] || undefined,
      state,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
    });
    res.redirect(authCodeUrl);
  } catch (error: any) {
    console.error('Error generating auth URL:', error.message);
    res.redirect(signInPageWithReason('microsoft-error', error.message));
  }
});

// GET /auth/signed-in — Microsoft returns here after sign-in (a registered redirect URI)
router.get('/signed-in', async (req: Request, res: Response) => {
  try {
    const savedReturnTo = safeReturnPath(req.session.returnTo);

    // Microsoft sent the person back with an error (e.g. they cancelled). Say so; don't loop.
    if (req.query.error) {
      const description = String(req.query.error_description || req.query.error);
      console.error('Auth error:', req.query.error, description);
      res.redirect(signInPageWithReason('microsoft-error', description, savedReturnTo));
      return;
    }

    const expectedState = req.session.authState;
    const pkceVerifier = req.session.pkceVerifier;
    delete req.session.authState;
    delete req.session.pkceVerifier;
    if (!expectedState || !pkceVerifier || req.query.state !== expectedState) {
      console.error('Auth callback: state missing or does not match');
      res.redirect(signInPageWithReason('microsoft-restart', undefined, savedReturnTo));
      return;
    }

    const code = req.query.code as string;
    if (!code) {
      res.redirect(signInPageWithReason('microsoft-restart', undefined, savedReturnTo));
      return;
    }

    const tokenResponse = await msalClient().acquireTokenByCode({
      code,
      scopes: AUTH_SCOPES,
      redirectUri: getRedirectUri(req),
      codeVerifier: pkceVerifier,
    });

    // Who signed in, from the sign-in token itself. The DTV address can appear as the
    // email claim or the account's sign-in name; Profile `User` may hold either.
    const claims = (tokenResponse.idTokenClaims ?? {}) as Record<string, unknown>;
    const candidates = [claims.email, claims.preferred_username, claims.upn]
      .filter((v): v is string => typeof v === 'string' && v.includes('@'))
      .map(v => v.toLowerCase());

    const profiles = await profilesRepository.getAll();
    const matchedProfile = profiles.find(p => p.User && candidates.includes(p.User.toLowerCase()));

    if (!matchedProfile) {
      console.error('Auth callback: no profile linked to', candidates.join(', ') || '(no email in token)');
      // Access refused: end any earlier sign-in in this browser too, and don't steer the
      // next attempt back to an account that isn't linked to a profile.
      await endSignInOnThisBrowser(req, res);
      res.clearCookie(LOGIN_HINT_COOKIE);
      req.session.destroy((destroyErr) => {
        if (destroyErr) console.error('Session destroy:', destroyErr.message);
        res.redirect(signInPageWithReason('dtv-not-authorised', undefined, savedReturnTo));
      });
      return;
    }
    const email = matchedProfile.User!.toLowerCase();

    const cookieOptions = { httpOnly: true, secure: !platform.isLocal, sameSite: 'lax' as const };
    // Remember this DTV account for next time on this device (only once it's allowed in).
    res.cookie(LOGIN_HINT_COOKIE, email, { ...cookieOptions, maxAge: LOGIN_HINT_DAYS * 24 * 60 * 60 * 1000 });
    // Lets sign-out tell Microsoft exactly which account to sign out (needs the
    // login_hint optional claim on the app registration).
    if (typeof claims.login_hint === 'string') {
      res.cookie(LOGOUT_HINT_COOKIE, claims.login_hint, { ...cookieOptions, maxAge: LOGIN_HOURS * 60 * 60 * 1000 });
    }

    // Record the sign-in in the Logins list, so it survives restarts and deploys.
    const rawToken = await createAuthToken(matchedProfile.ID, 'Microsoft', email, req.get('user-agent'));
    setLoginCookie(res, rawToken);

    await newSession(req);
    req.session.user = staffSessionUser(matchedProfile, email, new Date().toISOString());

    const returnToPath = savedReturnTo ?? '/';
    const returnToWithNotice = returnToPath.includes('?')
      ? `${returnToPath}&flashKey=signed-in`
      : `${returnToPath}?flashKey=signed-in`;
    res.redirect(returnToWithNotice);
  } catch (error: any) {
    console.error('Error in auth callback:', error.message);
    res.redirect(signInPageWithReason('microsoft-error', error.message));
  }
});

// Old return address. A sign-in started just before a deploy comes back here: ask the
// person to sign in again rather than show "not found". Remove with #283.
router.get('/callback', (_req: Request, res: Response) => {
  res.redirect(signInPageWithReason('microsoft-restart'));
});

export = router;
