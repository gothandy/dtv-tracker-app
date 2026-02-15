/**
 * Create the Sessions list on the Tracker site
 *
 * Columns: Title (built-in), Name, Date, Group (lookup → Groups), Notes,
 *          Registrations, Hours, EventbriteEventID, Url
 *
 * Requires: Groups list must exist first (for lookup column).
 *
 * Usage: node scripts/migration/create-sessions-list.js
 */

const { getSiteId, createList, addColumn } = require('./graph-helper');

async function main(groupsListId) {
  if (!groupsListId) {
    groupsListId = process.env.GROUPS_LIST_GUID;
  }
  if (!groupsListId) {
    console.error('Groups list GUID required. Pass as argument or set GROUPS_LIST_GUID in .env.tracker');
    process.exit(1);
  }

  console.log('Creating Sessions list...');
  const siteId = await getSiteId();
  console.log(`Site ID: ${siteId}`);

  const list = await createList(siteId, 'Sessions', 'Volunteer sessions/events');
  console.log(`List created: ${list.id}`);

  const columns = [
    { name: 'Name', text: {} },
    { name: 'Date', dateTime: { format: 'dateOnly' } },
    { name: 'Group', lookup: { listId: groupsListId, columnName: 'Title' } },
    { name: 'Notes', text: { allowMultipleLines: true } },
    { name: 'EventbriteEventID', text: {} }
  ];

  for (const col of columns) {
    await addColumn(siteId, list.id, col);
    console.log(`  + ${col.name}`);
  }

  console.log('\n=== Sessions list created ===');
  console.log(`GUID: ${list.id}`);
  console.log(`Add to .env.tracker: SESSIONS_LIST_GUID=${list.id}`);

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
