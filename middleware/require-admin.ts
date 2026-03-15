import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />

const CHECKIN_ALLOWED_PATTERNS = [
  { method: 'PATCH', pattern: /^\/entries\/\d+$/ },           // check-in + set hours
  { method: 'PATCH', pattern: /^\/sessions\/[^/]+\/[^/]+$/ }, // edit session title/description
  { method: 'POST',  pattern: /^\/profiles\/[^/]+\/regulars$/ }, // add regular
  { method: 'DELETE', pattern: /^\/regulars\/\d+$/ },         // remove regular
  { method: 'POST',  pattern: /^\/sessions\/[^/]+\/[^/]+\/entries$/ }, // add entry
  { method: 'POST',  pattern: /^\/sessions\/[^/]+\/[^/]+\/refresh$/ }, // refresh session
  { method: 'POST',  pattern: /^\/profiles$/ },               // create profile
  { method: 'PATCH', pattern: /^\/profiles\/[^/]+$/ },        // edit profile
  { method: 'POST',  pattern: /^\/entries\/\d+\/photos$/ },   // upload photos to an entry
  { method: 'PATCH', pattern: /^\/media\/[^/]+$/ },            // update media item metadata (title, isPublic)
];

const SELFSERVICE_ALLOWED_PATTERNS = [
  { method: 'POST',   pattern: /^\/sessions\/[^/]+\/[^/]+\/entries$/ }, // self-register for a session
  { method: 'POST',   pattern: /^\/entries\/\d+\/photos$/ },            // upload photos to own entry
  { method: 'DELETE', pattern: /^\/entries\/\d+$/ },                    // delete own entry; handler enforces ownership
];

// GET paths self-service users can access — mirrors the public (unauthenticated) allowlist in
// require-auth.ts plus own profile, own entry detail, and upload context. All other GETs are
// blocked to protect other volunteers' personal data (GDPR).
const SELFSERVICE_ALLOWED_GET_PATTERNS = [
  /^\/stats/,
  /^\/sessions/,                       // session list + detail — handler filters entries to own-only
  /^\/groups/,
  /^\/tags/,
  /^\/media/,
  /^\/entries\/\d+$/,                  // own entry detail by ID; handler enforces ownership
  /^\/entries\/\d+\/upload-context$/, // own entry upload context; handler enforces ownership
];

const ADMIN_ONLY_GET_PATTERNS = [
  /^\/sessions\/export$/,
  /^\/records\/export$/,
];

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = req.session.user?.role;

  // API key auth (scheduled sync) bypasses role checks
  if (!req.session.user && req.headers['x-api-key']) {
    next();
    return;
  }

  // Admin users pass through
  if (role === 'admin') {
    next();
    return;
  }

  // Read Only users: allow GETs (except exports), block all writes
  if (role === 'readonly') {
    if (req.method === 'GET' && !ADMIN_ONLY_GET_PATTERNS.some(p => p.test(req.path))) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'Read only access' });
    return;
  }

  // Self-service users: public-equivalent GET access + own profile + narrow write allowlist
  if (role === 'selfservice') {
    if (req.method === 'GET') {
      if (SELFSERVICE_ALLOWED_GET_PATTERNS.some(p => p.test(req.path))) {
        next();
        return;
      }
      // Own profiles — allow primary and any linked profiles (same email, multiple profiles)
      // The route handler returns public-safe data; ownership of the email is enforced at login
      if (/^\/profiles\/[^/]+$/.test(req.path)) {
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

  // Block admin-only GET endpoints
  if (req.method === 'GET') {
    if (ADMIN_ONLY_GET_PATTERNS.some(p => p.test(req.path))) {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }
    next();
    return;
  }

  // Allow specific write operations for Check In Only
  if (CHECKIN_ALLOWED_PATTERNS.some(p => p.method === req.method && p.pattern.test(req.path))) {
    next();
    return;
  }

  // Block all other write operations
  res.status(403).json({ success: false, error: 'Admin access required' });
}
