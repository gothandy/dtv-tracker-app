import express, { Request, Response, Router } from 'express';
import axios from 'axios';
/// <reference path="../../types/express-session.d.ts" />
import { msalClient, AUTH_SCOPES, getRedirectUri } from '../../services/auth-config';
import { profilesRepository } from '../../services/repositories/profiles-repository';
import { profileSlug } from '../../services/data-layer';
import { PROFILE_STATS } from '../../services/field-names';

const router: Router = express.Router();

// GET /auth/login — redirect to DTV Account (Entra ID) login
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
      domainHint: 'dtv.org.uk',
    });
    res.redirect(authCodeUrl);
  } catch (error: any) {
    console.error('Error generating auth URL:', error.message);
    res.status(500).send('Authentication error');
  }
});

// GET /auth/callback — handle redirect from DTV Account (Entra ID)
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

    const graphProfile = graphResponse.data;
    const email = graphProfile.mail || graphProfile.userPrincipalName;

    const adminUsers = (process.env.ADMIN_USERS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const profiles = await profilesRepository.getAll();
    const matchedProfile = profiles.find(p => p.User?.toLowerCase() === email.toLowerCase());
    const savedReturnTo = req.session.returnTo;

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

    const role: 'admin' | 'checkin' = adminUsers.includes(email.toLowerCase()) ? 'admin' : 'checkin';

    let profileStats: NonNullable<typeof req.session.user>['profileStats'] | undefined;
    if (matchedProfile[PROFILE_STATS]) {
      try { profileStats = JSON.parse(matchedProfile[PROFILE_STATS]); } catch { /* ignore */ }
    }

    delete req.session.returnTo;

    req.session.user = {
      id: String(matchedProfile.ID),
      displayName: matchedProfile.Title || email,
      email,
      role,
      profileSlug: profileSlug(matchedProfile.Title, matchedProfile.ID),
      profileId: matchedProfile.ID,
      freshAuthAt: new Date().toISOString(),
      profileStats,
    };

    const returnToPath = savedReturnTo && savedReturnTo.startsWith('/') ? savedReturnTo : '/';
    const returnToWithNotice = returnToPath.includes('?')
      ? `${returnToPath}&flashKey=signed-in`
      : `${returnToPath}?flashKey=signed-in`;
    res.redirect(returnToWithNotice);
  } catch (error: any) {
    console.error('Error in auth callback:', error.message);
    res.status(500).send('Authentication failed');
  }
});

export = router;
