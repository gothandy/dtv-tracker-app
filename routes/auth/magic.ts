import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import jwt from 'jsonwebtoken';
import { sendEmail } from '../../services/graph-mail';
import { resolvePersonalSession } from '../../services/personal-auth';
import { createAuthToken } from '../../services/auth-store';
import { isEmailRateLimited, recordEmailSent } from '../../services/email-rate-limiter';

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

  if (isEmailRateLimited()) {
    res.status(429).json({ error: "We've sent too many sign-in emails recently. Please wait a while and try again." });
    return;
  }

  const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  const token = jwt.sign({ email }, secret, { expiresIn: '15m' });

  const tz = process.env.SHAREPOINT_TIMEZONE || 'Europe/London';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });

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
    const html = `<p>Your link expires at <strong style="font-size:1.5em;letter-spacing:0.05em">${expiresAt}</strong></p>
                  <p>Click the log-in link below to continue to DTV Tracker.</p>
                  <p><a href="${callbackUrl}" style="display:inline-block;padding:12px 24px;background:#4FAF4A;color:white;border-radius:6px;text-decoration:none;font-weight:600;">Log in to DTV Tracker</a></p>
                  <p style="color:#888;font-size:0.85em">If you did not request this, you can safely ignore this email.</p>`;
    const text = `Your link expires at ${expiresAt}.\n\nClick this link to log in to DTV Tracker:\n\n${callbackUrl}\n\nIf you did not request this, you can safely ignore this email.`;
    await sendEmail({ to: email, subject: `DTV Tracker sign-in link — expires ${expiresAt}`, html, text });
    recordEmailSent();
    res.json({ ok: true, expiresAt });
  } catch (err: any) {
    console.error('[Magic] sendEmail error:', err.message);
    res.status(500).json({ error: 'Failed to send log-in email. Please try again.' });
  }
});

// GET /auth/magic/callback — verify JWT, resolve profile, create auth token, set cookie, redirect
router.get('/magic/callback', async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.redirect('/login?reason=invalid-state');
    return;
  }

  const returnTo = req.query.returnTo as string | undefined;
  const dest = typeof returnTo === 'string' && returnTo.startsWith('/') && returnTo.length <= 200
    ? returnTo
    : (req.session.returnTo || '/');
  delete req.session.returnTo;

  let email: string;
  try {
    const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
    const payload = jwt.verify(token, secret) as { email: string };
    email = payload.email;
  } catch {
    res.redirect('/login?reason=invalid-state');
    return;
  }

  const result = await resolvePersonalSession(email, '', '');
  if (!result.ok) {
    res.redirect(`/login?reason=not-approved&email=${encodeURIComponent(email)}`);
    return;
  }

  let rawToken: string;
  try {
    rawToken = await createAuthToken(result.sessionUser.profileId!, req.headers['user-agent']);
  } catch (err: any) {
    console.error('[Magic] createAuthToken error:', err.message);
    res.redirect('/login?reason=invalid-state');
    return;
  }

  const displayName = result.sessionUser.displayName;
  const destWithFlash = dest.includes('?')
    ? `${dest}&flashKey=signed-in&flashName=${encodeURIComponent(displayName)}`
    : `${dest}?flashKey=signed-in&flashName=${encodeURIComponent(displayName)}`;

  setAuthCookie(res, rawToken);
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(destWithFlash);
});

export = router;
