import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import jwt from 'jsonwebtoken';
import { sendEmail } from '../../services/graph-mail';
import { resolvePersonalSession } from '../../services/personal-auth';
import { createAuthToken } from '../../services/auth-store';

const router: Router = express.Router();

const AUTH_TTL_MS = parseInt(process.env.AUTH_BASIC_TTL_HOURS || '72', 10) * 60 * 60 * 1000;

function setAuthCookie(res: Response, rawToken: string): void {
  res.cookie('dtv-auth', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_TTL_MS,
  });
}

// POST /auth/magic/send — sign a short-lived JWT and email a click-through link
// Body: { destination: string, returnTo?: string }
router.post('/magic/send', async (req: Request, res: Response) => {
  const email = (req.body?.destination as string || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'A valid email address is required' });
    return;
  }

  if (!process.env.MAIL_SENDER) {
    res.status(503).json({ error: 'Magic link login is not configured on this server' });
    return;
  }

  const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  const token = jwt.sign({ email }, secret, { expiresIn: '15m' });

  const returnTo = req.body?.returnTo;
  const safeReturnTo = typeof returnTo === 'string' && returnTo.startsWith('/') && returnTo.length <= 200
    ? returnTo : null;

  // Build callback URL from the incoming request so it matches whatever domain the user is on
  // (custom domain, not the Azure default .azurewebsites.net hostname).
  const callbackBase = `${req.protocol}://${req.get('host')}/auth/magic/callback`;
  const callbackUrl = safeReturnTo
    ? `${callbackBase}?token=${token}&returnTo=${encodeURIComponent(safeReturnTo)}`
    : `${callbackBase}?token=${token}`;

  try {
    const html = `<p>Click the button below to sign in to DTV Tracker. This link expires in 15 minutes.</p>
                  <p><a href="${callbackUrl}" style="display:inline-block;padding:12px 24px;background:#4FAF4A;color:white;border-radius:6px;text-decoration:none;font-weight:600;">Sign in to DTV Tracker</a></p>
                  <p style="color:#888;font-size:0.85em">If you didn't request this, you can safely ignore this email.</p>`;
    const text = `Click this link to sign in to DTV Tracker (expires in 15 minutes):\n\n${callbackUrl}\n\nIf you didn't request this, you can safely ignore this email.`;
    await sendEmail(email, 'Your DTV Tracker sign-in link', html, text);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Magic] sendEmail error:', err.message);
    res.status(500).json({ error: 'Failed to send sign-in email. Please try again.' });
  }
});

// GET /auth/magic/callback — verify JWT, resolve profile, create auth token, set cookie
router.get('/magic/callback', async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.redirect('/login.html?reason=invalid-state');
    return;
  }

  const returnTo = req.query.returnTo as string | undefined;
  const dest = typeof returnTo === 'string' && returnTo.startsWith('/') && returnTo.length <= 200
    ? returnTo
    : (req.session.returnTo || process.env.FRONTEND_URL || '/');
  delete req.session.returnTo;

  let email: string;
  try {
    const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
    const payload = jwt.verify(token, secret) as { email: string };
    email = payload.email;
  } catch {
    res.redirect('/login.html?reason=invalid-state');
    return;
  }

  const result = await resolvePersonalSession(email, '', '');
  if (!result.ok) {
    res.redirect(`/login.html?reason=not-approved&email=${encodeURIComponent(email)}`);
    return;
  }

  let rawToken: string;
  try {
    rawToken = await createAuthToken(result.sessionUser.profileId!, req.headers['user-agent']);
  } catch (err: any) {
    console.error('[Magic] createAuthToken error:', err.message);
    res.redirect('/login.html?reason=invalid-state');
    return;
  }

  setAuthCookie(res, rawToken);
  const destWithNotice = dest.includes('?') ? `${dest}&flashKey=signed-in` : `${dest}?flashKey=signed-in`;
  res.redirect(destWithNotice);
});

export = router;
