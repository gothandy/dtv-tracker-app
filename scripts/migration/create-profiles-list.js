/**
 * Create the Profiles list on the Tracker site
 *
 * Columns: Title (built-in), Email, MatchName, IsGroup, DataConsent, PhotoConsent
 * No lookup dependencies — can run first (alongside Groups).
 *
 * Usage: node scripts/migration/create-profiles-list.js
 */

const { getSiteId, createList, addColumn } = require('./graph-helper');

async function main() {
  console.log('Creating Profiles list...');
  const siteId = await getSiteId();
  console.log(`Site ID: ${siteId}`);

  const list = await createList(siteId, 'Profiles', 'Volunteer profiles');
  console.log(`List created: ${list.id}`);

  const columns = [
    { name: 'Email', text: {} },
    { name: 'MatchName', text: {} },
    { name: 'IsGroup', boolean: {} }
  ];

  for (const col of columns) {
    await addColumn(siteId, list.id, col);
    console.log(`  + ${col.name}`);
  }

  console.log('\n=== Profiles list created ===');
  console.log(`GUID: ${list.id}`);
  console.log(`Add to .env.tracker: PROFILES_LIST_GUID=${list.id}`);

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
