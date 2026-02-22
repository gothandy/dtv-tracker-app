import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import ExifReader from 'exifreader';
import { sharePointClient } from '../services/sharepoint-client';

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function mediaDriveId(): string {
  const id = process.env.MEDIA_LIBRARY_DRIVE_ID;
  if (!id) throw new Error('MEDIA_LIBRARY_DRIVE_ID is not configured');
  return id;
}

// Extract DateTimeOriginal from EXIF. Returns null if not present or unreadable.
// EXIF format: "2026:02:21 14:30:22"
function exifDate(buffer: Buffer): Date | null {
  try {
    const tags = ExifReader.load(buffer, { expanded: false });
    const raw = (tags['DateTimeOriginal'] as any)?.description as string | undefined;
    if (!raw) return null;
    const [datePart, timePart] = raw.split(' ');
    const [y, mo, d] = datePart.split(':').map(Number);
    const [h, mi, s] = timePart.split(':').map(Number);
    const dt = new Date(y, mo - 1, d, h, mi, s);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

function uploadFilename(originalName: string, displayName: string, takenAt: Date): string {
  const hh = String(takenAt.getHours()).padStart(2, '0');
  const mm = String(takenAt.getMinutes()).padStart(2, '0');
  const ss = String(takenAt.getSeconds()).padStart(2, '0');
  const name = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const stem = path.basename(originalName, path.extname(originalName));
  const suffix = stem.replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase() || 'img';
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  return `${hh}-${mm}-${ss}-${name}-${suffix}${ext}`;
}

// Batch photo count by session folder. Accepts comma-separated groupKey/date paths;
// returns non-zero counts keyed by path. Makes one Graph call per unique group key.
router.get('/photos/counts', async (req: Request, res: Response) => {
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

// List photos in a session folder. Returns names, webUrls, and thumbnail URLs.
router.get('/photos', async (req: Request, res: Response) => {
  const groupKey = (req.query.groupKey as string || '').replace(/[^a-zA-Z0-9-]/g, '');
  const date = (req.query.date as string || '').replace(/[^0-9-]/g, '');
  if (!groupKey || !date) {
    res.status(400).json({ success: false, error: 'groupKey and date are required' });
    return;
  }
  try {
    const driveId = mediaDriveId();
    const photos = await sharePointClient.listFolderPhotos(driveId, `${groupKey}/${date}`);
    res.json({ success: true, data: photos });
  } catch (error: any) {
    console.error('Error listing photos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload a single photo to the Media library in SharePoint.
// Frontend calls this once per file so it can show per-file progress.
router.post('/photos/upload', (req: Request, res: Response, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    next();
  });
}, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file provided' });
    return;
  }

  const { mimetype, buffer, originalname } = req.file;
  if (!mimetype.startsWith('image/')) {
    res.status(400).json({ success: false, error: 'Only image files are accepted' });
    return;
  }

  const folderGroupKey = (req.body.groupKey as string || '').replace(/[^a-zA-Z0-9-]/g, '');
  const folderDate = (req.body.date as string || '').replace(/[^0-9-]/g, '');
  if (!folderGroupKey || !folderDate) {
    res.status(400).json({ success: false, error: 'groupKey and date are required' });
    return;
  }

  try {
    const driveId = mediaDriveId();
    const displayName = req.session.user?.displayName || 'unknown';
    // Prefer EXIF DateTimeOriginal, fall back to file.lastModified from browser, then server time
    const takenAt = exifDate(buffer)
      ?? (req.body.takenAt ? new Date(parseInt(req.body.takenAt)) : new Date());
    const filename = uploadFilename(originalname, displayName, takenAt);
    const filePath = `${folderGroupKey}/${folderDate}/${filename}`;

    const result = await sharePointClient.uploadFile(driveId, filePath, buffer, mimetype);
    res.json({ success: true, data: { name: result.name, webUrl: result.webUrl } });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export = router;
