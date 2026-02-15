/**
 * Shared Graph API helper for migration scripts
 *
 * Handles authentication and provides convenience methods for
 * creating lists and columns on the Tracker site, and reading
 * items from the Members (source) site for data migration.
 *
 * Usage:
 *   const { getSiteId, createList, addColumn } = require('./graph-helper');
 */

const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.tracker from project root (target site)
dotenv.config({ path: path.resolve(__dirname, '../../.env.tracker') });

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;
const SITE_URL = process.env.SHAREPOINT_SITE_URL;

// Source site config from .env.members (same app registration, different site)
const membersEnv = dotenv.config({ path: path.resolve(__dirname, '../../.env.members'), processEnv: {} });
const SOURCE_SITE_URL = membersEnv.parsed?.SHAREPOINT_SITE_URL;
const SOURCE_GROUPS_GUID = membersEnv.parsed?.GROUPS_LIST_GUID;
const SOURCE_SESSIONS_GUID = membersEnv.parsed?.SESSIONS_LIST_GUID;
const SOURCE_ENTRIES_GUID = membersEnv.parsed?.ENTRIES_LIST_GUID;
const SOURCE_PROFILES_GUID = membersEnv.parsed?.PROFILES_LIST_GUID;
const SOURCE_REGULARS_GUID = membersEnv.parsed?.REGULARS_LIST_GUID;

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SITE_URL) {
  console.error('Missing required env vars. Check .env.tracker has:');
  console.error('  SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, SHAREPOINT_SITE_URL');
  process.exit(1);
}

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const res = await axios.post(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 300) * 1000;
  return cachedToken;
}

async function getSiteId() {
  const token = await getAccessToken();
  const url = new URL(SITE_URL);
  const hostname = url.hostname;
  const sitePath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;

  const res = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${hostname}:/${sitePath}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.id;
}

/**
 * Create a new SharePoint list
 * @returns {{ id: string, webUrl: string }} The list ID (GUID) and web URL
 */
async function createList(siteId, displayName, description) {
  const token = await getAccessToken();
  const body = {
    displayName,
    description: description || '',
    list: { template: 'genericList' }
  };

  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`,
    body,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  return { id: res.data.id, webUrl: res.data.webUrl };
}

/**
 * Add a column to a list
 * @param {object} columnDef - Graph API column definition (e.g. { name: "Name", text: {} })
 */
async function addColumn(siteId, listId, columnDef) {
  const token = await getAccessToken();

  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/columns`,
    columnDef,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  return res.data;
}

/**
 * Get the source (Members) site ID
 */
async function getSourceSiteId() {
  if (!SOURCE_SITE_URL) {
    throw new Error('SOURCE_SITE_URL not found. Check .env.members exists.');
  }
  const token = await getAccessToken();
  const url = new URL(SOURCE_SITE_URL);
  const hostname = url.hostname;
  const sitePath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;

  const res = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${hostname}:/${sitePath}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data.id;
}

/**
 * Get all items from a list, handling pagination
 * @returns {Array<{ id: string, fields: object }>}
 */
async function getAllItems(siteId, listId) {
  const token = await getAccessToken();
  let url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=999`;
  const allItems = [];

  while (url) {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    allItems.push(...res.data.value);
    url = res.data['@odata.nextLink'] || null;
    if (url) console.log(`  Fetching page ${Math.ceil(allItems.length / 999) + 1}...`);
  }

  return allItems;
}

/**
 * Create an item in a list
 * @returns {number} The new item ID
 */
async function createItem(siteId, listId, fields) {
  const token = await getAccessToken();
  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
    { fields },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return parseInt(res.data.id, 10);
}

module.exports = {
  getSiteId, getSourceSiteId, createList, addColumn, getAccessToken,
  getAllItems, createItem,
  SOURCE_GROUPS_GUID, SOURCE_SESSIONS_GUID, SOURCE_ENTRIES_GUID,
  SOURCE_PROFILES_GUID, SOURCE_REGULARS_GUID
};
