/**
 * Migrate Profiles data from Members site → Tracker site
 *
 * Copy: Title, Email, MatchName, IsGroup
 * Drop: HoursLastFY, HoursThisFY (app calculates from entries)
 * New fields start empty: DataConsent, PhotoConsent
 * Saves ID map to id-maps/profiles.json (old ID → new ID)
 *
 * Usage: node scripts/migration/migrate-profiles.js
 */

const fs = require('fs');
const path = require('path');
const {
  getSiteId, getSourceSiteId, getAllItems, createItem,
  SOURCE_PROFILES_GUID
} = require('./graph-helper');

async function main() {
  const targetProfilesGuid = process.env.PROFILES_LIST_GUID;
  if (!targetProfilesGuid || targetProfilesGuid === 'TODO') {
    console.error('PROFILES_LIST_GUID not set in .env.tracker. Run create-profiles-list.js first.');
    process.exit(1);
  }

  console.log('Migrating Profiles...');

  const sourceSiteId = await getSourceSiteId();
  const targetSiteId = await getSiteId();

  console.log(`Reading from source list ${SOURCE_PROFILES_GUID}...`);
  const sourceItems = await getAllItems(sourceSiteId, SOURCE_PROFILES_GUID);
  console.log(`Found ${sourceItems.length} profiles`);

  const idMap = {};

  for (const item of sourceItems) {
    const f = item.fields;
    const fields = {
      Title: f.Title || '',
      Email: f.Email || '',
      MatchName: f.MatchName || '',
      IsGroup: f.IsGroup || false
    };

    const oldId = parseInt(item.id, 10);
    const newId = await createItem(targetSiteId, targetProfilesGuid, fields);
    idMap[oldId] = newId;

    if (Object.keys(idMap).length % 50 === 0) {
      console.log(`  Migrated ${Object.keys(idMap).length}/${sourceItems.length}...`);
    }
  }

  // Save ID map
  const mapDir = path.resolve(__dirname, 'id-maps');
  if (!fs.existsSync(mapDir)) {
    fs.mkdirSync(mapDir, { recursive: true });
  }
  fs.writeFileSync(path.join(mapDir, 'profiles.json'), JSON.stringify(idMap, null, 2));

  console.log(`\n=== Profiles migration complete ===`);
  console.log(`Migrated ${sourceItems.length} profiles`);
  console.log(`ID map saved to scripts/migration/id-maps/profiles.json`);

  return idMap;
}

if (require.main === module) {
  main().catch(err => {
    console.error('Failed:', err.response?.data || err.message);
    process.exit(1);
  });
}

module.exports = main;
