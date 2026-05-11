import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { isPublicApiGet } from './public-api-get-paths';

const CHECKIN_ALLOWED_PATTERNS = [
  { method: 'PATCH', pattern: /^\/entries\/\d+$/ },           // check-in + set hours
  { method: 'PATCH', pattern: /^\/sessions\/[^/]+\/[^/]+$/ }, // edit session title/description
  { method: 'POST',  pattern: /^\/profiles\/[^/]+\/regulars$/ }, // add regular
  { method: 'PATCH', pattern: /^\/regulars\/\d+$/ },          // update regular (e.g. accompanying adult)
  { method: 'DELETE', pattern: /^\/regulars\/\d+$/ },         // remove regular
  { method: 'POST',  pattern: /^\/sessions\/[^/]+\/[^/]+\/entries$/ }, // add entry
  { method: 'POST',  pattern: /^\/sessions\/[^/]+\/[^/]+\/refresh$/ }, // refresh session
  { method: 'POST',  pattern: /^\/sessions\/[^/]+\/[^/]+\/stats$/ },   // recompute session stats
  { method: 'DELETE', pattern: /^\/sessions\/[^/]+\/[^/]+\/unchecked-entries$/ }, // remove no-shows
  { method: 'POST',  pattern: /^\/profiles$/ },               // create profile
  { method: 'PATCH', pattern: /^\/profiles\/[^/]+$/ },        // edit profile
  { method: 'POST',  pattern: /^\/profiles\/\d+\/consent$/ }, // collect consent
  { method: 'POST',  pattern: /^\/entries\/\d+\/photos$/ },   // upload photos to an entry
  { method: 'POST',  pattern: /^\/entries\/\d+\/notify$/ },  // send pre-session email preview
  { method: 'PATCH', pattern: /^\/media\/[^/]+$/ },            // update media item metadata (title, isPublic)
];

const SELFSERVICE_ALLOWED_PATTERNS = [
  { method: 'POST',   pattern: /^\/sessions\/[^/]+\/[^/]+\/entries$/ }, // self-register for a session
  { method: 'POST',   pattern: /^\/entries\/\d+\/photos$/ },            // upload photos to own entry
  { method: 'PATCH',  pattern: /^\/entries\/\d+$/ },                   // cancel own booking only; handler enforces
  { method: 'POST',   pattern: /^\/profiles\/\d+\/consent$/ },          // submit own consent; handler enforces ownership
];

// GET paths self-service users can access — mirrors the public (unauthenticated) allowlist in
// require-auth.ts plus own profile, own entry detail, and upload context. All other GETs are
// blocked to protect other volunteers' personal data (GDPR).
const SELFSERVICE_ALLOWED_GET_PATTERNS = [
  /^\/stats/,
  /^\/sessions(?!\/export)/,            // session list + detail — handler filters entries to own-only; excludes /sessions/export
  /^\/groups/,
  /^\/tags/,
  /^\/media/,
  /^\/entries\/\d+$/,                  // own entry detail by ID; handler enforces ownership
  /^\/entries\/\d+\/upload-context$/, // own entry upload context; handler enforces ownership
];

const ADMIN_ONLY_GET_PATTERNS = [
  /^\/sessions\/export\/?$/,
  /^\/records\/export\/?$/,
  /^\/entries\/?$/,
];

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = req.session.user?.role;

  // API key auth (scheduled sync) bypasses role checks
  if (!req.session.user && req.headers['x-api-key']) {
    next();
    return;
  }

  // Anonymous (or post-logout) public reads — same paths as require-auth; must not require a role
  if (isPublicApiGet(req)) {
    next();
    return;
  }

  // From here on, authenticated role is required for this request path
  if (!req.session.user) {
    res.status(403).json({ success: false, error: 'Not permitted' });
    return;
  }

  // Admin users pass through
  if (role === 'admin') {
    next();
    return;
  }

  // Self-service users: public-equivalent GET access + own profile + narrow write allowlist
  if (role === 'selfservice') {
    if (req.method === 'GET') {
      if (SELFSERVICE_ALLOWED_GET_PATTERNS.some(p => p.test(req.path))) {
        next();
        return;
      }
      // Own profile detail — profile slugs always end in a numeric ID (e.g. john-doe-123).
      // Excludes word-only paths like /profiles/export. Ownership enforced in the route handler.
      if (/^\/profiles\/[^/]+-\d+$/.test(req.path)) {
        next();
        return;
      }
      res.status(403).json({ success: false, error: 'Not permitted' });
      return;
    }
    if (SELFSERVICE_ALLOWED_PATTERNS.some(p => p.method === req.method && p.pattern.test(req.path))) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'Not permitted' });
    return;
  }

  // Check-in only — must match role exactly (stale sessions may still carry removed roles such as
  // `readonly`; those must never fall through into this allowlist).
  if (role === 'checkin') {
    if (req.method === 'GET') {
      if (ADMIN_ONLY_GET_PATTERNS.some(p => p.test(req.path))) {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }
      next();
      return;
    }
    if (CHECKIN_ALLOWED_PATTERNS.some(p => p.method === req.method && p.pattern.test(req.path))) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  // Unknown or legacy role (e.g. pre-deploy `readonly`) — deny; do not treat as check-in.
  res.status(403).json({ success: false, error: 'Not permitted' });
}
