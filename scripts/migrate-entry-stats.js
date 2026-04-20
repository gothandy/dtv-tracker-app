/**
 * One-off migration: populate the Stats field on all past Entries list items.
 *
 * Translates historic Notes hashtags to compact EntryStats JSON.
 * Future entries (session date >= today) are cleared — left blank for the nightly sync.
 *
 * Safety: only writes the Stats field. Notes and all other fields are untouched.
 * Re-runnable: always processes all entries (overwrites existing stats).
 * Fully reversible: clear all Stats fields to return to current state.
 *
 * Run: npm run build && node scripts/migrate-entry-stats.js [--dry-run]
 */

require('dotenv').config();
const { entriesRepository } = require('../dist/services/repositories/entries-repository');
const { profilesRepository } = require('../dist/services/repositories/profiles-repository');
const { sessionsRepository } = require('../dist/services/repositories/sessions-repository');
const { SESSION_LOOKUP, PROFILE_LOOKUP, ACCOMPANYING_ADULT_LOOKUP } = require('../dist/services/field-names');
const { serializeEntryStats } = require('../dist/services/entry-stats');

const DRY_RUN = process.argv.includes('--dry-run');
const TODAY = new Date().toISOString().substring(0, 10);

function hasTag(notes, tag) {
  return new RegExp(`\\${tag}\\b`, 'i').test(String(notes || ''));
}

function computeStats(entry, profile, sessionLookupId) {
  const notes = String(entry.Notes || '');

  let profileStats = {};
  try { profileStats = JSON.parse(profile?.Stats || '{}'); } catch { /* malformed */ }

  // snapshot.booking
  let booking;
  if (hasTag(notes, '#Regular')) {
    booking = 'Regular';
  } else if (profileStats.sessionIds && profileStats.sessionIds.length > 0) {
    booking = profileStats.sessionIds[0] === sessionLookupId ? 'New' : undefined;
  } else {
    booking = hasTag(notes, '#New') ? 'New' : undefined;
  }

  const snapshot = {};
  if (booking)                                            snapshot.booking        = booking;
  if (profile?.IsGroup === true)                          snapshot.isGroup        = true;
  if (hasTag(notes, '#Child') || !!entry[ACCOMPANYING_ADULT_LOOKUP]) snapshot.isChild = true;
  if (hasTag(notes, '#NoPhoto'))                          snapshot.noPhoto        = true;
  if (hasTag(notes, '#NoConsent'))                        snapshot.noConsent      = true;
  if (hasTag(notes, '#DigLead'))                          snapshot.isDigLead      = true;
  if (hasTag(notes, '#FirstAider'))                       snapshot.isFirstAider   = true;

  const manual = {};
  if (hasTag(notes, '#CSR'))                              manual.csr        = true;
  if (hasTag(notes, '#Late'))                             manual.late       = true;
  if (hasTag(notes, '#DigLead'))                          manual.digLead    = true;
  if (hasTag(notes, '#FirstAider'))                       manual.firstAider = true;
  if (hasTag(notes, '#Eventbrite'))                       manual.eventbrite = true;
  if (hasTag(notes, '#Duplicate'))                        manual.duplicate  = true;

  return serializeEntryStats({
    snapshot: Object.keys(snapshot).length > 0 ? snapshot : undefined,
    manual: Object.keys(manual).length > 0 ? manual : undefined,
  });
}

async function main() {
  console.log(`[Migration] Starting entry stats migration${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);
  console.log(`[Migration] Today: ${TODAY} — past entries will get stats, future entries will be cleared`);
  const start = Date.now();

  const [entries, profiles, sessions] = await Promise.all([
    entriesRepository.getAll(),
    profilesRepository.getAll(),
    sessionsRepository.getAll(),
  ]);

  const profileMap = new Map(profiles.map(p => [p.ID, p]));
  const sessionDateMap = new Map(sessions.map(s => [s.ID, s.Date]));

  const past = [];
  for (const e of entries) {
    const sid = parseInt(e[SESSION_LOOKUP], 10);
    const date = sessionDateMap.get(sid);
    if (date && date < TODAY) past.push(e);
  }

  console.log(`[Migration] ${entries.length} entries — ${past.length} past (write stats), ${entries.length - past.length} future (skipped)`);

  let written = 0, errors = 0;

  // Past entries: compute and write compact stats
  for (let i = 0; i < past.length; i += 10) {
    const batch = past.slice(i, i + 10);
    await Promise.all(batch.map(async (entry) => {
      try {
        const profileId = entry[PROFILE_LOOKUP];
        const profile = profileId !== undefined ? profileMap.get(profileId) : undefined;
        const statsJson = computeStats(entry, profile, entry[SESSION_LOOKUP]);
        if (DRY_RUN) {
          console.log(`  Entry ${entry.ID} (profile ${entry[PROFILE_LOOKUP]}): ${statsJson}`);
        } else {
          await entriesRepository.updateStats(entry.ID, JSON.parse(statsJson));
        }
        written++;
      } catch (err) {
        console.error(`[Migration] Error on entry ${entry.ID}: ${err.message}`);
        errors++;
      }
    }));
    if (!DRY_RUN && (i + 10) % 500 === 0) console.log(`[Migration] Past progress: ${Math.min(i + 10, past.length)}/${past.length}`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[Migration] Complete in ${elapsed}s — written: ${written}, errors: ${errors}`);
}

main().catch(err => {
  console.error('[Migration] Fatal:', err);
  process.exit(1);
});
