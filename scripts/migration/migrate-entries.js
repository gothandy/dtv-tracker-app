/**
 * Migrate Entries data from Members site → Tracker site
 *
 * Copy: Title, Count, Checked, Hours, Notes
 * Remap: EventLookupId → SessionLookupId (via sessions ID map)
 * Remap: VolunteerLookupId → ProfileLookupId (via profiles ID map)
 * Drop: FinancialYearFlow
 *
 * Usage: node scripts/migration/migrate-entries.js
 */

const fs = require('fs');
const path = require('path');
const {
  getSiteId, getSourceSiteId, getAllItems, createItem,
  SOURCE_ENTRIES_GUID
} = require('./graph-helper');

async function main() {
  const targetEntriesGuid = process.env.ENTRIES_LIST_GUID;
  if (!targetEntriesGuid || targetEntriesGuid === 'TODO') {
    console.error('ENTRIES_LIST_GUID not set in .env.tracker. Run create-entries-list.js first.');
    process.exit(1);
  }

  // Load ID maps
  const sessionsMapPath = path.resolve(__dirname, 'id-maps/sessions.json');
  const profilesMapPath = path.resolve(__dirname, 'id-maps/profiles.json');
  if (!fs.existsSync(sessionsMapPath) || !fs.existsSync(profilesMapPath)) {
    console.error('ID maps not found. Run migrate-sessions.js and migrate-profiles.js first.');
    process.exit(1);
  }
  const sessionsIdMap = JSON.parse(fs.readFileSync(sessionsMapPath, 'utf8'));
  const profilesIdMap = JSON.parse(fs.readFileSync(profilesMapPath, 'utf8'));

  console.log('Migrating Entries...');

  const sourceSiteId = await getSourceSiteId();
  const targetSiteId = await getSiteId();

  console.log(`Reading from source list ${SOURCE_ENTRIES_GUID}...`);
  const sourceItems = await getAllItems(sourceSiteId, SOURCE_ENTRIES_GUID);
  console.log(`Found ${sourceItems.length} entries`);

  let migrated = 0;
  let skipped = 0;

  for (const item of sourceItems) {
    const f = item.fields;

    const oldSessionId = f.EventLookupId;
    const oldProfileId = f.VolunteerLookupId;
    const newSessionId = oldSessionId ? sessionsIdMap[String(oldSessionId)] : null;
    const newProfileId = oldProfileId ? profilesIdMap[String(oldProfileId)] : null;

    if (oldSessionId && !newSessionId) {
      skipped++;
      continue;
    }
    if (oldProfileId && !newProfileId) {
      skipped++;
      continue;
    }

    const fields = {
      Title: f.Title || '',
      Count: f.Count ?? 1,
      Checked: f.Checked || false,
      Hours: f.Hours || 0,
      Notes: f.Notes || ''
    };

    if (newSessionId) {
      fields.SessionLookupId = newSessionId;
    }
    if (newProfileId) {
      fields.ProfileLookupId = newProfileId;
    }

    await createItem(targetSiteId, targetEntriesGuid, fields);
    migrated++;

    if (migrated % 100 === 0) {
      console.log(`  Migrated ${migrated}/${sourceItems.length}...`);
    }
  }

  console.log(`\n=== Entries migration complete ===`);
  console.log(`Migrated ${migrated} entries`);
  if (skipped) console.log(`Skipped ${skipped} (missing session/profile mapping)`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Failed:', err.response?.data || err.message);
    process.exit(1);
  });
}

module.exports = main;
