import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import { recordsRepository } from '../services/repositories/records-repository';
import {
  validateArray,
  validateSession,
  validateEntry,
  validateProfile,
  convertGroup,
  calculateCurrentFY,
  calculateFinancialYear,
  findGroupByKey,
  findSessionByGroupAndDate,
  safeParseLookupId,
  parseHours,
  nameToSlug,
  profileSlug,
  profileIdFromSlug,
  parseEmails,
  calculateSessionStats
} from '../services/data-layer';
import { isNewVolunteer, findOrCreateProfile, upsertConsentRecords } from '../services/eventbrite-sync';
import {
  GROUP_LOOKUP,
  SESSION_LOOKUP,
  SESSION_STATS,
  PROFILE_LOOKUP, PROFILE_DISPLAY
} from '../services/field-names';
import { getAttendees } from '../services/eventbrite-client';

import { computeAndSaveProfileStats } from '../services/profile-stats';
import multer from 'multer';
import { sharePointClient } from '../services/sharepoint-client';
import { mediaDriveId, exifDate, mediaFilename } from '../services/media-upload';

import type { EntryDetailResponse, EntryListItemResponse, RecentSignupResponse, EntryUploadContextResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

// Recomputes and saves the Stats field for a single session after an entry change.
// Called as fire-and-forget after entry writes so the response isn't delayed.
// existingMedia is extracted from the cached session Stats before the write clears the cache.
async function computeAndSaveSessionStats(sessionId: number, existingMedia: number = 0): Promise<void> {
  const start = Date.now();
  const sessionEntries = await entriesRepository.getBySessionIds([sessionId]);
  const statsMap = calculateSessionStats(sessionEntries);
  const entryStats = statsMap.get(String(sessionId));
  await sessionsRepository.updateStats(sessionId, {
    count: entryStats?.registrations || 0,
    hours: entryStats ? Math.round(entryStats.hours * 10) / 10 : 0,
    media: existingMedia,
    new: entryStats?.newCount || 0,
    child: entryStats?.childCount || 0,
    regular: entryStats?.regularCount || 0,
    eventbrite: entryStats?.eventbriteCount || 0
  });
  console.log(`[Stats] Session ${sessionId} targeted stats update in ${Date.now() - start}ms`);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 }
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/x-m4v'
]);

function appendNewTag(notes: string | undefined): string {
  const base = notes || '';
  if (/#New\b/i.test(base)) return base;
  return base ? `${base} #New` : '#New';
}

router.get('/entries/recent', async (req: Request, res: Response) => {
  try {
    const since = String(req.query.since || '24h');
    const hoursMap: Record<string, number> = { '24h': 24, '48h': 48, '7d': 168 };
    const hours = hoursMap[since] ?? 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [rawEntries, rawSessions, rawGroups] = await Promise.all([
      entriesRepository.getRecent(cutoff),
      sessionsRepository.getAll(),
      groupsRepository.getAll()
    ]);

    const sessionMap = new Map(rawSessions.map(s => [s.ID, s]));
    const groupMap = new Map(rawGroups.map(g => [g.ID, g]));

    const entries = validateArray(rawEntries, validateEntry, 'Entry');

    const recent: RecentSignupResponse[] = entries
      .filter(e => !/#Regular\b/i.test(e.Notes || ''))
      .sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())
      .slice(0, 50)
      .flatMap(e => {
        const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
        if (sessionId === undefined) return [];
        const session = sessionMap.get(sessionId);
        if (!session) return [];
        const groupId = safeParseLookupId(session[GROUP_LOOKUP]);
        if (groupId === undefined) return [];
        const group = groupMap.get(groupId);
        if (!group) return [];
        const name = e[PROFILE_DISPLAY] || 'Unknown';
        const vid = safeParseLookupId(e[PROFILE_LOOKUP]);
        const slug = vid !== undefined ? profileSlug(name, vid) : nameToSlug(name);
        return [{
          id: e.ID,
          volunteerName: name,
          volunteerSlug: slug,
          profileName: name,
          profileSlug: slug,
          date: session.Date,
          groupKey: group.Title,
          groupName: group.Name || group.Title,
          notes: e.Notes,
          checkedIn: e.Checked || false
        }];
      });

    res.json({ success: true, data: recent } as ApiResponse<RecentSignupResponse[]>);
  } catch (error: any) {
    console.error('Error fetching recent entries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent entries', message: error.message });
  }
});

router.get('/entries', async (req: Request, res: Response) => {
  try {
    const q = req.query.q ? String(req.query.q).toLowerCase() : '';
    const accompanyingAdult = req.query.accompanyingAdult ? String(req.query.accompanyingAdult) : '';
    const filterAdultId = req.query.accompanyingAdultId ? parseInt(String(req.query.accompanyingAdultId), 10) : null;

    const [rawEntries, rawSessions, rawGroups, rawProfiles] = await Promise.all([
      entriesRepository.getAll(),
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const sessionMap = new Map(rawSessions.map(s => [s.ID, s]));
    const groupMap = new Map(rawGroups.map(g => [g.ID, g]));
    const profileMap = new Map(rawProfiles.map(p => [p.ID, p]));

    const entries = validateArray(rawEntries, validateEntry, 'Entry');

    const results: EntryListItemResponse[] = entries
      .flatMap(e => {
        const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
        if (sessionId === undefined) return [];
        const session = sessionMap.get(sessionId);
        if (!session) return [];
        const groupId = safeParseLookupId(session[GROUP_LOOKUP]);
        if (groupId === undefined) return [];
        const group = groupMap.get(groupId);
        if (!group) return [];

        if (q && !String(e.Notes || '').toLowerCase().includes(q)) return [];

        const hasAdult = !!e.AccompanyingAdultLookupId;
        if (accompanyingAdult === 'empty' && hasAdult) return [];
        if (accompanyingAdult === 'notempty' && !hasAdult) return [];
        if (filterAdultId !== null && Number(e.AccompanyingAdultLookupId) !== filterAdultId) return [];

        const profileId = safeParseLookupId(e[PROFILE_LOOKUP]);
        const profile = profileId !== undefined ? profileMap.get(profileId) : undefined;
        const name = e[PROFILE_DISPLAY] || 'Unknown';
        const slug = profileId !== undefined ? profileSlug(name, profileId) : nameToSlug(name);

        return [{
          id: e.ID,
          profileId,
          volunteerName: name,
          volunteerSlug: slug,
          date: session.Date,
          groupKey: group.Title,
          groupName: group.Name || group.Title,
          notes: e.Notes,
          checkedIn: e.Checked || false,
          hours: parseHours(e.Hours),
          count: e.Count || 1,
          isGroup: profile?.IsGroup || false,
          hasAccompanyingAdult: hasAdult,
          accompanyingAdultId: e.AccompanyingAdultLookupId
        }];
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json({ success: true, data: results } as ApiResponse<EntryListItemResponse[]>);
  } catch (error: any) {
    console.error('Error fetching entries list:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch entries', message: error.message });
  }
});

router.get('/entries/:group/:date/:slug', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);
    const slug = String(req.params.slug).toLowerCase();

    const [rawGroups, rawSessions, rawEntries, rawProfiles] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const spSession = findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam);
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const slugProfileId = profileIdFromSlug(slug);
    const spEntry = entries.find(e => {
      if (safeParseLookupId(e[SESSION_LOOKUP]) !== spSession.ID) return false;
      if (slugProfileId !== undefined) return safeParseLookupId(e[PROFILE_LOOKUP]) === slugProfileId;
      return nameToSlug(e[PROFILE_DISPLAY]) === slug; // legacy: slug without ID
    });
    if (!spEntry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    // Self-service users may only view their own entry (supports multiple linked profiles)
    if (req.session.user?.role === 'selfservice') {
      const entryProfileId = safeParseLookupId(spEntry[PROFILE_LOOKUP]);
      const ownIds = req.session.user.profileIds?.length ? req.session.user.profileIds : (req.session.user.profileId ? [req.session.user.profileId] : []);
      if (entryProfileId === undefined || !ownIds.includes(entryProfileId)) {
        res.status(403).json({ success: false, error: 'Not your entry' });
        return;
      }
    }

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const volunteerId = safeParseLookupId(spEntry[PROFILE_LOOKUP]);
    const profile = volunteerId !== undefined ? profiles.find(p => p.ID === volunteerId) : undefined;

    // Calculate FY hours from entries
    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const sessionMap = new Map(sessions.map(s => [s.ID, s]));
    const fy = calculateCurrentFY();
    const lastFYStart = fy.startYear - 1;
    let calcThisFY = 0;
    let calcLastFY = 0;
    const volunteerEntries = volunteerId !== undefined
      ? entries.filter(e => safeParseLookupId(e[PROFILE_LOOKUP]) === volunteerId)
      : [];
    volunteerEntries.forEach(e => {
      const sid = safeParseLookupId(e[SESSION_LOOKUP]);
      if (sid === undefined) return;
      const sess = sessionMap.get(sid);
      if (!sess) return;
      const h = parseHours(e.Hours);
      const sessionFY = calculateFinancialYear(new Date(sess.Date));
      if (sessionFY === fy.startYear) calcThisFY += h;
      else if (sessionFY === lastFYStart) calcLastFY += h;
    });

    const group = convertGroup(spGroup);
    const emails = parseEmails(profile?.Email);

    const vSlug = volunteerId !== undefined ? profileSlug(spEntry[PROFILE_DISPLAY], volunteerId) : nameToSlug(spEntry[PROFILE_DISPLAY]);
    const data: EntryDetailResponse = {
      id: spEntry.ID,
      volunteerName: spEntry[PROFILE_DISPLAY],
      volunteerSlug: vSlug,
      volunteerEmail: emails[0],
      volunteerEmails: emails.length > 0 ? emails : undefined,
      volunteerEntryCount: volunteerEntries.length,
      profileName: spEntry[PROFILE_DISPLAY],
      profileSlug: vSlug,
      profileEmail: emails[0],
      profileEmails: emails.length > 0 ? emails : undefined,
      profileEntryCount: volunteerEntries.length,
      isGroup: profile?.IsGroup || false,
      hoursLastFY: Math.round(calcLastFY * 10) / 10,
      hoursThisFY: Math.round(calcThisFY * 10) / 10,
      count: spEntry.Count || 1,
      hours: parseHours(spEntry.Hours),
      checkedIn: spEntry.Checked || false,
      notes: spEntry.Notes,
      date: spSession.Date,
      groupKey,
      groupName: group.displayName,
      sessionDisplayName: spSession.Name || spSession.Title
    };

    res.json({ success: true, data } as ApiResponse<EntryDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching entry detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entry detail',
      message: error.message
    });
  }
});

// GET /entries/:id — entry detail by SharePoint ID (preferred; avoids slug collisions)
router.get('/entries/:id', async (req: Request, res: Response) => {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    if (isNaN(entryId)) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    const [rawGroups, rawSessions, rawEntries, rawProfiles] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const spEntry = entries.find(e => e.ID === entryId);
    if (!spEntry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    // Self-service users may only view their own entry
    if (req.session.user?.role === 'selfservice') {
      const entryProfileId = safeParseLookupId(spEntry[PROFILE_LOOKUP]);
      const ownIds = req.session.user.profileIds?.length ? req.session.user.profileIds : (req.session.user.profileId ? [req.session.user.profileId] : []);
      if (entryProfileId === undefined || !ownIds.includes(entryProfileId)) {
        res.status(403).json({ success: false, error: 'Not your entry' });
        return;
      }
    }

    const sessionId = safeParseLookupId(spEntry[SESSION_LOOKUP]);
    const spSession = sessionId !== undefined
      ? (validateArray(rawSessions, validateSession, 'Session')).find(s => s.ID === sessionId)
      : undefined;
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const groupId = safeParseLookupId((spSession as any)[GROUP_LOOKUP]);
    const spGroup = (rawGroups as any[]).find((g: any) => g.ID === groupId);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const volunteerId = safeParseLookupId(spEntry[PROFILE_LOOKUP]);
    const profile = volunteerId !== undefined ? profiles.find(p => p.ID === volunteerId) : undefined;

    const sessions = validateArray(rawSessions, validateSession, 'Session');
    const sessionMap = new Map(sessions.map(s => [s.ID, s]));
    const fy = calculateCurrentFY();
    const lastFYStart = fy.startYear - 1;
    let calcThisFY = 0;
    let calcLastFY = 0;
    const volunteerEntries = volunteerId !== undefined
      ? entries.filter(e => safeParseLookupId(e[PROFILE_LOOKUP]) === volunteerId)
      : [];
    volunteerEntries.forEach(e => {
      const sid = safeParseLookupId(e[SESSION_LOOKUP]);
      if (sid === undefined) return;
      const sess = sessionMap.get(sid);
      if (!sess) return;
      const h = parseHours(e.Hours);
      const sessionFY = calculateFinancialYear(new Date(sess.Date));
      if (sessionFY === fy.startYear) calcThisFY += h;
      else if (sessionFY === lastFYStart) calcLastFY += h;
    });

    const group = convertGroup(spGroup);
    const emails = parseEmails(profile?.Email);

    const profileRecords = (volunteerId !== undefined && recordsRepository.available)
      ? await recordsRepository.getByProfile(volunteerId)
      : [];
    const hasPrivacyConsent = profileRecords.some(r => r.Type === 'Privacy Consent' && r.Status === 'Accepted');

    const vSlug2 = volunteerId !== undefined ? profileSlug(spEntry[PROFILE_DISPLAY], volunteerId) : nameToSlug(spEntry[PROFILE_DISPLAY]);
    const data: EntryDetailResponse = {
      id: spEntry.ID,
      volunteerName: spEntry[PROFILE_DISPLAY],
      volunteerSlug: vSlug2,
      volunteerEmail: emails[0],
      volunteerEmails: emails.length > 0 ? emails : undefined,
      volunteerEntryCount: volunteerEntries.length,
      profileName: spEntry[PROFILE_DISPLAY],
      profileSlug: vSlug2,
      profileEmail: emails[0],
      profileEmails: emails.length > 0 ? emails : undefined,
      profileEntryCount: volunteerEntries.length,
      isGroup: profile?.IsGroup || false,
      hoursLastFY: Math.round(calcLastFY * 10) / 10,
      hoursThisFY: Math.round(calcThisFY * 10) / 10,
      count: spEntry.Count || 1,
      hours: parseHours(spEntry.Hours),
      checkedIn: spEntry.Checked || false,
      notes: spEntry.Notes,
      date: spSession.Date,
      groupKey: group.lookupKeyName,
      groupName: group.displayName,
      sessionDisplayName: spSession.Name || spSession.Title,
      hasPrivacyConsent
    };

    res.json({ success: true, data } as ApiResponse<EntryDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching entry detail by ID:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch entry detail', message: error.message });
  }
});

router.patch('/entries/:id', async (req: Request, res: Response) => {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    if (isNaN(entryId)) {
      res.status(400).json({ success: false, error: 'Invalid entry ID' });
      return;
    }

    const { checkedIn, count, hours, notes, accompanyingAdultId } = req.body;
    const fields: Record<string, any> = {};

    if (typeof checkedIn === 'boolean') {
      fields.Checked = checkedIn;
    }
    if (count !== undefined) {
      const countNum = parseInt(String(count), 10);
      if (isNaN(countNum) || countNum < 0) {
        res.status(400).json({ success: false, error: 'Count must be a non-negative integer' });
        return;
      }
      fields.Count = countNum;
    }
    if (hours !== undefined) {
      const hoursNum = parseFloat(String(hours));
      if (isNaN(hoursNum) || hoursNum < 0) {
        res.status(400).json({ success: false, error: 'Hours must be a non-negative number' });
        return;
      }
      fields.Hours = hoursNum;
    }
    if (typeof notes === 'string') {
      fields.Notes = notes;
    }
    if (accompanyingAdultId !== undefined) {
      if (accompanyingAdultId !== null) {
        const adultIdNum = parseInt(String(accompanyingAdultId), 10);
        if (isNaN(adultIdNum) || adultIdNum <= 0) {
          res.status(400).json({ success: false, error: 'accompanyingAdultId must be a positive integer or null' });
          return;
        }
        fields.AccompanyingAdultLookupId = adultIdNum;
      } else {
        fields.AccompanyingAdultLookupId = null;
      }
    }

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    // Read session ID + existing media count — direct Graph calls, bypass cache entirely
    const spEntry = await entriesRepository.getById(entryId);
    const sessionId = spEntry ? safeParseLookupId(spEntry[SESSION_LOOKUP]) : undefined;
    let existingMedia = 0;
    if (sessionId !== undefined) {
      const spSession = await sessionsRepository.getById(sessionId);
      try { existingMedia = JSON.parse(spSession?.[SESSION_STATS] || '{}').media || 0; } catch { /* ignore */ }
    }

    const profileId = spEntry ? safeParseLookupId(spEntry[PROFILE_LOOKUP]) : undefined;

    await entriesRepository.updateFields(entryId, fields);

    if (sessionId !== undefined) {
      computeAndSaveSessionStats(sessionId, existingMedia).catch(err =>
        console.error(`[Stats] Failed targeted update for session ${sessionId}:`, err)
      );
    }
    // Only hours changes affect profile stats (isMember/cardStatus are unaffected by entry updates)
    if (profileId !== undefined && fields.Hours !== undefined) {
      computeAndSaveProfileStats(profileId).catch(err =>
        console.error(`[Stats] Failed targeted profile update for profile ${profileId}:`, err)
      );
    }

    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error updating entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update entry',
      message: error.message
    });
  }
});

router.delete('/entries/:id', async (req: Request, res: Response) => {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    if (isNaN(entryId)) {
      res.status(400).json({ success: false, error: 'Invalid entry ID' });
      return;
    }

    // Direct Graph call to get the entry — no cache scan
    const entry = await entriesRepository.getById(entryId);
    if (!entry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    // Self-service users may only delete their own entry (supports multiple linked profiles)
    if (req.session.user?.role === 'selfservice') {
      const profileId = safeParseLookupId(entry[PROFILE_LOOKUP]);
      const ownIds = req.session.user.profileIds?.length ? req.session.user.profileIds : (req.session.user.profileId ? [req.session.user.profileId] : []);
      if (profileId === undefined || !ownIds.includes(profileId)) {
        res.status(403).json({ success: false, error: 'Not your entry' });
        return;
      }
    }

    // Read existing media count before delete clears the cache
    const sessionId = safeParseLookupId(entry[SESSION_LOOKUP]);
    let existingMedia = 0;
    if (sessionId !== undefined) {
      const spSession = await sessionsRepository.getById(sessionId);
      try { existingMedia = JSON.parse(spSession?.[SESSION_STATS] || '{}').media || 0; } catch { /* ignore */ }
    }

    const profileId = safeParseLookupId(entry[PROFILE_LOOKUP]);

    await entriesRepository.delete(entryId);

    if (sessionId !== undefined) {
      computeAndSaveSessionStats(sessionId, existingMedia).catch(err =>
        console.error(`[Stats] Failed targeted update for session ${sessionId}:`, err)
      );
    }
    if (profileId !== undefined) {
      computeAndSaveProfileStats(profileId).catch(err =>
        console.error(`[Stats] Failed targeted profile update for profile ${profileId}:`, err)
      );
    }

    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete entry',
      message: error.message
    });
  }
});

router.post('/sessions/:group/:date/entries', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);
    // TODO: remove volunteerId fallback once v1 (public/) is retired
    const { profileId, volunteerId: legacyVolunteerId, notes } = req.body;
    const volunteerId: number = profileId ?? legacyVolunteerId;

    if (!volunteerId || typeof volunteerId !== 'number') {
      res.status(400).json({ success: false, error: 'profileId is required and must be a number' });
      return;
    }

    const [rawGroups, rawSessions, rawProfiles] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const spSession = findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam);
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profile = profiles.find(p => p.ID === volunteerId);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Volunteer not found' });
      return;
    }

    if (req.session.user?.role === 'selfservice') {
      const ownIds = req.session.user.profileIds?.length ? req.session.user.profileIds : (req.session.user.profileId ? [req.session.user.profileId] : []);
      if (!ownIds.length || !ownIds.includes(volunteerId)) {
        res.status(403).json({ success: false, error: 'You can only register yourself' });
        return;
      }
      if (new Date(spSession.Date) < new Date()) {
        res.status(400).json({ success: false, error: 'Session has already passed' });
        return;
      }
      const sessionEntries = await entriesRepository.getBySessionIds([spSession.ID]);
      const alreadyRegistered = (sessionEntries as any[]).some(e =>
        safeParseLookupId(e[PROFILE_LOOKUP]) === volunteerId
      );
      if (alreadyRegistered) {
        res.status(409).json({ success: false, error: 'Already registered for this session' });
        return;
      }
    }

    const fields: Record<string, any> = {
      [SESSION_LOOKUP]: String(spSession.ID),
      [PROFILE_LOOKUP]: String(profile.ID)
    };
    let entryNotes = typeof notes === 'string' && notes.trim() ? notes : undefined;

    const rawEntries = await entriesRepository.getAll();
    if (isNewVolunteer(rawEntries, profile.ID, spSession.ID)) {
      entryNotes = appendNewTag(entryNotes);
    }
    if (entryNotes) fields.Notes = entryNotes;

    let existingMedia = 0;
    try { existingMedia = JSON.parse(spSession[SESSION_STATS] || '{}').media || 0; } catch { /* ignore */ }

    const id = await entriesRepository.create(fields);

    computeAndSaveSessionStats(spSession.ID, existingMedia).catch(err =>
      console.error(`[Stats] Failed targeted update for session ${spSession.ID}:`, err)
    );
    computeAndSaveProfileStats(volunteerId).catch(err =>
      console.error(`[Stats] Failed targeted profile update for profile ${volunteerId}:`, err)
    );

    res.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Error creating entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create entry',
      message: error.message
    });
  }
});

router.post('/sessions/:group/:date/refresh', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);

    const [rawGroups, rawSessions, rawEntries, rawProfiles, rawRegulars, rawRecords] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll(),
      profilesRepository.getAll(),
      regularsRepository.getAll(),
      recordsRepository.available ? recordsRepository.getAll() : Promise.resolve([])
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const spSession = findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam);
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    let sessionEntries = entries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === spSession.ID);
    const existingVolunteerIds = new Set(
      sessionEntries.map(e => safeParseLookupId(e[PROFILE_LOOKUP])).filter((id): id is number => id !== undefined)
    );

    let addedRegulars = 0;
    let addedFromEventbrite = 0;
    let newProfiles = 0;
    let updatedRecords = 0;
    let noPhotoTagged = 0;
    let firstAiderTagged = 0;

    // Step 1: Add missing regulars
    const groupRegulars = rawRegulars.filter(r => safeParseLookupId(r[GROUP_LOOKUP]) === spGroup.ID);
    for (const regular of groupRegulars) {
      const vid = safeParseLookupId(regular[PROFILE_LOOKUP]);
      if (vid !== undefined && !existingVolunteerIds.has(vid)) {
        let notes = '#Regular';
        if (isNewVolunteer(entries, vid, spSession.ID)) notes = appendNewTag(notes);
        await entriesRepository.create({
          [SESSION_LOOKUP]: String(spSession.ID),
          [PROFILE_LOOKUP]: String(vid),
          Notes: notes
        });
        existingVolunteerIds.add(vid);
        addedRegulars++;
      }
    }

    // Step 2: Sync Eventbrite attendees (if session has an Eventbrite ID)
    if (spSession.EventbriteEventID) {
      const attendees = await getAttendees(spSession.EventbriteEventID);
      console.log(`[Refresh] Session ${spSession.ID} (${spSession.EventbriteEventID}): ${attendees.length} attendees`);

      for (const attendee of attendees) {
        const attendeeName = attendee.profile?.name;
        const attendeeEmail = attendee.profile?.email;
        if (!attendeeName) continue;

        const { profile, isNew, clash } = await findOrCreateProfile(attendeeName, attendeeEmail, profiles, 'Refresh');
        if (isNew) newProfiles++;

        // Create entry if not already registered
        const profileId = profile.ID;
        if (!existingVolunteerIds.has(profileId)) {
          const noteTags: string[] = [];
          if (isNewVolunteer(entries, profileId, spSession.ID)) noteTags.push('#New');
          if (attendee.ticket_class_name?.toLowerCase().includes('child')) noteTags.push('#Child');
          noteTags.push('#Eventbrite');
          if (clash) noteTags.push('#Duplicate');
          await entriesRepository.create({
            [SESSION_LOOKUP]: String(spSession.ID),
            [PROFILE_LOOKUP]: String(profileId),
            Notes: noteTags.join(' ')
          });
          existingVolunteerIds.add(profileId);
          addedFromEventbrite++;
        }

        // Upsert consent records from Eventbrite answers
        const { created, updated } = await upsertConsentRecords(profileId, attendee, rawRecords);
        updatedRecords += created + updated;
      }
    }

    // Step 3: Tag #NoPhoto on entries where volunteer lacks photo consent
    // Build set of profile IDs with accepted Photo Consent
    const photoConsentedIds = new Set<number>();
    for (const r of rawRecords) {
      const pid = safeParseLookupId(r.ProfileLookupId as unknown as string);
      if (pid !== undefined && r.Type === 'Photo Consent' && r.Status === 'Accepted') {
        photoConsentedIds.add(pid);
      }
    }

    // Re-fetch entries since steps 1+2 may have added new ones
    const freshEntries = await entriesRepository.getAll();
    const freshValidEntries = validateArray(freshEntries, validateEntry, 'Entry');
    sessionEntries = freshValidEntries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === spSession.ID);

    for (const entry of sessionEntries) {
      const vid = safeParseLookupId(entry[PROFILE_LOOKUP]);
      if (vid === undefined) continue;
      // Skip groups
      const profile = profiles.find(p => p.ID === vid);
      if (profile?.IsGroup) continue;

      const notes = entry.Notes || '';
      if (!photoConsentedIds.has(vid) && !/\#NoPhoto\b/i.test(notes)) {
        const updatedNotes = notes ? `${notes} #NoPhoto` : '#NoPhoto';
        await entriesRepository.updateFields(entry.ID, { Notes: updatedNotes });
        noPhotoTagged++;
      }
    }

    // Step 4: Tag #FirstAider on entries where volunteer has a valid First Aid Certificate
    // (Type = "First Aid Certificate", Status = "Expires", expiry date is after the session date)
    const sessionDate = new Date(spSession.Date);
    const firstAiderIds = new Set<number>();
    for (const r of rawRecords) {
      const pid = safeParseLookupId(r.ProfileLookupId as unknown as string);
      if (pid !== undefined && r.Type === 'First Aid Certificate' && r.Status === 'Expires' && r.Date) {
        if (new Date(r.Date) > sessionDate) firstAiderIds.add(pid);
      }
    }

    for (const entry of sessionEntries) {
      const vid = safeParseLookupId(entry[PROFILE_LOOKUP]);
      if (vid === undefined) continue;
      if (!firstAiderIds.has(vid)) continue;
      const notes = entry.Notes || '';
      if (!/\#FirstAider\b/i.test(notes)) {
        const updatedNotes = notes ? `${notes} #FirstAider` : '#FirstAider';
        await entriesRepository.updateFields(entry.ID, { Notes: updatedNotes });
        firstAiderTagged++;
      }
    }

    // Update session Stats now that entries have been added/tagged
    let existingMedia = 0;
    try { existingMedia = JSON.parse(spSession[SESSION_STATS] || '{}').media || 0; } catch { /* ignore */ }
    await computeAndSaveSessionStats(spSession.ID, existingMedia).catch(err =>
      console.error(`[Stats] Failed stats update after session refresh:`, err)
    );

    // Fire profile stats update for all affected volunteers (fire-and-forget)
    for (const vid of existingVolunteerIds) {
      computeAndSaveProfileStats(vid).catch(err =>
        console.error(`[Stats] Failed targeted profile update for profile ${vid}:`, err)
      );
    }

    console.log(`[Refresh] Done: ${addedRegulars} regulars, ${addedFromEventbrite} eventbrite, ${newProfiles} new profiles, ${updatedRecords} records, ${noPhotoTagged} #NoPhoto, ${firstAiderTagged} #FirstAider`);
    res.json({
      success: true,
      data: { addedRegulars, addedFromEventbrite, newProfiles, updatedRecords, noPhotoTagged, firstAiderTagged }
    });
  } catch (error: any) {
    console.error('Error refreshing session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh session',
      message: error.message
    });
  }
});

// Recomputes and saves Stats for a single session — used after bulk operations
// (e.g. set default hours) where multiple entry writes race against each other.
router.post('/sessions/:group/:date/stats', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);

    const [rawGroups, rawSessions] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll()
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const spSession = findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam);
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    let existingMedia = 0;
    try { existingMedia = JSON.parse(spSession[SESSION_STATS] || '{}').media || 0; } catch { /* ignore */ }

    await computeAndSaveSessionStats(spSession.ID, existingMedia);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating session stats:', error);
    res.status(500).json({ success: false, error: 'Failed to update session stats', message: error.message });
  }
});

router.delete('/sessions/:group/:date/unchecked-entries', async (req: Request, res: Response) => {
  try {
    const groupKey = String(req.params.group).toLowerCase();
    const dateParam = String(req.params.date);

    const [rawGroups, rawSessions, rawEntries] = await Promise.all([
      groupsRepository.getAll(),
      sessionsRepository.getAll(),
      entriesRepository.getAll()
    ]);

    const spGroup = findGroupByKey(rawGroups, groupKey);
    if (!spGroup) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const spSession = findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam);
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const sessionEntries = rawEntries.filter(e => safeParseLookupId(e[SESSION_LOOKUP]) === spSession.ID);
    const unchecked = sessionEntries.filter(e => !e.Checked);

    let existingMedia = 0;
    try { existingMedia = JSON.parse(spSession[SESSION_STATS] || '{}').media || 0; } catch { /* ignore */ }

    const uncheckedProfileIds = unchecked
      .map(e => safeParseLookupId(e[PROFILE_LOOKUP]))
      .filter((id): id is number => id !== undefined);

    await Promise.all(unchecked.map(e => entriesRepository.delete(e.ID)));

    if (unchecked.length > 0) {
      computeAndSaveSessionStats(spSession.ID, existingMedia).catch(err =>
        console.error(`[Stats] Failed targeted update after removing no-shows for session ${spSession.ID}:`, err)
      );
      for (const vid of uncheckedProfileIds) {
        computeAndSaveProfileStats(vid).catch(err =>
          console.error(`[Stats] Failed targeted profile update for profile ${vid}:`, err)
        );
      }
    }

    res.json({ success: true, data: { deleted: unchecked.length } });
  } catch (error: any) {
    console.error('Error deleting unchecked entries:', error);
    res.status(500).json({ success: false, error: 'Failed to delete entries', message: error.message });
  }
});

router.get('/entries/:id/upload-context', async (req: Request, res: Response) => {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    if (isNaN(entryId) || entryId <= 0) {
      res.status(400).json({ success: false, error: 'Invalid entry ID' });
      return;
    }

    const [rawEntries, rawSessions, rawGroups, rawProfiles] = await Promise.all([
      entriesRepository.getAll(),
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const rawEntry = entries.find(e => e.ID === entryId);
    if (!rawEntry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    // Ownership check for self-service users (supports multiple linked profiles)
    if (req.session.user?.role === 'selfservice') {
      const profileId = safeParseLookupId(rawEntry[PROFILE_LOOKUP]);
      const ownIds = req.session.user.profileIds?.length ? req.session.user.profileIds : (req.session.user.profileId ? [req.session.user.profileId] : []);
      if (profileId === undefined || !ownIds.includes(profileId)) {
        res.status(403).json({ success: false, error: 'Not your entry' });
        return;
      }
    }

    const sessionId = safeParseLookupId(rawEntry[SESSION_LOOKUP]);
    const spSession = sessionId !== undefined
      ? (rawSessions as any[]).find((s: any) => s.ID === sessionId)
      : undefined;
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const groupId = safeParseLookupId(spSession[GROUP_LOOKUP]);
    const spGroup = groupId !== undefined
      ? (rawGroups as any[]).find((g: any) => g.ID === groupId)
      : undefined;
    const group = spGroup ? convertGroup(spGroup) : null;

    const profileId = safeParseLookupId(rawEntry[PROFILE_LOOKUP]);
    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profile = profileId !== undefined ? profiles.find(p => p.ID === profileId) : undefined;

    const data: EntryUploadContextResponse = {
      entryId: rawEntry.ID,
      sessionId: sessionId!,
      sessionName: spSession.Name || spSession.Title || group?.displayName || '',
      date: spSession.Date,
      groupKey: group?.lookupKeyName || '',
      groupName: group?.displayName || group?.lookupKeyName || '',
      profileName: profile?.Title || rawEntry[PROFILE_DISPLAY] || 'Volunteer'
    };

    res.json({ success: true, data } as ApiResponse<EntryUploadContextResponse>);
  } catch (error: any) {
    console.error('Error fetching upload context:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch upload context', message: error.message });
  }
});

router.post('/entries/:id/photos', upload.array('photos', 10), async (req: Request, res: Response) => {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    if (isNaN(entryId) || entryId <= 0) {
      res.status(400).json({ success: false, error: 'Invalid entry ID' });
      return;
    }

    const [rawEntries, rawSessions, rawGroups, rawProfiles] = await Promise.all([
      entriesRepository.getAll(),
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
      profilesRepository.getAll()
    ]);

    const entries = validateArray(rawEntries, validateEntry, 'Entry');
    const rawEntry = entries.find(e => e.ID === entryId);
    if (!rawEntry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
    }

    // Ownership check for self-service users (supports multiple linked profiles)
    if (req.session.user?.role === 'selfservice') {
      const profileId = safeParseLookupId(rawEntry[PROFILE_LOOKUP]);
      const ownIds = req.session.user.profileIds?.length ? req.session.user.profileIds : (req.session.user.profileId ? [req.session.user.profileId] : []);
      if (profileId === undefined || !ownIds.includes(profileId)) {
        res.status(403).json({ success: false, error: 'Not your entry' });
        return;
      }
    }

    const sessionId = safeParseLookupId(rawEntry[SESSION_LOOKUP]);
    const spSession = sessionId !== undefined
      ? (rawSessions as any[]).find((s: any) => s.ID === sessionId)
      : undefined;
    if (!spSession) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const groupId = safeParseLookupId(spSession[GROUP_LOOKUP]);
    const spGroup = groupId !== undefined
      ? (rawGroups as any[]).find((g: any) => g.ID === groupId)
      : undefined;
    const group = spGroup ? convertGroup(spGroup) : null;

    const profileId = safeParseLookupId(rawEntry[PROFILE_LOOKUP]);
    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profile = profileId !== undefined ? profiles.find(p => p.ID === profileId) : undefined;
    const profileName = profile?.Title || rawEntry[PROFILE_DISPLAY] || 'Volunteer';

    const driveId = mediaDriveId();
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files provided' });
      return;
    }

    const groupKey = (group?.lookupKeyName || '').toLowerCase();
    const date = spSession.Date;
    const folderPath = `${groupKey}/${date}`;
    let uploaded = 0;

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        console.warn(`[Upload] Rejected ${file.originalname}: unsupported type ${file.mimetype}`);
        continue;
      }
      const takenAt = exifDate(file.buffer) ?? new Date();
      const filename = mediaFilename(file.originalname, profileName, takenAt);
      const uploadedItem = await sharePointClient.uploadFile(driveId, `${folderPath}/${filename}`, file.buffer, file.mimetype);
      await sharePointClient.updateMediaItemFields(driveId, uploadedItem.id, { IsPublic: false });
      uploaded++;
    }

    if (uploaded > 0) {
      sharePointClient.clearMediaFolderCache(folderPath);
      sharePointClient.clearCacheByPrefix(`media-counts-${groupKey}`);
      // Update session Stats with fresh media count (fire-and-forget)
      if (sessionId !== undefined) {
        (async () => {
          try {
            const mediaCount = await sharePointClient.getSessionMediaCount(driveId, groupKey, date);
            await computeAndSaveSessionStats(sessionId, mediaCount);
          } catch (err) {
            console.error(`[Stats] Failed targeted update after upload for session ${sessionId}:`, err);
          }
        })();
      }
    }

    res.json({ success: true, data: { uploaded } });
  } catch (error: any) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ success: false, error: 'Upload failed', message: error.message });
  }
});

export = router;
