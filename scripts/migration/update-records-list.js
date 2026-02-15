/**
 * Migration: Add Status column to Records list
 *
 * - Adds a Status choice column (Invited, Accepted, Declined)
 * - Reverts Type choices to just Privacy Consent, Photo Consent
 * - Backfills Status="Accepted" on all existing records
 *
 * Usage: node scripts/migration/update-records-list.js
 */

const { getSiteId, addColumn, getAllItems, getAccessToken } = require('./graph-helper');
const axios = require('axios');

async function main() {
  const recordsListGuid = process.env.RECORDS_LIST_GUID;
  if (!recordsListGuid) {
    console.error('RECORDS_LIST_GUID not set in .env.tracker');
    process.exit(1);
  }

  const siteId = await getSiteId();
  console.log(`Site ID: ${siteId}`);

  // 1. Add Status choice column
  console.log('\n1. Adding Status column...');
  try {
    await addColumn(siteId, recordsListGuid, {
      name: 'Status',
      choice: {
        choices: ['Invited', 'Accepted', 'Declined']
      }
    });
    console.log('   Status column added');
  } catch (err) {
    if (err.response?.status === 400 && JSON.stringify(err.response.data).includes('already exists')) {
      console.log('   Status column already exists, skipping');
    } else {
      throw err;
    }
  }

  // 2. Fix Type choices — remove Declined values
  console.log('\n2. Updating Type column choices...');
  const token = await getAccessToken();
  const colsRes = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${recordsListGuid}/columns`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const typeCol = colsRes.data.value.find(c => c.name === 'Type');
  if (typeCol) {
    await axios.patch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${recordsListGuid}/columns/${typeCol.id}`,
      { choice: { choices: ['Privacy Consent', 'Photo Consent'] } },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('   Type choices updated: Privacy Consent, Photo Consent');
  }

  // 3. Backfill Status="Accepted" on existing records
  console.log('\n3. Backfilling Status on existing records...');
  const records = await getAllItems(siteId, recordsListGuid);
  console.log(`   ${records.length} existing records`);

  let updated = 0;
  for (const r of records) {
    if (r.fields.Status) {
      console.log(`   Skipping ID ${r.id} — already has Status="${r.fields.Status}"`);
      continue;
    }
    await axios.patch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${recordsListGuid}/items/${r.id}/fields`,
      { Status: 'Accepted' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    updated++;
  }
  console.log(`   Updated ${updated} records with Status="Accepted"`);

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message);
  process.exit(1);
});
