/**
 * Diagnostic script: Check for sessions where the Title date doesn't match
 * the Date field value. Read-only — no writes.
 *
 * Run: node scripts/check-session-dates.js
 * (requires npm run build first)
 */

require('dotenv').config();
const { sessionsRepository } = require('../dist/services/repositories/sessions-repository');

const londonFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function londonDate(isoString) {
  if (!isoString) return null;
  return londonFormatter.format(new Date(isoString)); // returns "YYYY-MM-DD"
}

function createdDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toISOString().substring(0, 10);
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Groups whose title suffix indicates an expected day of week
const DAY_KEYWORDS = {
  'Wed': 3,  // Wednesday
  'Sat': 6,  // Saturday
  'Sun': 0,  // Sunday
  'Mon': 1,
  'Fri': 5,
};

function getDayOfWeekFromDate(isoDate) {
  // Parse YYYY-MM-DD as local noon UTC to avoid timezone shifts
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat
}

async function check() {
  console.log('Fetching all sessions from SharePoint...\n');
  const sessions = await sessionsRepository.getAll();
  console.log(`Total sessions: ${sessions.length}\n`);

  const mismatches = [];

  for (const s of sessions) {
    const titleDate = s.Title ? s.Title.substring(0, 10) : null;
    const storedDate = londonDate(s.Date);

    // Only flag sessions where the Title starts with a date-like string
    if (!titleDate || !/^\d{4}-\d{2}-\d{2}$/.test(titleDate)) continue;
    if (!storedDate) continue;

    if (titleDate !== storedDate) {
      mismatches.push({
        id: s.ID,
        title: s.Title,
        titleDate,
        storedDate,
        rawDate: s.Date,
        created: createdDate(s.Created),
        hasEventbriteId: !!s.EventbriteEventID
      });
    }
  }

  if (mismatches.length === 0) {
    console.log('✓ No mismatches found — all Title dates match Date field values.');
    return;
  }

  console.log(`Found ${mismatches.length} mismatch(es):\n`);
  console.log('ID'.padEnd(6), 'Title'.padEnd(30), 'Title date'.padEnd(12), 'Stored date'.padEnd(12), 'Created'.padEnd(12), 'Eventbrite');
  console.log('-'.repeat(90));

  const createdDates = new Set();
  for (const m of mismatches) {
    createdDates.add(m.created);
    console.log(
      String(m.id).padEnd(6),
      (m.title || '').substring(0, 29).padEnd(30),
      m.titleDate.padEnd(12),
      m.storedDate.padEnd(12),
      (m.created || '?').padEnd(12),
      m.hasEventbriteId ? 'yes' : 'no'
    );
  }

  console.log('\nUnique created dates among mismatches:', [...createdDates].sort().join(', '));

  const allFeb15 = [...createdDates].every(d => d === '2026-02-15');
  if (allFeb15) {
    console.log('✓ All mismatches were created on 2026-02-15 — confirms the Feb 15 migration issue.');
  } else {
    console.log('⚠ Not all mismatches are from 2026-02-15 — review before running the fix script.');
  }

  // Day-of-week check: verify Wed/Sat/etc sessions fall on the right day (using Title date)
  console.log('\n--- Day-of-week check (using Title date) ---\n');
  const dowProblems = [];
  for (const s of sessions) {
    const titleDate = s.Title ? s.Title.substring(0, 10) : null;
    if (!titleDate || !/^\d{4}-\d{2}-\d{2}$/.test(titleDate)) continue;

    const titleSuffix = s.Title.substring(11).trim(); // e.g. "Wed", "Sat Dig"
    const matchedKeyword = Object.keys(DAY_KEYWORDS).find(k => titleSuffix.startsWith(k));
    if (!matchedKeyword) continue;

    const expectedDay = DAY_KEYWORDS[matchedKeyword];
    const actualDay = getDayOfWeekFromDate(titleDate);
    if (actualDay !== expectedDay) {
      dowProblems.push({
        id: s.ID,
        title: s.Title,
        titleDate,
        actualDay: DAY_NAMES[actualDay],
        expectedDay: DAY_NAMES[expectedDay],
        created: createdDate(s.Created)
      });
    }
  }

  if (dowProblems.length === 0) {
    console.log('✓ All Wed/Sat/etc sessions fall on the correct day of the week.');
  } else {
    console.log(`Found ${dowProblems.length} day-of-week mismatch(es):\n`);
    for (const p of dowProblems) {
      console.log(`  ID ${p.id}: "${p.title}" — Title date ${p.titleDate} is a ${p.actualDay}, expected ${p.expectedDay} (created ${p.created})`);
    }
  }
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
