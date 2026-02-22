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

// Upload photos to the Media library in SharePoint
router.post('/photos/upload', upload.array('photos', 20), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ success: false, error: 'No files provided' });
    return;
  }

  const invalidFile = files.find(f => !f.mimetype.startsWith('image/'));
  if (invalidFile) {
    res.status(400).json({ success: false, error: `Not an image: ${invalidFile.originalname}` });
    return;
  }

  try {
    const driveId = mediaDriveId();
    const displayName = req.session.user?.displayName || 'unknown';
    // takenAt values sent from browser (file.lastModified ms) — on mobile this is the photo capture time
    const takenAtRaw = req.body.takenAt;
    const takenAtList = Array.isArray(takenAtRaw) ? takenAtRaw : takenAtRaw ? [takenAtRaw] : [];

    const results = await Promise.all(files.map((file, i) => {
      const takenAt = takenAtList[i] ? new Date(parseInt(takenAtList[i])) : new Date();
      const filename = uploadFilename(file.originalname, displayName, takenAt);
      // PoC: hardcoded folder — full version will derive from session groupKey + date
      const filePath = `Sat/2026-02-21/${filename}`;
      return sharePointClient.uploadFile(driveId, filePath, file.buffer, file.mimetype);
    }));

    res.json({ success: true, data: results.map(r => ({ name: r.name, webUrl: r.webUrl })) });
  } catch (error: any) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export = router;
