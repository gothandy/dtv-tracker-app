import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { renderEmail } from '../services/email-renderer';

const router: Router = express.Router();

// Static fixture data per template — baseUrl injected at request time via buildFixture().
const FIXTURES: Record<string, (baseUrl: string) => Record<string, unknown>> = {
  'pre-session': (baseUrl) => ({
    baseUrl,
    volunteerName: 'Alice Example',
    groupName: 'Sheepskull',
    sessionTitle: 'Spring Conservation Day',
    formattedDateShort: '23 April',
    formattedDateLong: 'Wednesday, 23 April 2026',
    description: 'Meet at the usual car park.<br>Bring waterproofs.',
    sessionUrl: `${baseUrl}/sessions/sheepskull/2026-04-23`,
    loginUrl: `${baseUrl}/login?returnTo=/sessions/sheepskull/2026-04-23`,
    myChildNames: 'Ben Example',
    isRegular: true,
  }),
};


function isLocalhost(req: Request): boolean {
  const host = req.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

// GET /api/email/sandbox/:template
// Renders an email template with fixture data and returns it as raw HTML.
// Accessible from localhost (dev convenience) or when logged in as admin.
router.get('/sandbox/:template', async (req: Request, res: Response) => {
  const role = req.session?.user?.role;
  if (!isLocalhost(req) && role !== 'admin') {
    res.status(403).send('Forbidden');
    return;
  }

  const template = req.params.template as string;
  const fixture = FIXTURES[template];
  if (!fixture) {
    res.status(404).send(`No fixture defined for template "${template}"`);
    return;
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const vars = fixture(baseUrl);

  if (req.query.format === 'json') {
    res.json(vars);
    return;
  }

  try {
    const html = await renderEmail(template, vars);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).send(`<pre>Template error: ${err.message}</pre>`);
  }
});

export = router;
