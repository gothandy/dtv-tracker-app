/**
 * Create the Records list on the Tracker site
 *
 * Columns: Title (built-in), Profile (lookup → Profiles), Type (choice), Date (dateTime)
 *
 * Requires: Profiles list must exist first (for lookup column).
 *
 * Usage: node scripts/migration/create-records-list.js
 */

const { getSiteId, createList, addColumn } = require('./graph-helper');

async function main(profilesListId) {
  if (!profilesListId) {
    profilesListId = process.env.PROFILES_LIST_GUID;
  }
  if (!profilesListId) {
    console.error('Profiles list GUID required.');
    console.error('Pass as argument or set PROFILES_LIST_GUID in .env.tracker');
    process.exit(1);
  }

  console.log('Creating Records list...');
  const siteId = await getSiteId();
  console.log(`Site ID: ${siteId}`);

  const list = await createList(siteId, 'Records', 'Consent, benefit, and governance records');
  console.log(`List created: ${list.id}`);

  const columns = [
    { name: 'Profile', lookup: { listId: profilesListId, columnName: 'Title' } },
    { name: 'Type', choice: { choices: ['Privacy Consent', 'Photo Consent'] } },
    { name: 'Date', dateTime: {} }
  ];

  for (const col of columns) {
    await addColumn(siteId, list.id, col);
    console.log(`  + ${col.name}`);
  }

  console.log('\n=== Records list created ===');
  console.log(`GUID: ${list.id}`);
  console.log(`Add to .env.tracker: RECORDS_LIST_GUID=${list.id}`);

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
