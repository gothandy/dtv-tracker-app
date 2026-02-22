import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import { sharePointClient } from '../services/sharepoint-client';

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function mediaDriveId(): string {
  const id = process.env.MEDIA_LIBRARY_DRIVE_ID;
  if (!id) throw new Error('MEDIA_LIBRARY_DRIVE_ID is not configured');
  return id;
}

function uploadFilename(originalName: string, displayName: string, takenAt: Date): string {
  const hh = String(takenAt.getHours()).padStart(2, '0');
  const mm = String(takenAt.getMinutes()).padStart(2, '0');
  const ss = String(takenAt.getSeconds()).padStart(2, '0');
  const name = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rand = Math.random().toString(36).slice(2, 6);
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  return `${hh}-${mm}-${ss}-${name}-${rand}${ext}`;
}

// Upload a photo to the Media folder in SharePoint
router.post('/photos/upload', upload.single('photo'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file provided' });
    return;
  }

  const { mimetype, buffer, originalname } = req.file;
  if (!mimetype.startsWith('image/')) {
    res.status(400).json({ success: false, error: 'Only image files are accepted' });
    return;
  }

  try {
    const driveId = mediaDriveId();
    const displayName = req.session.user?.displayName || 'unknown';
    // file.lastModified (ms since epoch) sent from browser — on mobile this is the photo capture time
    const takenAt = req.body.takenAt ? new Date(parseInt(req.body.takenAt)) : new Date();
    const filename = uploadFilename(originalname, displayName, takenAt);
    // PoC: hardcoded folder — full version will derive from session groupKey + date
    const filePath = `Sat/2026-02-21/${filename}`;

    const result = await sharePointClient.uploadFile(driveId, filePath, buffer, mimetype);
    res.json({ success: true, data: { name: result.name, webUrl: result.webUrl } });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export = router;
