import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import { sharePointClient } from '../services/sharepoint-client';
import { mediaDriveId, exifDate, mediaFilename } from '../services/media-upload';
import { entriesRepository } from '../services/repositories/entries-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { groupsRepository } from '../services/repositories/groups-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { safeParseLookupId, convertGroup } from '../services/data-layer';
import { SESSION_LOOKUP, PROFILE_LOOKUP, GROUP_LOOKUP, PROFILE_DISPLAY } from '../services/field-names';

import type { UploadContextResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/x-m4v'
]);


interface ResolvedContext {
  ok: true;
  entryId: number;
  sessionId: number;
  groupKey: string;
  groupName: string;
  date: string;
  profileName: string;
}
interface ResolveFailure { ok: false; reason: 'not-found' | 'expired' }
type ResolveResult = ResolvedContext | ResolveFailure;

async function resolveCode(code: string, bypassExpiry = false): Promise<ResolveResult> {
  // Look up the entry directly from SharePoint by Code field
  const rawEntry = await entriesRepository.getByCode(code);
  if (!rawEntry) return { ok: false, reason: 'not-found' };

  const [rawSessions, rawGroups, rawProfiles] = await Promise.all([
    sessionsRepository.getAll(),
    groupsRepository.getAll(),
    profilesRepository.getAll()
  ]);

  const sessionId = safeParseLookupId(rawEntry[SESSION_LOOKUP]);
  const rawSession = sessionId !== undefined
    ? (rawSessions as any[]).find((s: any) => s.ID === sessionId)
    : undefined;
  if (!rawSession) return { ok: false, reason: 'not-found' };

  // Only accept codes from sessions within the last 7 days (bypassed for authenticated users)
  if (!bypassExpiry) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    if (new Date(rawSession.Date) < sevenDaysAgo) return { ok: false, reason: 'expired' };
  }

  const groupId = safeParseLookupId(rawSession[GROUP_LOOKUP]);
  const rawGroup = groupId !== undefined
    ? (rawGroups as any[]).find((g: any) => g.ID === groupId)
    : undefined;
  const group = rawGroup ? convertGroup(rawGroup) : null;

  const profileId = safeParseLookupId(rawEntry[PROFILE_LOOKUP]);
  const rawProfile = profileId !== undefined
    ? (rawProfiles as any[]).find((p: any) => p.ID === profileId)
    : undefined;

  return {
    ok: true,
    entryId: rawEntry.ID,
    sessionId: sessionId!,
    groupKey: group?.lookupKeyName || '',
    groupName: group?.displayName || group?.lookupKeyName || '',
    date: rawSession.Date.substring(0, 10),
    profileName: rawProfile?.Title || rawEntry[PROFILE_DISPLAY] || 'Volunteer'
  };
}

// Validate a code and return session/profile context.
// Public — no session auth required (mounted before requireAuth in app.js).
router.post('/upload/validate', async (req: Request, res: Response) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400).json({ success: false, error: 'Code is required' });
    return;
  }

  try {
    const result = await resolveCode(code, !!req.session.user);
    if (!result.ok) {
      const error = result.reason === 'expired' ? 'Code has expired' : 'Code not found';
      res.status(404).json({ success: false, error, reason: result.reason });
      return;
    }

    const data: UploadContextResponse = {
      sessionName: `${result.groupName} — ${result.date}`,
      date: result.date,
      groupKey: result.groupKey,
      groupName: result.groupName,
      profileName: result.profileName,
      sessionId: result.sessionId,
      isAuthenticated: !!req.session.user
    };
    res.json({ success: true, data } as ApiResponse<UploadContextResponse>);
  } catch (error: any) {
    console.error('Error validating upload code:', error);
    res.status(500).json({ success: false, error: 'Failed to validate code', message: error.message });
  }
});

// Upload photos using a valid code.
// Public — no session auth required (mounted before requireAuth in app.js).
router.post('/upload/files', upload.array('photos', 10), async (req: Request, res: Response) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400).json({ success: false, error: 'Code is required' });
    return;
  }

  try {
    const context = await resolveCode(code, !!req.session.user);
    if (!context.ok) {
      const error = context.reason === 'expired' ? 'Code has expired' : 'Code not found';
      res.status(404).json({ success: false, error, reason: context.reason });
      return;
    }

    const driveId = mediaDriveId();
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files provided' });
      return;
    }

    const folderPath = `${context.groupKey}/${context.date}`;
    let uploaded = 0;

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        console.warn(`[Upload] Rejected ${file.originalname}: unsupported type ${file.mimetype}`);
        continue;
      }
      const takenAt = exifDate(file.buffer) ?? new Date();
      const filename = mediaFilename(file.originalname, context.profileName, takenAt);
      const uploaded_item = await sharePointClient.uploadFile(driveId, `${folderPath}/${filename}`, file.buffer, file.mimetype);
      // New uploads default to not public — admin must explicitly mark IsPublic to show in public gallery
      await sharePointClient.updateMediaItemFields(driveId, uploaded_item.id, { IsPublic: false });
      uploaded++;
    }

    if (uploaded > 0) sharePointClient.clearCache();

    res.json({ success: true, data: { uploaded } });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    res.status(500).json({ success: false, error: 'Upload failed', message: error.message });
  }
});

export = router;
