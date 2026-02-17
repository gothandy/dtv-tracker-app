import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />

const CHECKIN_ALLOWED_PATTERNS = [
  { method: 'PATCH', pattern: /^\/entries\/\d+$/ },           // check-in + set hours
  { method: 'PATCH', pattern: /^\/sessions\/[^/]+\/[^/]+$/ }, // edit session title/description
  { method: 'POST',  pattern: /^\/profiles\/[^/]+\/regulars$/ }, // add regular
  { method: 'DELETE', pattern: /^\/regulars\/\d+$/ },         // remove regular
  { method: 'POST',  pattern: /^\/sessions\/[^/]+\/[^/]+\/entries$/ }, // add entry
  { method: 'POST',  pattern: /^\/profiles$/ },               // create profile
  { method: 'PATCH', pattern: /^\/profiles\/[^/]+$/ },        // edit profile
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
