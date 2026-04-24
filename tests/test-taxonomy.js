/**
 * Test script: probe the Graph API term store to find what endpoints/expand depths work.
 * Run: node test/test-taxonomy.js
 */

require('dotenv').config();
const axios = require('axios');

const tenantId = process.env.SHAREPOINT_TENANT_ID;
const clientId = process.env.SHAREPOINT_CLIENT_ID;
const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
const siteUrl = process.env.SHAREPOINT_SITE_URL;
const termSetId = process.env.TAXONOMY_TERM_SET_ID;

async function getToken() {
  const res = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    })
  );
  return res.data.access_token;
}

async function getSiteId(token) {
  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const sitePath = url.pathname;
  const formattedPath = sitePath.startsWith('/') ? sitePath.substring(1) : sitePath;
  const res = await axios.get(`https://graph.microsoft.com/v1.0/sites/${hostname}:/${formattedPath}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return res.data.id;
}

async function tryUrl(label, url, token) {
  try {
    const res = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const items = res.data.value || [];
    console.log(`  OK  [${items.length} items] ${label}`);
    if (items.length > 0) {
      const first = items[0];
      const label2 = first.labels?.[0]?.name ?? '(no label)';
      const childCount = first.children?.length ?? '(not expanded)';
      console.log(`       First: "${label2}", children: ${childCount}`);
      console.log(`       Keys: ${Object.keys(first).join(', ')}`);
      if (first.children?.length) {
        console.log(`       First child: ${JSON.stringify(first.children[0]).substring(0, 200)}`);
      }
    }
    return items;
  } catch (err) {
    const msg = err.response?.data?.error?.message ?? err.message;
    console.log(`  ERR ${err.response?.status ?? '?'} ${label}: ${msg}`);
    return null;
  }
}

async function main() {
  console.log('Getting token...');
  const token = await getToken();
  console.log('Getting site ID...');
  const siteId = await getSiteId(token);
  console.log(`Site ID: ${siteId}\n`);

  const variants = [
    // Tenant-level, no expand
    [`tenant /children (no expand)`,
     `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/children`],

    // Tenant-level, 1 level
    [`tenant /children ($expand=children)`,
     `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/children?$expand=children`],

    // Tenant-level, 2 levels (max allowed)
    [`tenant /children ($expand=children 2-deep)`,
     `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/children?$expand=${encodeURIComponent('children($expand=children)')}`],

    // Site-level, 2 levels
    [`site /children ($expand=children 2-deep)`,
     `https://graph.microsoft.com/beta/sites/${siteId}/termStore/sets/${termSetId}/children?$expand=${encodeURIComponent('children($expand=children)')}`],

    // Tenant-level /terms (flat list, no expand)
    [`tenant /terms (no expand)`,
     `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/terms`],

    // /terms with $select to see all available properties
    [`tenant /terms ($select all fields)`,
     `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/terms?$select=id,labels,isDeprecated,properties,localProperties,lastModifiedDateTime`],
  ];

  for (const [label, url] of variants) {
    await tryUrl(label, url, token);
  }

  // Build the full tree recursively (mirrors what the server will do)
  console.log('\n--- Building full tree recursively ---');
  const rootTerms = await tryUrl(
    'root children',
    `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/children`,
    token
  );
  if (rootTerms) {
    async function fetchChildren(terms) {
      return Promise.all(terms.map(async (term) => {
        const label = term.labels?.find(l => l.isDefault)?.name ?? term.labels?.[0]?.name ?? '?';
        const res = await axios.get(
          `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/terms/${term.id}/children`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const children = res.data.value || [];
        const node = { label };
        if (children.length) node.children = await fetchChildren(children);
        return node;
      }));
    }
    const tree = await fetchChildren(rootTerms);
    console.log('Full tree:', JSON.stringify(tree, null, 2));
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
