import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import jwt from 'jsonwebtoken';
import { sendEmail } from '../../services/graph-mail';
import { resolvePersonalSession } from '../../services/personal-auth';
import { createAuthToken } from '../../services/auth-store';

const router: Router = express.Router();

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

  const code = String(Math.floor(1000 + Math.random() * 9000));
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  const token = jwt.sign({ email, code }, secret, { expiresIn: '15m' });

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
    const html = `<p>Your confirmation code is <strong style="font-size:1.2em">${code}</strong></p>
                  <p>Click the log-in link below to confirm your email and continue to DTV Tracker.</p>
                  <p><a href="${callbackUrl}" style="display:inline-block;padding:12px 24px;background:#4FAF4A;color:white;border-radius:6px;text-decoration:none;font-weight:600;">Log in with ${code}</a></p>
                  <p style="color:#888;font-size:0.85em">This link expires in 15 minutes.</p>
                  <p style="color:#888;font-size:0.85em">If you did not request this, or do not recognise the code, you can safely ignore this email.</p>`;
    const text = `Your confirmation code is ${code}\n\nClick this link to log in to DTV Tracker (expires in 15 minutes):\n\n${callbackUrl}\n\nIf you did not request this, or do not recognise the code, you can safely ignore this email.`;
    await sendEmail(email, `DTV Tracker confirmation code ${code}`, html, text);
    res.json({ ok: true, code });
  } catch (err: any) {
    console.error('[Magic] sendEmail error:', err.message);
    res.status(500).json({ error: 'Failed to send log-in email. Please try again.' });
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
  let code: string;
  try {
    const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
    const payload = jwt.verify(token, secret) as { email: string; code?: string };
    email = payload.email;
    code = payload.code ?? '';
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

  const displayName = result.sessionUser.displayName;
  const destWithFlash = dest.includes('?')
    ? `${dest}&flashKey=signed-in&flashName=${encodeURIComponent(displayName)}`
    : `${dest}?flashKey=signed-in&flashName=${encodeURIComponent(displayName)}`;
  setAuthCookie(res, rawToken);
  res.setHeader('Cache-Control', 'no-store');
  const safeDest = escapeHtml(encodeURI(destWithFlash));
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Log-in confirmed — DTV Tracker</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: white; border-radius: 8px; padding: 2rem; text-align: center;
            max-width: 360px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    h1 { color: #2d6a27; font-size: 1.4rem; margin: 0 0 0.75rem; }
    p { color: #555; font-size: 0.95rem; margin: 0 0 1rem; line-height: 1.5; }
    .subtle { font-size: 0.85rem; color: #888; }
    a { color: #2d6a27; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Log-in confirmed: ${escapeHtml(code)}</h1>
    <p>You are now logged in. You can close this window and return to your original tab.</p>
    <p class="subtle">Original tab unavailable? Open DTV Tracker <a href="${safeDest}">here</a>.</p>
  </div>
  <script>
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('dtv-auth');
      ch.postMessage({ type: 'auth-success', source: 'magic-link', ts: Date.now(), flashName: '${escapeHtml(displayName)}' });
      ch.close();
    }
  <\/script>
</body>
</html>`);
});

export = router;
