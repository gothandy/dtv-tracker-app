import express, { Request, Response, Router } from 'express';
import axios from 'axios';
import { randomBytes, createHmac } from 'crypto';
/// <reference path="../types/express-session.d.ts" />
import { msalClient, AUTH_SCOPES, getRedirectUri } from '../services/auth-config';
import { getGoogleAuthUrl, getGoogleRedirectUri, exchangeGoogleCode } from '../services/google-auth';
import { getFacebookAuthUrl, getFacebookRedirectUri, exchangeFacebookCode } from '../services/facebook-auth';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { profileSlug } from '../services/data-layer';

const router: Router = express.Router();

// HMAC-signed state for Facebook OAuth CSRF — stateless, works across multiple server instances.
// The state encodes {returnTo, ts, nonce} signed with SESSION_SECRET so it can't be forged.
const FB_STATE_SECRET = process.env.SESSION_SECRET || 'dtv-fb-state-secret';

function signFacebookState(returnTo: string | undefined): string {
  const payload = Buffer.from(JSON.stringify({ r: returnTo || '/', ts: Date.now(), n: randomBytes(8).toString('hex') })).toString('base64url');
  const sig = createHmac('sha256', FB_STATE_SECRET).update(payload).digest('hex').slice(0, 16);
  return `${payload}.${sig}`;
}

function verifyFacebookState(state: string): { returnTo: string } | null {
  const dot = state.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac('sha256', FB_STATE_SECRET).update(payload).digest('hex').slice(0, 16);
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() - data.ts > 10 * 60 * 1000) return null; // 10-minute expiry
    return { returnTo: data.r || '/' };
  } catch {
    return null;
  }
}

// GET /auth/login — redirect to Microsoft login
router.get('/login', async (req: Request, res: Response) => {
  try {
    const returnTo = req.query.returnTo as string | undefined;
    if (returnTo && returnTo.startsWith('/')) {
      req.session.returnTo = returnTo;
    }
    const authCodeUrl = await msalClient.getAuthCodeUrl({
      scopes: AUTH_SCOPES,
      redirectUri: getRedirectUri(req),
      prompt: 'select_account',
    });
    res.redirect(authCodeUrl);
  } catch (error: any) {
    console.error('Error generating auth URL:', error.message);
    res.status(500).send('Authentication error');
  }
});

// GET /auth/callback — handle redirect from Microsoft
router.get('/callback', async (req: Request, res: Response) => {
  try {
    if (req.query.error) {
      console.error('Auth error:', req.query.error, req.query.error_description);
      res.redirect('/auth/login');
      return;
    }

    const code = req.query.code as string;
    if (!code) {
      res.status(400).send('Missing authorization code');
      return;
    }

    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      scopes: AUTH_SCOPES,
      redirectUri: getRedirectUri(req),
    });

    // Fetch user profile from Microsoft Graph
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
    });

    const profile = graphResponse.data;
    const email = profile.mail || profile.userPrincipalName;

    const adminUsers = (process.env.ADMIN_USERS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const profiles = await profilesRepository.getAll();
    const matchedProfile = profiles.find(p => p.User?.toLowerCase() === email.toLowerCase());

    let role: 'admin' | 'checkin' | 'readonly' = 'readonly';
    if (adminUsers.includes(email.toLowerCase())) {
      role = 'admin';
    } else if (matchedProfile) {
      role = 'checkin';
    }

    req.session.user = {
      id: profile.id,
      displayName: profile.displayName,
      email,
      role,
      profileSlug: matchedProfile ? profileSlug(matchedProfile.Title, matchedProfile.ID) : undefined,
      profileId: matchedProfile?.ID,
    };

    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (error: any) {
    console.error('Error in auth callback:', error.message);
    res.status(500).send('Authentication failed');
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────

// Resolves a volunteer login by matching the OAuth email against Profile.Email.
// Used by all volunteer OAuth providers (Google, and future providers).
async function resolveVolunteerSession(email: string, displayName: string, oauthId: string): Promise<{
  ok: true;
  sessionUser: NonNullable<import('express-session').SessionData['user']>;
} | { ok: false }> {
  const adminUsers = (process.env.ADMIN_USERS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  const profiles = await profilesRepository.getAll();

  const matchedProfiles = profiles.filter(p => p.Email?.toLowerCase() === email.toLowerCase());
  if (matchedProfiles.length === 0) return { ok: false };

  const primary = matchedProfiles[0];

  // Detect if this email also has a trusted (Microsoft) account, and which role it would get.
  // Check the profile's linked User field (Microsoft username) as well as the Facebook email itself.
  let trustedRole: 'admin' | 'checkin' | undefined;
  const linkedMicrosoftEmail = primary.User?.toLowerCase();
  if (adminUsers.includes(email.toLowerCase()) || (linkedMicrosoftEmail && adminUsers.includes(linkedMicrosoftEmail))) {
    trustedRole = 'admin';
  } else if (primary.User) {
    trustedRole = 'checkin';
  }

  return {
    ok: true,
    sessionUser: {
      id: oauthId,
      displayName: displayName || primary.Title || email,
      email,
      role: 'selfservice',
      profileSlug: profileSlug(primary.Title, primary.ID),
      profileId: primary.ID,
      profileIds: matchedProfiles.map(p => p.ID),
      trustedRole,
    },
  };
}

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
    const result = await resolveVolunteerSession(googleUser.email, googleUser.name, googleUser.id);

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
    res.redirect('/login.html?reason=not-approved');
  }
});

// GET /auth/facebook/login — redirect to Facebook OAuth
router.get('/facebook/login', (req: Request, res: Response) => {
  const returnTo = req.query.returnTo as string | undefined;
  const state = signFacebookState(returnTo?.startsWith('/') ? returnTo : undefined);
  const redirectUri = getFacebookRedirectUri(req);
  res.redirect(getFacebookAuthUrl(redirectUri, state));
});

// GET /auth/facebook/callback — handle redirect from Facebook
router.get('/facebook/callback', async (req: Request, res: Response) => {
  try {
    // Verify CSRF state — signed token, no server-side storage needed, works across instances.
    const pending = verifyFacebookState(req.query.state as string || '');
    if (!pending) {
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

    const result = await resolveVolunteerSession(fbUser.email, fbUser.name, fbUser.id);

    if (!result.ok) {
      res.redirect(`/login.html?reason=not-approved&email=${encodeURIComponent(fbUser.email)}`);
      return;
    }

    req.session.user = result.sessionUser;
    // Redirect via login.html so BroadcastChannel can notify the PWA (which may be waiting
    // on a different browser context after Android routed the Facebook OAuth to the Facebook app).
    const dest = pending.returnTo || '/';
    res.redirect(`/login.html?fbcomplete=1&returnTo=${encodeURIComponent(dest)}`);
  } catch (error: any) {
    console.error('Error in Facebook auth callback:', error.message);
    res.redirect('/login.html?reason=not-approved');
  }
});

// ─── Shared ───────────────────────────────────────────────────────────────────

// GET /auth/logout — clear app session and return to homepage (no Microsoft logout)
router.get('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// GET /auth/providers — return which OAuth providers are configured
router.get('/providers', (req: Request, res: Response) => {
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
