/**
 * Diagnostic script: check whether each session's stored Date UTC value matches
 * what the SharePoint UI would store — i.e. midnight in the site timezone → UTC.
 *
 * Uses luxon to convert Title date (YYYY-MM-DD) → midnight site time → UTC.
 * Fetches raw UTC strings from SharePoint (no date conversion) and compares.
 *
 * Run: npm run build && node scripts/check-session-dates.js
 */

require('dotenv').config();
const { DateTime } = require('luxon');
const { sharePointClient } = require('../dist/services/sharepoint-client');

const SHAREPOINT_TIMEZONE = process.env.SHAREPOINT_TIMEZONE || 'Europe/London';
const LIST_GUID = process.env.SESSIONS_LIST_GUID;

const CHECKPOINTS = [484, 470]; // known manually-entered sessions (winter, summer)

/** Convert YYYY-MM-DD at midnight in the site timezone to UTC ISO string */
function midnightSiteTimeAsUTC(dateStr) {
  return DateTime.fromISO(dateStr, { zone: SHAREPOINT_TIMEZONE }).toUTC().toISO();
}

/** Strip milliseconds for comparison: "2026-08-14T23:00:00.000Z" → "2026-08-14T23:00:00Z" */
function normalizeUtc(isoStr) {
  return isoStr ? isoStr.replace('.000Z', 'Z') : null;
}

async function check() {
  console.log(`Site timezone: ${SHAREPOINT_TIMEZONE}\n`);

  // Fetch raw sessions — empty dateOnlyFields so Date comes back as the raw UTC ISO string
  const sessions = await sharePointClient.getListItems(LIST_GUID, 'ID,Title,Date', null, null, []);
  console.log(`Total sessions fetched: ${sessions.length}\n`);

  // --- Checkpoints ---
  console.log('--- Checkpoints ---\n');
  for (const id of CHECKPOINTS) {
    const s = sessions.find(s => s.ID === id);
    if (!s) { console.log(`ID ${id}: not found\n`); continue; }
    const titleDate = (s.Title || '').substring(0, 10);
    const expectedUtc = normalizeUtc(midnightSiteTimeAsUTC(titleDate));
    const storedUtc   = normalizeUtc(s.Date);
    const ok = expectedUtc === storedUtc;
    console.log(`ID ${id}: "${s.Title}"`);
    console.log(`  Expected UTC : ${expectedUtc}`);
    console.log(`  Stored UTC   : ${storedUtc}`);
    console.log(`  ${ok ? '✓ CORRECT' : '✗ INCORRECT'}\n`);
  }

  // --- Full check ---
  let checked = 0, correct = 0, incorrect = 0;
  const incorrectList = [];

  for (const s of sessions) {
    const titleDate = s.Title ? s.Title.substring(0, 10) : null;
    if (!titleDate || !/^\d{4}-\d{2}-\d{2}$/.test(titleDate)) continue;
    if (!s.Date) continue;
    checked++;

    const expectedUtc = normalizeUtc(midnightSiteTimeAsUTC(titleDate));
    const storedUtc   = normalizeUtc(s.Date);

    if (expectedUtc === storedUtc) {
      correct++;
    } else {
      incorrect++;
      incorrectList.push({ id: s.ID, title: s.Title, expectedUtc, storedUtc });
    }
  }

  console.log('--- Results ---\n');
  console.log(`Sessions with a Title date : ${checked}`);
  console.log(`Correct                    : ${correct}`);
  console.log(`Incorrect                  : ${incorrect}`);

  if (incorrectList.length > 0) {
    console.log('\nIncorrect sessions:');
    console.log('ID'.padEnd(6), 'Title'.padEnd(35), 'Expected UTC'.padEnd(25), 'Stored UTC');
    console.log('-'.repeat(95));
    for (const s of incorrectList) {
      console.log(
        String(s.id).padEnd(6),
        (s.title || '').substring(0, 34).padEnd(35),
        (s.expectedUtc || '?').padEnd(25),
        s.storedUtc || '?'
      );
    }
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_KEYWORDS = { 'Sun': 0, 'Mon': 1, 'Wed': 3, 'Fri': 5, 'Sat': 6 };

async function checkDayOfWeek() {
  const sessions = await sharePointClient.getListItems(LIST_GUID, 'ID,Title', null, null, []);

  console.log('\n--- Day-of-week check ---\n');
  const problems = [];

  for (const s of sessions) {
    const titleDate = s.Title ? s.Title.substring(0, 10) : null;
    if (!titleDate || !/^\d{4}-\d{2}-\d{2}$/.test(titleDate)) continue;

    const suffix = s.Title.substring(11).trim();
    const keyword = Object.keys(DAY_KEYWORDS).find(k => suffix.startsWith(k));
    if (!keyword) continue;

    // Parse title date at noon UTC to avoid any timezone shift on the day boundary
    const actualDay = new Date(`${titleDate}T12:00:00Z`).getUTCDay();
    const expectedDay = DAY_KEYWORDS[keyword];

    if (actualDay !== expectedDay) {
      problems.push({
        id: s.ID,
        title: s.Title,
        titleDate,
        actual: DAY_NAMES[actualDay],
        expected: DAY_NAMES[expectedDay]
      });
    }
  }

  if (problems.length === 0) {
    console.log('✓ All titled sessions fall on the expected day of the week.');
    return;
  }

  console.log(`${problems.length} mismatch(es):\n`);
  for (const p of problems) {
    console.log(`  ID ${p.id}: "${p.title}" — ${p.titleDate} is a ${p.actual}, title says ${p.expected}`);
  }
}

check()
  .then(() => checkDayOfWeek())
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
