/**
 * Integration test: Eventbrite API connectivity
 *
 * Verifies that EVENTBRITE_API_KEY is valid and the org events endpoint responds.
 * Run against the live Eventbrite API — no mocks.
 *
 *
 * Run: node tests/test-eventbrite-live.js
 */

require('dotenv').config();
const { getOrgEvents } = require('../dist/backend/services/eventbrite-client');

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
    console.log('Eventbrite API connectivity tests\n');

    console.log('Org events (getOrgEvents):');

    const events = await getOrgEvents();
    assert('getOrgEvents() returns an array', Array.isArray(events), `got ${typeof events}`);

    if (events.length > 0) {
        const e = events[0];
        assert('Event has id', 'id' in e, `keys: ${Object.keys(e).slice(0, 8).join(', ')}`);
        assert('Event has name', 'name' in e);
        assert('Event has startDate', 'startDate' in e);
    } else {
        console.log('  (no live events — skipping field checks)');
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error('\nFatal error:', err.message);
    if (err.response?.data) console.error('Response:', JSON.stringify(err.response.data, null, 2));
    process.exit(1);
});
