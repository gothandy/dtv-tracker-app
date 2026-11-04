import { Request, Response, NextFunction, RequestHandler } from 'express';
import { can, type Permission } from '../../types/permissions';

/** Lets the request through only if the signed-in role has this permission (types/permissions.ts). */
export function requirePermission(permission: Permission): RequestHandler & { permission: Permission } {
  const handler = (req: Request, res: Response, next: NextFunction) => {
    if (can(req.session.user?.role, permission)) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'Not permitted' });
  };
  // Named on the handler so tests can check every route has a permission (route-permissions.test.ts)
  return Object.assign(handler, { permission });
}
