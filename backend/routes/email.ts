import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { renderEmail } from '../services/email-renderer';
import { templatesRepository } from '../services/repositories/templates-repository';

const router: Router = express.Router();

function isLocalhost(req: Request): boolean {
  const host = req.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

// POST /api/email/render
// Renders a template from the Templates list with supplied vars and returns { subject, html, text }.
// For the sandbox's email page. Accessible from localhost (dev convenience) or when logged in as admin.
router.post('/render', async (req: Request, res: Response) => {
  const role = req.session?.user?.role;
  if (!isLocalhost(req) && role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { templateId, vars } = req.body as { templateId?: unknown; vars?: Record<string, unknown> };

  try {
    const template = (await templatesRepository.getAll()).find(t => t.ID === Number(templateId));
    if (!template) {
      res.status(400).json({ error: 'templateId is required' });
      return;
    }
    const result = await renderEmail(template, vars ?? {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export = router;
