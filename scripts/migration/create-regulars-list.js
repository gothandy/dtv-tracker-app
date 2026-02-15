/**
 * Create the Regulars list on the Tracker site
 *
 * Columns: Title (built-in), Group (lookup → Groups), Profile (lookup → Profiles)
 *
 * Requires: Groups and Profiles lists must exist first (for lookup columns).
 *
 * Usage: node scripts/migration/create-regulars-list.js
 */

const { getSiteId, createList, addColumn } = require('./graph-helper');

async function main(groupsListId, profilesListId) {
  if (!groupsListId) {
    groupsListId = process.env.GROUPS_LIST_GUID;
  }
  if (!profilesListId) {
    profilesListId = process.env.PROFILES_LIST_GUID;
  }
  if (!groupsListId || !profilesListId) {
    console.error('Groups and Profiles list GUIDs required.');
    console.error('Pass as arguments or set GROUPS_LIST_GUID and PROFILES_LIST_GUID in .env.tracker');
    process.exit(1);
  }

  console.log('Creating Regulars list...');
  const siteId = await getSiteId();
  console.log(`Site ID: ${siteId}`);

  const list = await createList(siteId, 'Regulars', 'Regular volunteers per group');
  console.log(`List created: ${list.id}`);

  const columns = [
    { name: 'Group', lookup: { listId: groupsListId, columnName: 'Title' } },
    { name: 'Profile', lookup: { listId: profilesListId, columnName: 'Title' } }
  ];

  for (const col of columns) {
    await addColumn(siteId, list.id, col);
    console.log(`  + ${col.name}`);
  }

  console.log('\n=== Regulars list created ===');
  console.log(`GUID: ${list.id}`);
  console.log(`Add to .env.tracker: REGULARS_LIST_GUID=${list.id}`);

  return list.id;
}

// Allow running standalone or as module
if (require.main === module) {
  main().catch(err => {
    console.error('Failed:', err.response?.data || err.message);
    process.exit(1);
  });
}

module.exports = main;
