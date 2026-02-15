/**
 * One-off import: backfill historic consent records from Eventbrite
 *
 * Only processes Wed sessions (the only ones with consent questions).
 * Processes in date order (oldest first) so the latest answer wins.
 * Deletes all existing records first for a clean import.
 * One record per profile per type, with Status (Accepted/Declined).
 *
 * Usage: node scripts/migration/import-historic-consent.js
 */

const { getSiteId, getAllItems, createItem, getAccessToken } = require('./graph-helper');
const axios = require('axios');

const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
const EB_BASE = 'https://www.eventbriteapi.com/v3';

const CONSENT_MAP = {
  '315115173': 'Privacy Consent',
  '315115803': 'Photo Consent'
};

async function fetchEventbrite(path) {
  const url = `${EB_BASE}${path}`;
  console.log(`  [EB] GET ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${EVENTBRITE_API_KEY}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Eventbrite API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getAttendeesWithAnswers(eventId) {
  const all = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchEventbrite(
      `/events/${eventId}/attendees/?status=attending&expand=answers&page=${page}`
    );
    all.push(...(data.attendees || []));
    hasMore = data.pagination?.has_more_items || false;
    page++;
  }
  return all;
}

async function main() {
  if (!EVENTBRITE_API_KEY) {
    console.error('EVENTBRITE_API_KEY not set in .env.tracker');
    process.exit(1);
  }

  const recordsListGuid = process.env.RECORDS_LIST_GUID;
  if (!recordsListGuid) {
    console.error('RECORDS_LIST_GUID not set in .env.tracker');
    process.exit(1);
  }

  console.log('=== Historic Consent Import ===\n');

  const siteId = await getSiteId();
  console.log(`Site ID: ${siteId}`);

  // Load sessions and profiles from Tracker site
  const sessionsListGuid = process.env.SESSIONS_LIST_GUID;
  const profilesListGuid = process.env.PROFILES_LIST_GUID;

  console.log('\nLoading sessions...');
  const sessions = await getAllItems(siteId, sessionsListGuid);
  console.log(`  ${sessions.length} sessions`);

  console.log('Loading profiles...');
  const profiles = await getAllItems(siteId, profilesListGuid);
  console.log(`  ${profiles.length} profiles`);

  // Delete all existing records for a clean import
  console.log('\nDeleting existing records...');
  const existingRecords = await getAllItems(siteId, recordsListGuid);
  console.log(`  ${existingRecords.length} records to delete`);
  const token = await getAccessToken();
  for (const r of existingRecords) {
    await axios.delete(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${recordsListGuid}/items/${r.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }
  console.log(`  Deleted ${existingRecords.length} records`);

  // Build profile lookup by MatchName and Title (case-insensitive)
  const profileByMatchName = new Map();
  const profileByTitle = new Map();
  for (const p of profiles) {
    const f = p.fields;
    if (f.MatchName) profileByMatchName.set(f.MatchName.toLowerCase(), f);
    if (f.Title) profileByTitle.set(f.Title.toLowerCase(), f);
  }

  // Filter to Wed sessions with Eventbrite IDs from Oct 2025+, sort by date ascending
  const CUTOFF = '2025-10-01';
  const wedSessions = sessions
    .filter(s => s.fields.EventbriteEventID && (s.fields.Title || '').includes('Wed')
      && (s.fields.Date || '') >= CUTOFF)
    .sort((a, b) => (a.fields.Date || '').localeCompare(b.fields.Date || ''));
  console.log(`\n${wedSessions.length} Wed sessions from ${CUTOFF} with Eventbrite IDs (date order)\n`);

  // Track records: key = "profileId|type" → { status, date }
  // Process in date order so later sessions overwrite earlier ones
  const recordMap = new Map();
  let noProfile = 0;

  for (const session of wedSessions) {
    const eventId = session.fields.EventbriteEventID;
    const sessionDate = session.fields.Date || '';
    const sessionTitle = session.fields.Title || 'Unknown';
    console.log(`\nSession: ${sessionTitle} (${sessionDate}) — EB:${eventId}`);

    let attendees;
    try {
      attendees = await getAttendeesWithAnswers(eventId);
    } catch (err) {
      console.log(`  Error fetching attendees: ${err.message}`);
      continue;
    }
    console.log(`  ${attendees.length} attendees`);

    for (const attendee of attendees) {
      const name = attendee.profile?.name;
      if (!name) continue;

      const nameLower = name.toLowerCase();
      const profile = profileByMatchName.get(nameLower) || profileByTitle.get(nameLower);
      if (!profile) {
        noProfile++;
        continue;
      }

      const answers = attendee.answers || [];
      for (const ans of answers) {
        const type = CONSENT_MAP[ans.question_id];
        if (!type) continue;

        const status = ans.answer === 'accepted' ? 'Accepted' : 'Declined';
        const dateStr = attendee.created
          ? new Date(attendee.created).toISOString()
          : new Date().toISOString();

        const key = `${profile.id}|${type}`;
        recordMap.set(key, { profileId: profile.id, name, type, status, date: dateStr });
      }
    }
  }

  // Create all records
  console.log(`\nCreating ${recordMap.size} records...`);
  let created = 0;
  let errors = 0;

  for (const [key, rec] of recordMap) {
    try {
      await createItem(siteId, recordsListGuid, {
        ProfileLookupId: rec.profileId,
        Type: rec.type,
        Status: rec.status,
        Date: rec.date
      });
      created++;
      console.log(`  + ${rec.name} → ${rec.type}: ${rec.status}`);
    } catch (err) {
      errors++;
      const detail = err.response?.data?.error || err.response?.data || err.message;
      console.log(`  ! Error for ${rec.name} → ${rec.type}: ${JSON.stringify(detail)}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Created: ${created} records`);
  console.log(`Errors: ${errors}`);
  console.log(`No profile match: ${noProfile}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
