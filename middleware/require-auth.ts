import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />

// GET paths accessible without authentication (no PII returned)
const PUBLIC_GET_PATHS = ['/api/stats', '/api/sessions', '/api/groups', '/api/tags', '/api/media'];

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' && PUBLIC_GET_PATHS.some(p => req.path.startsWith(p))) {
    next();
    return;
  }

  if (req.session.user) {
    next();
    return;
  }

  // API key auth for scheduled sync calls
  const apiKey = process.env.API_SYNC_KEY;
  if (apiKey && req.headers['x-api-key'] === apiKey && req.path.startsWith('/api/eventbrite/')) {
    next();
    return;
  }

  // API requests get 401 JSON
  if (req.path.startsWith('/api/')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  // Page requests get redirected to login
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
}
