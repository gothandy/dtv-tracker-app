import express, { Request, Response, Router } from 'express';
import axios from 'axios';
/// <reference path="../types/express-session.d.ts" />
import { msalClient, AUTH_SCOPES, getRedirectUri } from '../services/auth-config';
import { profilesRepository } from '../services/repositories/profiles-repository';

const router: Router = express.Router();

// GET /auth/login — redirect to Microsoft login
router.get('/login', async (req: Request, res: Response) => {
  try {
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
    let role: 'admin' | 'checkin' | 'readonly' = 'readonly';
    if (adminUsers.includes(email.toLowerCase())) {
      role = 'admin';
    } else {
      const profiles = await profilesRepository.getAll();
      const hasProfile = profiles.some(p => p.User?.toLowerCase() === email.toLowerCase());
      role = hasProfile ? 'checkin' : 'readonly';
    }

    req.session.user = {
      id: profile.id,
      displayName: profile.displayName,
      email,
      role,
    };

    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (error: any) {
    console.error('Error in auth callback:', error.message);
    res.status(500).send('Authentication failed');
  }
});

// GET /auth/logout — clear session and redirect to Microsoft logout
router.get('/logout', (req: Request, res: Response) => {
  const postLogoutRedirect = `${req.protocol}://${req.get('host')}/`;
  req.session.destroy(() => {
    const logoutUrl = `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirect)}`;
    res.redirect(logoutUrl);
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
