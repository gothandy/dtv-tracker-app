/**
 * Migrate Groups data from Members site → Tracker site
 *
 * Direct copy: Title, Name, Description, EventbriteSeriesID
 * Saves ID map to id-maps/groups.json (old ID → new ID)
 *
 * Usage: node scripts/migration/migrate-groups.js
 */

const fs = require('fs');
const path = require('path');
const {
  getSiteId, getSourceSiteId, getAllItems, createItem,
  SOURCE_GROUPS_GUID
} = require('./graph-helper');

async function main() {
  const targetGroupsGuid = process.env.GROUPS_LIST_GUID;
  if (!targetGroupsGuid || targetGroupsGuid === 'TODO') {
    console.error('GROUPS_LIST_GUID not set in .env.tracker. Run create-groups-list.js first.');
    process.exit(1);
  }

  console.log('Migrating Groups...');

  const sourceSiteId = await getSourceSiteId();
  const targetSiteId = await getSiteId();

  // Read all groups from source
  console.log(`Reading from source list ${SOURCE_GROUPS_GUID}...`);
  const sourceItems = await getAllItems(sourceSiteId, SOURCE_GROUPS_GUID);
  console.log(`Found ${sourceItems.length} groups`);

  // Migrate each group and build ID map
  const idMap = {};

  for (const item of sourceItems) {
    const f = item.fields;
    const fields = {
      Title: f.Title || '',
      Name: f.Name || '',
      Description: f.Description || '',
      EventbriteSeriesID: f.EventbriteSeriesID || ''
    };

    const oldId = parseInt(item.id, 10);
    const newId = await createItem(targetSiteId, targetGroupsGuid, fields);
    idMap[oldId] = newId;
    console.log(`  ${f.Title || f.Name} (${oldId} → ${newId})`);
  }

  // Save ID map
  const mapDir = path.resolve(__dirname, 'id-maps');
  if (!fs.existsSync(mapDir)) {
    fs.mkdirSync(mapDir, { recursive: true });
  }
  fs.writeFileSync(path.join(mapDir, 'groups.json'), JSON.stringify(idMap, null, 2));

  console.log(`\n=== Groups migration complete ===`);
  console.log(`Migrated ${sourceItems.length} groups`);
  console.log(`ID map saved to scripts/migration/id-maps/groups.json`);

  return idMap;
}

// Allow running standalone or as module
if (require.main === module) {
  main().catch(err => {
    console.error('Failed:', err.response?.data || err.message);
    process.exit(1);
  });
}

module.exports = main;
