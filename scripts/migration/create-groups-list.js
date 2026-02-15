/**
 * Create the Groups list on the Tracker site
 *
 * Columns: Title (built-in), Name, Description, EventbriteSeriesID
 * No lookup dependencies — can run first.
 *
 * Usage: node scripts/migration/create-groups-list.js
 */

const { getSiteId, createList, addColumn } = require('./graph-helper');

async function main() {
  console.log('Creating Groups list...');
  const siteId = await getSiteId();
  console.log(`Site ID: ${siteId}`);

  const list = await createList(siteId, 'Groups', 'Volunteer groups/crews');
  console.log(`List created: ${list.id}`);

  const columns = [
    { name: 'Name', text: {} },
    { name: 'Description', text: {} },
    { name: 'EventbriteSeriesID', text: {} }
  ];

  for (const col of columns) {
    await addColumn(siteId, list.id, col);
    console.log(`  + ${col.name}`);
  }

  console.log('\n=== Groups list created ===');
  console.log(`GUID: ${list.id}`);
  console.log(`Add to .env.tracker: GROUPS_LIST_GUID=${list.id}`);

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
