import express, { Request, Response, Router } from 'express';
/// <reference path="../../types/express-session.d.ts" />

const router: Router = express.Router();

// POST /auth/magic/send — send magic login link to email address
// Body: { "destination": "user@example.com", "returnTo"?: "/some/path" }
router.post('/magic/send', (_req: Request, res: Response) => {
  // TODO: implement in auth rewrite step
  res.status(503).json({ error: 'Magic link auth not yet configured' });
});

// GET /auth/magic/callback — user clicks link from email; token verified
router.get('/magic/callback', (_req: Request, res: Response) => {
  // TODO: implement in auth rewrite step
  res.redirect('/login.html?reason=invalid-state');
});

export = router;
