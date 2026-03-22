/**
 * One-off fix script: normalize session Date UTC values to midnight in the site timezone.
 *
 * 89 sessions have stored UTC values from historical issues (Pacific time config,
 * or the previous fix script using noon UTC). This script corrects them all.
 *
 * Dry run by default — pass --apply to commit changes to SharePoint.
 *
 * Run: npm run build && node scripts/normalize-session-dates.js [--apply]
 */

require('dotenv').config();
const { DateTime } = require('luxon');
const { sharePointClient } = require('../dist/services/sharepoint-client');

const SHAREPOINT_TIMEZONE = process.env.SHAREPOINT_TIMEZONE || 'Europe/London';
const LIST_GUID = process.env.SESSIONS_LIST_GUID;
const DRY_RUN = !process.argv.includes('--apply');

/** Convert YYYY-MM-DD at midnight in the site timezone to UTC ISO string */
function midnightSiteTimeAsUTC(dateStr) {
  return DateTime.fromISO(dateStr, { zone: SHAREPOINT_TIMEZONE }).toUTC().toISO();
}

/** Strip milliseconds: "2026-08-14T23:00:00.000Z" → "2026-08-14T23:00:00Z" */
function normalizeUtc(isoStr) {
  return isoStr ? isoStr.replace('.000Z', 'Z') : null;
}

async function run() {
  console.log(DRY_RUN ? '--- DRY RUN (pass --apply to commit) ---\n' : '--- APPLYING CHANGES ---\n');
  console.log(`Site timezone: ${SHAREPOINT_TIMEZONE}\n`);

  // Fetch raw sessions — empty dateOnlyFields so Date is the raw UTC ISO string
  const sessions = await sharePointClient.getListItems(LIST_GUID, 'ID,Title,Date', null, null, []);
  console.log(`Sessions fetched: ${sessions.length}\n`);

  const toFix = [];

  for (const s of sessions) {
    const titleDate = s.Title ? s.Title.substring(0, 10) : null;
    if (!titleDate || !/^\d{4}-\d{2}-\d{2}$/.test(titleDate)) continue;
    if (!s.Date) continue;

    const expectedUtc = normalizeUtc(midnightSiteTimeAsUTC(titleDate));
    const storedUtc   = normalizeUtc(s.Date);

    if (expectedUtc !== storedUtc) {
      toFix.push({ id: s.ID, title: s.Title, storedUtc, expectedUtc });
    }
  }

  if (toFix.length === 0) {
    console.log('✓ Nothing to fix — all Date values are correct.');
    return;
  }

  console.log(`${toFix.length} session(s) to correct:\n`);
  console.log('ID'.padEnd(6), 'Title'.padEnd(35), 'Stored UTC'.padEnd(25), '→  Expected UTC');
  console.log('-'.repeat(95));
  for (const s of toFix) {
    console.log(
      String(s.id).padEnd(6),
      (s.title || '').substring(0, 34).padEnd(35),
      (s.storedUtc || '?').padEnd(25),
      '→ ', s.expectedUtc
    );
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Run with --apply to commit these changes.');
    return;
  }

  console.log('\nApplying...');
  let updated = 0, failed = 0;

  for (const s of toFix) {
    try {
      // Write raw UTC directly — no dateOnlyFields, so no conversion is applied
      await sharePointClient.updateListItem(LIST_GUID, s.id, { Date: s.expectedUtc });
      console.log(`  ✓ ID ${s.id}: ${s.storedUtc} → ${s.expectedUtc}`);
      updated++;
    } catch (err) {
      console.error(`  ✗ ID ${s.id}: ${err.message}`);
      failed++;
    }
  }

  sharePointClient.clearCache();
  console.log(`\nDone: ${updated} updated, ${failed} failed.`);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
