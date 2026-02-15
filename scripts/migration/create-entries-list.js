/**
 * Create the Entries list on the Tracker site
 *
 * Columns: Title (built-in), Session (lookup → Sessions), Profile (lookup → Profiles),
 *          Count, Checked, Hours, Notes
 *
 * Requires: Sessions and Profiles lists must exist first (for lookup columns).
 *
 * Usage: node scripts/migration/create-entries-list.js
 */

const { getSiteId, createList, addColumn } = require('./graph-helper');

async function main(sessionsListId, profilesListId) {
  if (!sessionsListId) {
    sessionsListId = process.env.SESSIONS_LIST_GUID;
  }
  if (!profilesListId) {
    profilesListId = process.env.PROFILES_LIST_GUID;
  }
  if (!sessionsListId || !profilesListId) {
    console.error('Sessions and Profiles list GUIDs required.');
    console.error('Pass as arguments or set SESSIONS_LIST_GUID and PROFILES_LIST_GUID in .env.tracker');
    process.exit(1);
  }

  console.log('Creating Entries list...');
  const siteId = await getSiteId();
  console.log(`Site ID: ${siteId}`);

  const list = await createList(siteId, 'Entries', 'Volunteer entries (registrations/attendance)');
  console.log(`List created: ${list.id}`);

  const columns = [
    { name: 'Session', lookup: { listId: sessionsListId, columnName: 'Title' }, indexed: true },
    { name: 'Profile', lookup: { listId: profilesListId, columnName: 'Title' } },
    { name: 'Count', number: {}, defaultValue: { value: '1' } },
    { name: 'Checked', boolean: {} },
    { name: 'Hours', number: {} },
    { name: 'Notes', text: {} }
  ];

  for (const col of columns) {
    await addColumn(siteId, list.id, col);
    console.log(`  + ${col.name}`);
  }

  console.log('\n=== Entries list created ===');
  console.log(`GUID: ${list.id}`);
  console.log(`Add to .env.tracker: ENTRIES_LIST_GUID=${list.id}`);

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
