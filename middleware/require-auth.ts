import { Request, Response, NextFunction } from 'express';
/// <reference path="../types/express-session.d.ts" />

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.user) {
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
