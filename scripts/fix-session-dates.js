/**
 * One-off correction script: fix session Date fields that don't match their Title date.
 * All affected sessions were created on 2026-02-15 during the initial data migration
 * when SharePoint's timezone was misconfigured.
 *
 * The Title field was unaffected and holds the correct date.
 * This script updates the Date field to match the Title date, stored as noon UTC
 * to avoid any future timezone shift.
 *
 * Dry run by default — pass --apply to commit changes.
 *
 * Run: node scripts/fix-session-dates.js [--apply]
 * (requires npm run build first)
 */

require('dotenv').config();
const { sessionsRepository } = require('../dist/services/repositories/sessions-repository');
const { sharePointClient } = require('../dist/services/sharepoint-client');

const DRY_RUN = !process.argv.includes('--apply');

const londonFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function londonDate(isoString) {
  if (!isoString) return null;
  return londonFormatter.format(new Date(isoString));
}

async function fix() {
  console.log(DRY_RUN ? '--- DRY RUN (pass --apply to commit) ---\n' : '--- APPLYING CHANGES ---\n');

  const sessions = await sessionsRepository.getAll();
  console.log(`Fetched ${sessions.length} sessions.\n`);

  const toFix = [];

  for (const s of sessions) {
    const titleDate = s.Title ? s.Title.substring(0, 10) : null;
    if (!titleDate || !/^\d{4}-\d{2}-\d{2}$/.test(titleDate)) continue;

    const storedDate = londonDate(s.Date);
    if (!storedDate) continue;

    if (titleDate !== storedDate) {
      toFix.push({ id: s.ID, title: s.Title, titleDate, storedDate });
    }
  }

  if (toFix.length === 0) {
    console.log('✓ Nothing to fix — all Title dates already match Date field values.');
    return;
  }

  console.log(`${toFix.length} session(s) to correct:\n`);
  console.log('ID'.padEnd(6), 'Title'.padEnd(30), 'Stored date'.padEnd(12), '→  Correct date');
  console.log('-'.repeat(70));
  for (const s of toFix) {
    console.log(String(s.id).padEnd(6), s.title.substring(0, 29).padEnd(30), s.storedDate.padEnd(12), '→ ', s.titleDate);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Run with --apply to commit these changes.');
    return;
  }

  console.log('\nApplying...');
  const listGuid = process.env.SESSIONS_LIST_GUID;
  if (!listGuid) throw new Error('SESSIONS_LIST_GUID not set');

  let updated = 0;
  let failed = 0;
  for (const s of toFix) {
    try {
      await sharePointClient.updateListItem(listGuid, s.id, {
        Date: `${s.titleDate}T12:00:00Z`
      });
      console.log(`  ✓ ID ${s.id}: ${s.storedDate} → ${s.titleDate}`);
      updated++;
    } catch (err) {
      console.error(`  ✗ ID ${s.id}: ${err.message}`);
      failed++;
    }
  }

  sharePointClient.clearCache();
  console.log(`\nDone: ${updated} updated, ${failed} failed.`);
}

fix().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
