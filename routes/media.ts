import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { sharePointClient } from '../services/sharepoint-client';
import { mediaDriveId } from '../services/media-upload';
import { requireAdmin } from '../middleware/require-admin';

const router: Router = express.Router();

// Batch media count by session folder. Accepts comma-separated groupKey/date paths;
// returns non-zero counts keyed by path. Makes one Graph call per unique group key.
router.get('/media/counts', async (req: Request, res: Response) => {
  const pathsParam = (req.query.paths as string || '').trim();
  if (!pathsParam) { res.json({ success: true, data: {} }); return; }

  let driveId: string;
  try { driveId = mediaDriveId(); } catch { res.json({ success: true, data: {} }); return; }

  const paths = pathsParam.split(',').map(p => p.trim()).filter(Boolean);
  const byGroup = new Map<string, string[]>();
  for (const p of paths) {
    const slash = p.indexOf('/');
    if (slash < 1) continue;
    const gk = p.substring(0, slash);
    const date = p.substring(slash + 1);
    if (!byGroup.has(gk)) byGroup.set(gk, []);
    byGroup.get(gk)!.push(date);
  }

  try {
    const counts: Record<string, number> = {};
    for (const [gk, dates] of byGroup) {
      const dateCounts = await sharePointClient.listGroupDateCounts(driveId, gk);
      for (const date of dates) {
        const count = dateCounts.get(date) || 0;
        if (count > 0) counts[`${gk}/${date}`] = count;
      }
    }
    res.json({ success: true, data: counts });
  } catch (error: any) {
    console.error('Error fetching photo counts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List media in a session folder. Returns stable proxy URLs (not raw SharePoint pre-auth URLs).
// Trusted users (admin/check-in/read-only) see all items with raw SharePoint URLs for direct CDN access.
// Self-service and unauthenticated users only see isPublic === true items via stable proxy URLs.
router.get('/media', async (req: Request, res: Response) => {
  const groupKey = (req.query.groupKey as string || '').replace(/[^a-zA-Z0-9-]/g, '');
  const date = (req.query.date as string || '').replace(/[^0-9-]/g, '');
  if (!groupKey || !date) {
    res.status(400).json({ success: false, error: 'groupKey and date are required' });
    return;
  }
  try {
    const driveId = mediaDriveId();
    const photos = await sharePointClient.listFolderPhotos(driveId, `${groupKey}/${date}`);
    const role = req.session?.user?.role;
    const isTrusted = !!role && role !== 'selfservice';
    const data = isTrusted
      ? photos.map(({ name, webUrl, thumbnailUrl, largeUrl, ...rest }) => ({
          ...rest,
          url: largeUrl || thumbnailUrl,
        }))
      : photos
          .filter(p => p.isPublic === true)
          .map(({ name, webUrl, thumbnailUrl, largeUrl, ...rest }) => ({
            ...rest,
            url: `/media/${groupKey}/${date}/${rest.listItemId}`,
          }));
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error listing photos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download the original file. Trusted DTV users only (admin/check-in/read-only).
// Fetches the file server-side and serves it with Content-Disposition: attachment.
router.get('/media/:itemId/download', async (req: Request, res: Response) => {
  const role = req.session?.user?.role;
  const isTrusted = !!role && role !== 'selfservice';
  if (!isTrusted) {
    res.status(403).json({ success: false, error: 'Trusted users only' });
    return;
  }
  try {
    const driveId = mediaDriveId();
    const { downloadUrl, name } = await sharePointClient.getMediaItemDownloadUrl(driveId, String(req.params.itemId));
    if (!downloadUrl) {
      res.status(404).json({ success: false, error: 'Download URL not available' });
      return;
    }
    const upstream = await fetch(downloadUrl);
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch (error: any) {
    console.error('Error downloading media item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stream a media item by redirecting to its pre-authenticated Graph download URL.
// Public users can only stream items where isPublic is true.
router.get('/media/:itemId/stream', async (req: Request, res: Response) => {
  try {
    const driveId = mediaDriveId();
    const { downloadUrl, isPublic } = await sharePointClient.getMediaItemDownloadUrl(driveId, String(req.params.itemId));
    const role = req.session?.user?.role;
    const isTrusted = !!role && role !== 'selfservice';
    if (!isTrusted && !isPublic) {
      res.status(403).json({ success: false, error: 'Not public' });
      return;
    }
    if (!downloadUrl) {
      res.status(404).json({ success: false, error: 'Download URL not available' });
      return;
    }
    res.redirect(downloadUrl);
  } catch (error: any) {
    console.error('Error streaming media item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update metadata (title, isPublic) on a Media library item. Admin/Check-in only.
router.patch('/media/:itemId', requireAdmin, async (req: Request, res: Response) => {
  const { title, isPublic } = req.body;
  const fields: Record<string, any> = {};
  if (typeof title === 'string') fields.Title = title;
  if (typeof isPublic === 'boolean') fields.IsPublic = isPublic;
  if (!Object.keys(fields).length) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }
  try {
    const driveId = mediaDriveId();
    await sharePointClient.updateMediaItemFields(driveId, String(req.params.itemId), fields);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating media item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a media item. Admin/Check-in only. Pass groupKey+date query params to bust folder cache.
router.delete('/media/:itemId', requireAdmin, async (req: Request, res: Response) => {
  const groupKey = (req.query.groupKey as string || '').replace(/[^a-zA-Z0-9-]/g, '');
  const date = (req.query.date as string || '').replace(/[^0-9-]/g, '');
  try {
    const driveId = mediaDriveId();
    await sharePointClient.deleteMediaItem(driveId, String(req.params.itemId));
    if (groupKey && date) sharePointClient.clearMediaFolderCache(`${groupKey}/${date}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting media item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export = router;
