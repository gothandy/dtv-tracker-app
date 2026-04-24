import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />
import { sendEmail } from '../../services/graph-mail';
import { resolvePersonalSession } from '../../services/personal-auth';
import { createAuthToken } from '../../services/auth-store';
import { isEmailRateLimited, recordEmailSent } from '../../services/email-rate-limiter';

const router: Router = express.Router();

interface CodeEntry { code: string; expires: number; attempts: number }
const codeStore = new Map<string, CodeEntry>();
const MAX_ATTEMPTS = 5;
const CODE_TTL_MS = 15 * 60 * 1000;
const AUTH_TTL_MS = parseInt(process.env.AUTH_BASIC_TTL_HOURS || '72', 10) * 60 * 60 * 1000;

function setAuthCookie(res: Response, rawToken: string): void {
  res.cookie('dtv-auth', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_TTL_MS,
  });
}

type CodeCheckResult =
  | { ok: true; displayName: string }
  | { ok: false; status: number; error: string };

async function resolveVerifyCode(email: string, code: string, userAgent?: string, res?: Response): Promise<CodeCheckResult> {
  const entry = codeStore.get(email);
  if (!entry || Date.now() > entry.expires) {
    codeStore.delete(email);
    return { ok: false, status: 401, error: 'That code has expired or could not be found. Request a new code and try again.' };
  }

  entry.attempts++;
  if (entry.attempts > MAX_ATTEMPTS) {
    codeStore.delete(email);
    return { ok: false, status: 401, error: 'Too many incorrect attempts. Request a new code to continue.' };
  }

  if (entry.code !== code) {
    return { ok: false, status: 401, error: 'That code does not match. Check the 4 digits and try again.' };
  }

  codeStore.delete(email);

  const result = await resolvePersonalSession(email, '', '');
  if (!result.ok) {
    return { ok: false, status: 401, error: 'No account found for that email address.' };
  }

  let rawToken: string;
  try {
    rawToken = await createAuthToken(result.sessionUser.profileId!, userAgent);
  } catch (err: any) {
    console.error('[Verify] createAuthToken error:', err.message);
    return { ok: false, status: 500, error: 'Login failed. Please try again.' };
  }

  if (res) {
    setAuthCookie(res, rawToken);
    res.setHeader('Cache-Control', 'no-store');
  }
  return { ok: true, displayName: result.sessionUser.displayName };
}

// POST /auth/verify/send — generate a 4-digit code, store it, send it by email
// Body: { destination: string, returnTo?: string }
router.post('/verify/send', async (req: Request, res: Response) => {
  const email = (req.body?.destination as string || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'A valid email address is required' });
    return;
  }

  if (!process.env.MAIL_SENDER) {
    res.status(503).json({ error: 'Verification code login is not configured on this server' });
    return;
  }

  if (isEmailRateLimited()) {
    res.status(429).json({ error: "We've sent too many sign-in emails recently. Please wait a while and try again." });
    return;
  }

  const code = String(Math.floor(1000 + Math.random() * 9000));
  // One code per email — delete any previous entry (expired or not) before storing the new one.
  // Expired entries for abandoned requests stay in the map until the same email sends again or
  // /check is called; at volunteer-app scale this is acceptable without a sweep timer.
  codeStore.delete(email);
  codeStore.set(email, { code, expires: Date.now() + CODE_TTL_MS, attempts: 0 });

  const returnTo = req.body?.returnTo;
  const safeReturnTo = typeof returnTo === 'string' && returnTo.startsWith('/') && returnTo.length <= 200
    ? returnTo : null;

  // Link in the email opens the login page with code pre-filled — user reviews and hits enter.
  const base = `${req.protocol}://${req.get('host')}`;
  const loginUrl = `${base}/login`;
  const callbackUrl = safeReturnTo
    ? `${loginUrl}?method=code&email=${encodeURIComponent(email)}&code=${code}&returnTo=${encodeURIComponent(safeReturnTo)}`
    : `${loginUrl}?method=code&email=${encodeURIComponent(email)}&code=${code}`;

  try {
    const html = `<p style="font-size:2em;font-weight:700;letter-spacing:0.1em">${code}</p>
                  <p>Your verification code expires in 15 minutes.</p>
                  <p>Return to DTV Tracker and enter your code, or click the button below.</p>
                  <p><a href="${callbackUrl}" style="display:inline-block;padding:12px 24px;background:#4FAF4A;color:white;border-radius:6px;text-decoration:none;font-weight:600;">Log in with ${code}</a></p>
                  <p style="color:#888;font-size:0.85em">If you did not request this, you can safely ignore this email.</p>`;
    const text = `Your verification code is ${code}\n\nThis code expires in 15 minutes. Return to DTV Tracker and enter your code, or use this link:\n\n${callbackUrl}\n\nIf you did not request this, you can safely ignore this email.`;
    await sendEmail({ to: email, subject: `DTV Tracker verification code ${code}`, html, text });
    recordEmailSent();
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Verify] sendEmail error:', err.message);
    res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
});

// POST /auth/verify/check — verify a code entered in the browser tab
// Body: { email: string, code: string }
router.post('/verify/check', async (req: Request, res: Response) => {
  const email = (req.body?.email as string || '').trim().toLowerCase();
  const code = (req.body?.code as string || '').trim();

  if (!email || !code) {
    res.status(400).json({ error: 'Email and code are required' });
    return;
  }

  const result = await resolveVerifyCode(email, code, req.headers['user-agent'], res);
  if (result.ok) {
    res.json({ ok: true, flashName: result.displayName });
  } else {
    res.status(result.status).json({ error: result.error });
  }
});

export = router;
