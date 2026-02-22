/**
 * List SharePoint document library Drive IDs for the configured site.
 * Run once to find the MEDIA_LIBRARY_DRIVE_ID value for .env
 *
 * Usage: node test/test-drives.js
 */

require('dotenv').config();
const axios = require('axios');

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.SHAREPOINT_CLIENT_ID,
    client_secret: process.env.SHAREPOINT_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`,
    params
  );
  return res.data.access_token;
}

async function main() {
  const token = await getAccessToken();

  const siteUrl = new URL(process.env.SHAREPOINT_SITE_URL);
  const path = siteUrl.pathname.replace(/^\//, '');
  const siteRes = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${siteUrl.hostname}:/${path}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const siteId = siteRes.data.id;

  const drivesRes = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('\nDocument Libraries (Drives) on', process.env.SHAREPOINT_SITE_URL);
  console.log('─'.repeat(80));
  for (const d of drivesRes.data.value) {
    console.log(`Name: ${d.name}`);
    console.log(`  ID: ${d.id}`);
    console.log(`  URL: ${d.webUrl}`);
    console.log();
  }
  console.log('Copy the ID for the "Media" library into .env as MEDIA_LIBRARY_DRIVE_ID');
}

main().catch(err => {
  console.error('Error:', err.response?.data || err.message);
  process.exit(1);
});
