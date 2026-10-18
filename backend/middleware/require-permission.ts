import { Request, Response, NextFunction, RequestHandler } from 'express';
import { can, type Permission } from '../../types/permissions';

/** Lets the request through only if the signed-in role has this permission (types/permissions.ts). */
export function requirePermission(permission: Permission): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (can(req.session.user?.role, permission)) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'Not permitted' });
  };
}
