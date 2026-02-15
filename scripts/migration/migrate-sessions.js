/**
 * Migrate Sessions data from Members site → Tracker site
 *
 * Copy: Title, Name, Date, Registrations, Hours, EventbriteEventID, Url
 * Remap: CrewLookupId → GroupLookupId (via groups ID map)
 * Rename: Description → Notes
 * Drop: FinancialYearFlow
 * Saves ID map to id-maps/sessions.json (old ID → new ID)
 *
 * Usage: node scripts/migration/migrate-sessions.js
 */

const fs = require('fs');
const path = require('path');
const {
  getSiteId, getSourceSiteId, getAllItems, createItem,
  SOURCE_SESSIONS_GUID
} = require('./graph-helper');

async function main() {
  const targetSessionsGuid = process.env.SESSIONS_LIST_GUID;
  if (!targetSessionsGuid || targetSessionsGuid === 'TODO') {
    console.error('SESSIONS_LIST_GUID not set in .env.tracker. Run create-sessions-list.js first.');
    process.exit(1);
  }

  // Load groups ID map
  const mapPath = path.resolve(__dirname, 'id-maps/groups.json');
  if (!fs.existsSync(mapPath)) {
    console.error('Groups ID map not found. Run migrate-groups.js first.');
    process.exit(1);
  }
  const groupsIdMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

  console.log('Migrating Sessions...');

  const sourceSiteId = await getSourceSiteId();
  const targetSiteId = await getSiteId();

  console.log(`Reading from source list ${SOURCE_SESSIONS_GUID}...`);
  const sourceItems = await getAllItems(sourceSiteId, SOURCE_SESSIONS_GUID);
  console.log(`Found ${sourceItems.length} sessions`);

  const idMap = {};
  let skipped = 0;

  for (const item of sourceItems) {
    const f = item.fields;

    // Remap group lookup
    const oldGroupId = f.CrewLookupId;
    const newGroupId = oldGroupId ? groupsIdMap[String(oldGroupId)] : null;
    if (oldGroupId && !newGroupId) {
      console.warn(`  Warning: No mapping for group ID ${oldGroupId}, skipping lookup for session "${f.Title}"`);
    }

    const fields = {
      Title: f.Title || '',
      Name: f.Name || '',
      Notes: f.Description || '',
      EventbriteEventID: f.EventbriteEventID || ''
    };

    // Date is required
    if (f.Date) {
      fields.Date = f.Date;
    }

    // Lookup
    if (newGroupId) {
      fields.GroupLookupId = newGroupId;
    }

    const oldId = parseInt(item.id, 10);
    const newId = await createItem(targetSiteId, targetSessionsGuid, fields);
    idMap[oldId] = newId;

    if (Object.keys(idMap).length % 50 === 0) {
      console.log(`  Migrated ${Object.keys(idMap).length}/${sourceItems.length}...`);
    }
  }

  // Save ID map
  const mapDir = path.resolve(__dirname, 'id-maps');
  fs.writeFileSync(path.join(mapDir, 'sessions.json'), JSON.stringify(idMap, null, 2));

  console.log(`\n=== Sessions migration complete ===`);
  console.log(`Migrated ${sourceItems.length} sessions`);
  if (skipped) console.log(`Skipped ${skipped} (missing group mapping)`);
  console.log(`ID map saved to scripts/migration/id-maps/sessions.json`);

  return idMap;
}

if (require.main === module) {
  main().catch(err => {
    console.error('Failed:', err.response?.data || err.message);
    process.exit(1);
  });
}

module.exports = main;
