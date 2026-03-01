/**
 * Integration test: SharePoint list data contracts
 *
 * Verifies that each list is reachable and returns items with the expected
 * field shapes. Run against live SharePoint — no mocks — so any change to a
 * $select field list, a field rename, or a Graph API call that silently returns
 * empty will be caught here.
 *
 * Asserts on non-empty arrays: an empty-but-successful result is a test failure
 * because it is indistinguishable from a broken fetch.
 *
 * Run: node test/test-data-contracts.js
 */

require('dotenv').config();
const { groupsRepository } = require('../dist/services/repositories/groups-repository');
const { sessionsRepository } = require('../dist/services/repositories/sessions-repository');
const { profilesRepository } = require('../dist/services/repositories/profiles-repository');
const { entriesRepository } = require('../dist/services/repositories/entries-repository');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
    if (condition) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.log(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
        failed++;
    }
}

async function main() {
    console.log('SharePoint list data contract tests\n');

    // --- Groups ---
    console.log('Groups list:');
    const groups = await groupsRepository.getAll();
    assert('Groups list is reachable', Array.isArray(groups));
    assert('Groups list is non-empty', groups.length > 0, `got ${groups.length} items`);
    if (groups.length > 0) {
        const g = groups[0];
        assert('Group has ID', typeof g.ID === 'number', `got ${typeof g.ID}`);
        assert('Group has Title (key field)', 'Title' in g, `keys: ${Object.keys(g).join(', ')}`);
    }

    // --- Sessions ---
    console.log('\nSessions list:');
    const sessions = await sessionsRepository.getAll();
    assert('Sessions list is reachable', Array.isArray(sessions));
    assert('Sessions list is non-empty', sessions.length > 0, `got ${sessions.length} items`);
    if (sessions.length > 0) {
        const s = sessions[0];
        assert('Session has ID', typeof s.ID === 'number', `got ${typeof s.ID}`);
        assert('Session has Date', 'Date' in s && !!s.Date, `Date=${s.Date}`);
        assert('Session has GroupLookupId', 'GroupLookupId' in s, `keys: ${Object.keys(s).join(', ')}`);
    }

    // --- Profiles ---
    console.log('\nProfiles list:');
    const profiles = await profilesRepository.getAll();
    assert('Profiles list is reachable', Array.isArray(profiles));
    assert('Profiles list is non-empty', profiles.length > 0, `got ${profiles.length} items`);
    if (profiles.length > 0) {
        const p = profiles[0];
        assert('Profile has ID', typeof p.ID === 'number', `got ${typeof p.ID}`);
        assert('Profile has Title', 'Title' in p, `keys: ${Object.keys(p).join(', ')}`);
        assert('Profile has IsGroup field', 'IsGroup' in p, `keys: ${Object.keys(p).join(', ')}`);
    }

    // --- Entries ---
    console.log('\nEntries list:');
    // getBySessionIds with a small set is more targeted than getAll (large list)
    // Fall back to checking getAll returns an array if no sessions exist
    const entries = await entriesRepository.getAll();
    assert('Entries list is reachable', Array.isArray(entries));
    assert('Entries list is non-empty', entries.length > 0, `got ${entries.length} items`);
    if (entries.length > 0) {
        const e = entries[0];
        assert('Entry has ID', typeof e.ID === 'number', `got ${typeof e.ID}`);
        assert('Entry has SessionLookupId', 'SessionLookupId' in e, `keys: ${Object.keys(e).join(', ')}`);
        assert('Entry has ProfileLookupId', 'ProfileLookupId' in e, `keys: ${Object.keys(e).join(', ')}`);
        assert('Entry has Checked field', 'Checked' in e, `keys: ${Object.keys(e).join(', ')}`);
        assert('Entry has Hours field', 'Hours' in e, `keys: ${Object.keys(e).join(', ')}`);
        assert('Entry has Count field', 'Count' in e, `keys: ${Object.keys(e).join(', ')}`);
    }

    // --- Summary ---
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error('\nFatal error:', err.message);
    if (err.response?.data) console.error('Response:', JSON.stringify(err.response.data, null, 2));
    process.exit(1);
});
