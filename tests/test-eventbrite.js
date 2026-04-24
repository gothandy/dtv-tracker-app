require('dotenv').config();

const { sessionsRepository } = require('../dist/services/repositories/sessions-repository');
const { groupsRepository } = require('../dist/services/repositories/groups-repository');

const API_KEY = process.env.EVENTBRITE_API_KEY;
const BASE_URL = 'https://www.eventbriteapi.com/v3';

async function fetchEventbrite(path) {
  const url = `${BASE_URL}${path}`;
  console.log(`  GET ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Eventbrite API ${res.status}: ${text}`);
  }
  return res.json();
}

async function test() {
  console.log('=== Eventbrite Custom Questions Test ===\n');

  if (!API_KEY) {
    console.error('EVENTBRITE_API_KEY not set in .env');
    process.exit(1);
  }

  // Step 1: Find a Wednesday session with an Eventbrite Event ID
  console.log('Step 1: Finding a Wednesday session with Eventbrite Event ID...');
  const groups = await groupsRepository.getAll();
  const sessions = await sessionsRepository.getAll();

  // Find sessions with Eventbrite Event IDs
  const ebSessions = sessions
    .filter(s => s.EventbriteEventID)
    .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

  console.log(`  ${ebSessions.length} sessions have Eventbrite Event IDs`);
  if (ebSessions.length > 0) {
    console.log('  Most recent:');
    for (const s of ebSessions.slice(0, 5)) {
      const groupName = groups.find(g => g.ID === s.CrewLookupId)?.Name || 'No group';
      console.log(`    ${s.Date} - ${s.Title || s.Name} (${groupName}) - EB:${s.EventbriteEventID}`);
    }
  }

  // Find a Wednesday session with attendees (past session more likely to have them)
  const now = new Date();
  const pastWedSessions = ebSessions.filter(s => {
    const title = (s.Title || s.Name || '').toLowerCase();
    return title.includes('wed') && new Date(s.Date) < now;
  });
  console.log(`\n  ${pastWedSessions.length} past Wednesday sessions with EB IDs`);

  let session = pastWedSessions[0]; // most recent past Wednesday
  if (!session) {
    session = ebSessions.find(s => new Date(s.Date) < now) || ebSessions[0];
    console.log('  No past Wednesday EB sessions, using most recent past session');
  }
  if (!session) {
    // No sessions in SharePoint have EB IDs — try the Eventbrite org API directly
    console.log('\n  No sessions with Eventbrite IDs in SharePoint. Trying Eventbrite org API...');
    const orgEvents = await fetchEventbrite(`/organizations/YOUR_ORG_ID/events/?status=live&page_size=5`);
    console.log('  Live events:', JSON.stringify(orgEvents, null, 2).substring(0, 1000));
    process.exit(0);
  }
  console.log(`  Using session: ${session.Title || session.Name} (${session.Date})`);
  console.log(`  Eventbrite Event ID: ${session.EventbriteEventID}\n`);

  // Step 2: Get the custom questions defined for this event
  console.log('Step 2: Fetching custom questions for this event...');
  const questions = await fetchEventbrite(`/events/${session.EventbriteEventID}/questions/`);
  console.log(`  Found ${questions.questions?.length || 0} questions:`);
  if (questions.questions) {
    for (const q of questions.questions) {
      console.log(`    - [${q.id}] "${q.question?.html || q.question}" (type: ${q.type}, required: ${q.required})`);
    }
  }
  console.log();

  // Step 3: Get attendees with answers expanded
  console.log('Step 3: Fetching attendees with answers...');
  const attendees = await fetchEventbrite(
    `/events/${session.EventbriteEventID}/attendees/?status=attending&expand=answers`
  );
  console.log(`  Found ${attendees.attendees?.length || 0} attendees\n`);

  // Step 4: Inspect the first few attendees for answer data
  console.log('Step 4: Inspecting attendee answers...\n');
  const sample = (attendees.attendees || []).slice(0, 3);
  for (const attendee of sample) {
    console.log(`  --- ${attendee.profile?.name || 'Unknown'} ---`);
    console.log(`  Email: ${attendee.profile?.email || 'none'}`);
    console.log(`  Ticket: ${attendee.ticket_class_name || 'unknown'}`);

    if (attendee.answers && attendee.answers.length > 0) {
      console.log(`  Answers (${attendee.answers.length}):`);
      for (const ans of attendee.answers) {
        console.log(`    [Q${ans.question_id}] "${ans.question}" → "${ans.answer}"`);
      }
    } else {
      console.log('  Answers: none');
    }

    // Also check for any other fields that might contain answer data
    const interestingKeys = Object.keys(attendee).filter(
      k => !['id', 'created', 'changed', 'ticket_class_id', 'ticket_class_name',
             'profile', 'barcodes', 'checked_in', 'cancelled', 'refunded',
             'status', 'event_id', 'order_id', 'quantity', 'variant_id',
             'costs', 'resource_uri', 'delivery_method', 'assigned_unit'].includes(k)
    );
    if (interestingKeys.length > 0) {
      console.log(`  Other fields: ${interestingKeys.join(', ')}`);
      for (const key of interestingKeys) {
        const val = attendee[key];
        if (val !== null && val !== undefined && val !== '') {
          console.log(`    ${key}:`, typeof val === 'object' ? JSON.stringify(val).substring(0, 200) : val);
        }
      }
    }
    console.log();
  }

  // Step 5: Dump full first attendee JSON for inspection
  if (sample.length > 0) {
    console.log('Step 5: Full first attendee JSON (for field discovery):');
    console.log(JSON.stringify(sample[0], null, 2));
  }
}

test().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
