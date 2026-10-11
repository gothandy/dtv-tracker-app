import { Request } from 'express';

/**
 * The address this request came in on, e.g. https://tracker.dtv.org.uk or
 * https://preview.tracker.dtv.org.uk. Used for links in emails and link previews,
 * so each environment links to itself. Needs app.set('trust proxy', 1) behind Azure.
 */
export function requestOrigin(req: Pick<Request, 'protocol' | 'get'>): string {
  return `${req.protocol}://${req.get('host')}`;
}
