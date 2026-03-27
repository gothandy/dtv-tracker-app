import MagicLoginStrategy from 'passport-magic-login';
import { sendEmail } from './graph-mail';

// Strategy instance shared between routes/auth/index.ts (passport.use) and
// routes/auth/magic.ts (magicLogin.send).
export const magicLogin = new MagicLoginStrategy({
  secret:      process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  callbackUrl: process.env.WEBSITE_HOSTNAME
    ? `https://${process.env.WEBSITE_HOSTNAME}/auth/magic/callback`
    : `http://localhost:${process.env.PORT || 3000}/auth/magic/callback`,
  jwtOptions:  { expiresIn: '15m' },
  sendMagicLink: async (destination, href) => {
    const html = `<p>Click the button below to sign in to DTV Tracker. This link expires in 15 minutes.</p>
                  <p><a href="${href}" style="display:inline-block;padding:12px 24px;background:#4FAF4A;color:white;border-radius:6px;text-decoration:none;font-weight:600;">Sign in to DTV Tracker</a></p>
                  <p style="color:#888;font-size:0.85em">If you didn't request this, you can safely ignore this email.</p>`;
    const text = `Click this link to sign in to DTV Tracker (expires in 15 minutes):\n\n${href}\n\nIf you didn't request this, you can safely ignore this email.`;
    await sendEmail(destination, 'Your DTV Tracker login link', html, text);
  },
  verify: (_payload, callback) => {
    // Payload passed through; profile lookup happens in the magic callback route.
    callback(null, _payload);
  },
});
