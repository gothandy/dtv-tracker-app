import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { renderEmail } from '../services/email-renderer';

const router: Router = express.Router();

function isLocalhost(req: Request): boolean {
  const host = req.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

// POST /api/email/render
// Renders an email template with supplied vars and returns { subject, html, text }.
// Accessible from localhost (dev convenience) or when logged in as admin.
router.post('/render', async (req: Request, res: Response) => {
  const role = req.session?.user?.role;
  if (!isLocalhost(req) && role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { template, vars } = req.body as { template?: string; vars?: Record<string, unknown> };
  if (!template || typeof template !== 'string') {
    res.status(400).json({ error: 'template is required' });
    return;
  }

  try {
    const result = await renderEmail(template, vars ?? {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export = router;
