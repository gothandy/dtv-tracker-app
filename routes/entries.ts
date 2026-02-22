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
  nameToSlug
} from '../services/data-layer';
import {
  GROUP_LOOKUP,
  SESSION_LOOKUP,
  PROFILE_LOOKUP, PROFILE_DISPLAY
} from '../services/field-names';
import { getAttendees } from '../services/eventbrite-client';
import type { EntryDetailResponse } from '../types/api-responses';
import type { ApiResponse } from '../types/sharepoint';

const router: Router = express.Router();

function isNewVolunteer(allEntries: any[], profileId: number, currentSessionId: number): boolean {
  return !allEntries.some(e => {
    const vid = safeParseLookupId(e[PROFILE_LOOKUP]);
    const sid = safeParseLookupId(e[SESSION_LOOKUP]);
    return vid === profileId && sid !== currentSessionId;
  });
}

function appendNewTag(notes: string | undefined): string {
  const base = notes || '';
  if (/#New\b/i.test(base)) return base;
  return base ? `${base} #New` : '#New';
}

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
    const spEntry = entries.find(e => {
      if (safeParseLookupId(e[SESSION_LOOKUP]) !== spSession.ID) return false;
      return nameToSlug(e[PROFILE_DISPLAY]) === slug;
    });
    if (!spEntry) {
      res.status(404).json({ success: false, error: 'Entry not found' });
      return;
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

    const data: EntryDetailResponse = {
      id: spEntry.ID,
      volunteerName: spEntry[PROFILE_DISPLAY],
      volunteerSlug: nameToSlug(spEntry[PROFILE_DISPLAY]),
      isGroup: profile?.IsGroup || false,
      hoursLastFY: Math.round(calcLastFY * 10) / 10,
      hoursThisFY: Math.round(calcThisFY * 10) / 10,
      volunteerEntryCount: volunteerEntries.length,
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

router.patch('/entries/:id', async (req: Request, res: Response) => {
  try {
    const entryId = parseInt(String(req.params.id), 10);
    if (isNaN(entryId)) {
      res.status(400).json({ success: false, error: 'Invalid entry ID' });
      return;
    }

    const { checkedIn, count, hours, notes } = req.body;
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

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    await entriesRepository.updateFields(entryId, fields);
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

    await entriesRepository.delete(entryId);
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
    const { volunteerId, notes } = req.body;

    if (!volunteerId || typeof volunteerId !== 'number') {
      res.status(400).json({ success: false, error: 'volunteerId is required and must be a number' });
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

    const id = await entriesRepository.create(fields);
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

        // Match to existing profile: MatchName first, then Title
        const nameLower = attendeeName.toLowerCase();
        let profile = profiles.find(p =>
          p.MatchName && p.MatchName.toLowerCase() === nameLower
        ) || profiles.find(p =>
          p.Title && p.Title.toLowerCase() === nameLower
        );

        if (!profile) {
          const newId = await profilesRepository.create({
            Title: attendeeName,
            Email: attendeeEmail || undefined
          });
          console.log(`[Refresh] Created profile: ${attendeeName} (ID: ${newId})`);
          profile = { ID: newId, Title: attendeeName, Email: attendeeEmail, MatchName: undefined, IsGroup: false } as any;
          profiles.push(profile!);
          newProfiles++;
        }

        // Create entry if not already registered
        const profileId = profile!.ID;
        if (!existingVolunteerIds.has(profileId)) {
          const entryFields: Record<string, any> = {
            [SESSION_LOOKUP]: String(spSession.ID),
            [PROFILE_LOOKUP]: String(profileId)
          };
          const noteTags: string[] = [];
          if (isNewVolunteer(entries, profileId, spSession.ID)) noteTags.push('#New');
          if (attendee.ticket_class_name?.toLowerCase().includes('child')) noteTags.push('#Child');
          noteTags.push('#Eventbrite');
          entryFields.Notes = noteTags.join(' ');
          await entriesRepository.create(entryFields);
          existingVolunteerIds.add(profileId);
          addedFromEventbrite++;
        }

        // Upsert consent records from Eventbrite answers
        if (recordsRepository.available && attendee.answers) {
          const consentMap: Record<string, string> = {
            'Personal Data Consent': 'Privacy Consent',
            'Photo and Video Consent': 'Photo Consent'
          };
          for (const ans of attendee.answers) {
            if (!ans.answer) continue; // skip attendees who registered before the form was added
            const type = consentMap[ans.question] ?? null;
            if (!type) continue;
            const status = ans.answer === 'accepted' ? 'Accepted' : 'Declined';
            const date = attendee.created || new Date().toISOString();
            const existing = rawRecords.find(r =>
              safeParseLookupId(r.ProfileLookupId as unknown as string) === profileId && r.Type === type
            );
            if (existing) {
              await recordsRepository.update(existing.ID, { Status: status, Date: date });
            } else {
              const newId = await recordsRepository.create({ ProfileLookupId: profileId, Type: type, Status: status, Date: date });
              rawRecords.push({ ID: newId, ProfileLookupId: profileId, Type: type, Status: status, Date: date } as any);
            }
            updatedRecords++;
          }
        }
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

    console.log(`[Refresh] Done: ${addedRegulars} regulars, ${addedFromEventbrite} eventbrite, ${newProfiles} new profiles, ${updatedRecords} records, ${noPhotoTagged} #NoPhoto`);
    res.json({
      success: true,
      data: { addedRegulars, addedFromEventbrite, newProfiles, updatedRecords, noPhotoTagged }
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

export = router;
