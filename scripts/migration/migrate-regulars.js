/**
 * Migrate Regulars data from Members site → Tracker site
 *
 * Copy: Title
 * Remap: CrewLookupId → GroupLookupId (via groups ID map)
 * Remap: VolunteerLookupId → ProfileLookupId (via profiles ID map)
 * Drop: denormalized fields (email, hours)
 *
 * Usage: node scripts/migration/migrate-regulars.js
 */

const fs = require('fs');
const path = require('path');
const {
  getSiteId, getSourceSiteId, getAllItems, createItem,
  SOURCE_REGULARS_GUID
} = require('./graph-helper');

async function main() {
  const targetRegularsGuid = process.env.REGULARS_LIST_GUID;
  if (!targetRegularsGuid || targetRegularsGuid === 'TODO') {
    console.error('REGULARS_LIST_GUID not set in .env.tracker. Run create-regulars-list.js first.');
    process.exit(1);
  }

  // Load ID maps
  const groupsMapPath = path.resolve(__dirname, 'id-maps/groups.json');
  const profilesMapPath = path.resolve(__dirname, 'id-maps/profiles.json');
  if (!fs.existsSync(groupsMapPath) || !fs.existsSync(profilesMapPath)) {
    console.error('ID maps not found. Run migrate-groups.js and migrate-profiles.js first.');
    process.exit(1);
  }
  const groupsIdMap = JSON.parse(fs.readFileSync(groupsMapPath, 'utf8'));
  const profilesIdMap = JSON.parse(fs.readFileSync(profilesMapPath, 'utf8'));

  console.log('Migrating Regulars...');

  const sourceSiteId = await getSourceSiteId();
  const targetSiteId = await getSiteId();

  console.log(`Reading from source list ${SOURCE_REGULARS_GUID}...`);
  const sourceItems = await getAllItems(sourceSiteId, SOURCE_REGULARS_GUID);
  console.log(`Found ${sourceItems.length} regulars`);

  let migrated = 0;
  let skipped = 0;

  for (const item of sourceItems) {
    const f = item.fields;

    const oldGroupId = f.CrewLookupId;
    const oldProfileId = f.VolunteerLookupId;
    const newGroupId = oldGroupId ? groupsIdMap[String(oldGroupId)] : null;
    const newProfileId = oldProfileId ? profilesIdMap[String(oldProfileId)] : null;

    if (oldGroupId && !newGroupId) {
      skipped++;
      continue;
    }
    if (oldProfileId && !newProfileId) {
      skipped++;
      continue;
    }

    const fields = {
      Title: f.Title || ''
    };

    if (newGroupId) {
      fields.GroupLookupId = newGroupId;
    }
    if (newProfileId) {
      fields.ProfileLookupId = newProfileId;
    }

    await createItem(targetSiteId, targetRegularsGuid, fields);
    migrated++;

    if (migrated % 50 === 0) {
      console.log(`  Migrated ${migrated}/${sourceItems.length}...`);
    }
  }

  console.log(`\n=== Regulars migration complete ===`);
  console.log(`Migrated ${migrated} regulars`);
  if (skipped) console.log(`Skipped ${skipped} (missing group/profile mapping)`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Failed:', err.response?.data || err.message);
    process.exit(1);
  });
}

module.exports = main;
