/**
 * Orchestrator: Create all 5 lists on the Tracker site
 *
 * Runs in dependency order:
 *   1. Groups (no dependencies)
 *   2. Profiles (no dependencies)
 *   3. Sessions (lookup → Groups)
 *   4. Entries (lookup → Sessions, Profiles)
 *   5. Regulars (lookup → Groups, Profiles)
 *
 * Usage: node scripts/migration/create-lists.js
 */

const createGroups = require('./create-groups-list');
const createProfiles = require('./create-profiles-list');
const createSessions = require('./create-sessions-list');
const createEntries = require('./create-entries-list');
const createRegulars = require('./create-regulars-list');

async function main() {
  console.log('=== Creating all lists on Tracker site ===\n');

  // Step 1 & 2: No dependencies
  const groupsId = await createGroups();
  console.log('');
  const profilesId = await createProfiles();
  console.log('');

  // Step 3: Sessions needs Groups
  const sessionsId = await createSessions(groupsId);
  console.log('');

  // Step 4: Entries needs Sessions + Profiles
  const entriesId = await createEntries(sessionsId, profilesId);
  console.log('');

  // Step 5: Regulars needs Groups + Profiles
  const regularsId = await createRegulars(groupsId, profilesId);

  console.log('\n========================================');
  console.log('All lists created! Add to .env.tracker:');
  console.log('========================================');
  console.log(`GROUPS_LIST_GUID=${groupsId}`);
  console.log(`PROFILES_LIST_GUID=${profilesId}`);
  console.log(`SESSIONS_LIST_GUID=${sessionsId}`);
  console.log(`ENTRIES_LIST_GUID=${entriesId}`);
  console.log(`REGULARS_LIST_GUID=${regularsId}`);
}

main().catch(err => {
  console.error('Failed:', err.response?.data || err.message);
  process.exit(1);
});
