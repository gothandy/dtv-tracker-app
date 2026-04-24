/**
 * Integration test: Records list data contract
 *
 * Verifies that the Records list is accessible and the column choices used by
 * the volunteers page filter are returned correctly. Run against live SharePoint
 * — no mocks — so any change to the Graph API call that breaks data retrieval
 * will be caught here.
 *
 * Run: node test/test-records.js
 */

require('dotenv').config();
const { sharePointClient } = require('../dist/backend/services/sharepoint-client');
const { recordsRepository } = require('../dist/backend/services/repositories/records-repository');

const RECORDS_LIST_GUID = process.env.RECORDS_LIST_GUID;

const EXPECTED_TYPES = ['Privacy Consent', 'Photo Consent', 'Newsletter Consent', 'Charity Membership', 'Discount Card'];
const EXPECTED_STATUSES = ['Accepted', 'Declined', 'Invited', 'Expired'];

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
    console.log('Records list integration tests\n');

    if (!RECORDS_LIST_GUID) {
        console.error('✗ RECORDS_LIST_GUID is not set in environment');
        process.exit(1);
    }

    // --- Column choices (used by the volunteers page filter) ---
    console.log('Column choices (GET /api/records/options):');

    const types = await sharePointClient.getColumnChoices(RECORDS_LIST_GUID, 'Type');
    assert('Type choices returned', types.length > 0, `got ${JSON.stringify(types)}`);
    for (const expected of EXPECTED_TYPES) {
        assert(`Type includes "${expected}"`, types.includes(expected));
    }

    const statuses = await sharePointClient.getColumnChoices(RECORDS_LIST_GUID, 'Status');
    assert('Status choices returned', statuses.length > 0, `got ${JSON.stringify(statuses)}`);
    for (const expected of EXPECTED_STATUSES) {
        assert(`Status includes "${expected}"`, statuses.includes(expected));
    }

    // --- List access ---
    console.log('\nList access (recordsRepository.getAll()):');

    const records = await recordsRepository.getAll();
    assert('Records list is reachable', records !== null && records !== undefined);
    assert('Records list returns an array', Array.isArray(records));

    if (records.length > 0) {
        const first = records[0];
        assert('Records have Type field', 'Type' in first, `keys: ${Object.keys(first).join(', ')}`);
        assert('Records have Status field', 'Status' in first);
        assert('Records have ProfileLookupId field', 'ProfileLookupId' in first);
    } else {
        console.log('  (no records in list — skipping field checks)');
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
