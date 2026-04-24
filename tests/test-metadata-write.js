/**
 * Test the Graph API hidden-field approach for writing Managed Metadata values.
 * Approach: find the hidden _0 column via GET /columns?expand=hidden,
 * then PATCH /items/{id}/fields using "-1;#Label|TermGuid" string format.
 * Run: node test/test-metadata-write.js
 */

require('dotenv').config();
const axios = require('axios');

const { SHAREPOINT_TENANT_ID: tid, SHAREPOINT_CLIENT_ID: cid, SHAREPOINT_CLIENT_SECRET: cs,
        SHAREPOINT_SITE_URL: siteUrl, SESSIONS_LIST_GUID: listGuid, TAXONOMY_TERM_SET_ID: termSetId } = process.env;

async function getToken() {
  const res = await axios.post(
    `https://login.microsoftonline.com/${tid}/oauth2/v2.0/token`,
    new URLSearchParams({ client_id: cid, client_secret: cs, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
  );
  return res.data.access_token;
}

async function main() {
  const token = await getToken();
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const siteRes = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${new URL(siteUrl).hostname}:${new URL(siteUrl).pathname}`,
    { headers: h }
  );
  const siteId = siteRes.data.id;

  // --- Step 1: Find hidden columns ---
  console.log('=== Step 1: GET /columns?expand=hidden ===');
  const colsRes = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/columns?expand=hidden`,
    { headers: h }
  );
  const cols = colsRes.data.value || [];
  console.log(`Total columns returned: ${cols.length}`);

  // Show all columns so we can spot the hidden one
  for (const c of cols) {
    console.log(`  name="${c.name}"  displayName="${c.displayName}"  hidden=${c.hidden}`);
  }

  // Find the hidden note field for Metadata (usually has _0 or similar suffix)
  const hiddenCol = cols.find(c =>
    c.hidden && (c.name?.toLowerCase().includes('meta') || c.displayName?.toLowerCase().includes('meta'))
  );
  if (!hiddenCol) {
    console.log('\nNo hidden Metadata-related column found. Listing ALL hidden columns:');
    cols.filter(c => c.hidden).forEach(c =>
      console.log(`  name="${c.name}"  displayName="${c.displayName}"`)
    );
  } else {
    console.log(`\nFound hidden column: name="${hiddenCol.name}"  displayName="${hiddenCol.displayName}"`);
  }

  // --- Step 2: Get a test term ---
  const treeRes = await axios.get(
    `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/children`,
    { headers: h }
  );
  const testTerm  = treeRes.data.value[0];
  const testLabel = testTerm.labels?.find(l => l.isDefault)?.name ?? 'Unknown';
  const testGuid  = testTerm.id;
  console.log(`\nTest term: "${testLabel}"  GUID: ${testGuid}`);

  // --- Step 3: Find a test item ---
  const itemsRes = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/items?$top=1`,
    { headers: h }
  );
  const itemId = itemsRes.data.value[0]?.id;
  console.log(`Test item Graph ID: ${itemId}`);

  const fieldsUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/items/${itemId}/fields`;

  async function tryPatch(label, body) {
    try {
      await axios.patch(fieldsUrl, body, { headers: h });
      const val = (await axios.get(`${fieldsUrl}?$select=Metadata`, { headers: h })).data.Metadata;
      console.log(`  OK  ${label}  →  Metadata=${JSON.stringify(val)}`);
      return true;
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? err.message;
      console.log(`  ERR ${err.response?.status} ${label}: ${msg}`);
      return false;
    }
  }

  // --- Step 4: Try writing via the hidden column name ---
  console.log('\n=== Step 4: Write attempts ===');

  // If we found the hidden column, try it
  if (hiddenCol) {
    const noteStr = `-1;#${testLabel}|${testGuid}`;
    await tryPatch(`hidden col "${hiddenCol.name}" with "-1;#Label|Guid"`, { [hiddenCol.name]: noteStr });
    await tryPatch(`clear hidden col`, { [hiddenCol.name]: '' });
  }

  // Also try common naming patterns even if not found above
  const candidates = [
    `Metadata_0`, `MetadataOWSMTXT`, `MetadataTaxHTValue0`,
    `OWS_TAXID_METADATA`, `Metadata0`,
  ];
  console.log('\n=== Step 5: Try common hidden field name patterns ===');
  for (const name of candidates) {
    const noteStr = `-1;#${testLabel}|${testGuid}`;
    const ok = await tryPatch(`"${name}"`, { [name]: noteStr });
    if (ok) {
      console.log(`  *** SUCCESS with field name: "${name}" ***`);
      await tryPatch(`clear "${name}"`, { [name]: '' });
      break;
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error('Fatal:', err.response?.data?.error?.message || err.message); process.exit(1); });
