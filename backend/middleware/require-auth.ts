import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { isPublicApiGet } from './public-api-get-paths';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isPublicApiGet(req)) {
    next();
    return;
  }

  if (req.session.user) {
    next();
    return;
  }

  // API key auth for scheduled sync calls (Eventbrite sync + stats refresh)
  const apiKey = process.env.API_SYNC_KEY;
  const API_KEY_PATHS = ['/api/eventbrite/', '/api/sessions/refresh-stats', '/api/profiles/refresh-stats', '/api/backup/'];
  if (apiKey && req.headers['x-api-key'] === apiKey && API_KEY_PATHS.some(p => req.path.startsWith(p))) {
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
  res.redirect('/login');
}
