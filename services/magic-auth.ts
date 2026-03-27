import MagicLoginStrategy from 'passport-magic-login';
import nodemailer from 'nodemailer';

const smtpTransport = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Strategy instance shared between routes/auth/index.ts (passport.use) and
// routes/auth/magic.ts (magicLogin.send).
export const magicLogin = new MagicLoginStrategy({
  secret:      process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  callbackUrl: '/auth/magic/callback',
  jwtOptions:  { expiresIn: '15m' },
  sendMagicLink: async (destination, href) => {
    await smtpTransport.sendMail({
      from:    process.env.SMTP_FROM || 'DTV Tracker <noreply@dtv.org.uk>',
      to:      destination,
      subject: 'Your DTV Tracker login link',
      text:    `Click this link to sign in to DTV Tracker (expires in 15 minutes):\n\n${href}\n\nIf you didn't request this, you can safely ignore this email.`,
      html:    `<p>Click the button below to sign in to DTV Tracker. This link expires in 15 minutes.</p>
                <p><a href="${href}" style="display:inline-block;padding:12px 24px;background:#4FAF4A;color:white;border-radius:6px;text-decoration:none;font-weight:600;">Sign in to DTV Tracker</a></p>
                <p style="color:#888;font-size:0.85em">If you didn't request this, you can safely ignore this email.</p>`,
    });
  },
  verify: (_payload, callback) => {
    // Payload passed through; profile lookup happens in the magic callback route.
    callback(null, _payload);
  },
});
