/**
 * Integration test: Media library, taxonomy term store, and backup drive
 *
 * Verifies that each integration is reachable and auth works.
 *
 * Run: node tests/test-media-taxonomy.js
 */

require('dotenv').config();
const axios = require('axios');
const { sharePointClient } = require('../dist/backend/services/sharepoint-client');
const { sharePoint } = require('../dist/backend/config');
const { taxonomyClient } = require('../dist/backend/services/taxonomy-client');

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
    console.log('Media library, taxonomy, and backup drive tests\n');

    // --- Media library ---
    console.log('Media library:');
    const mediaDriveId = sharePoint.libraries.media;

    // Probe the drive root directly via Graph API.
    // listGroupDateCounts() swallows all 404s (including an invalid drive ID) and returns an
    // empty Map, so it cannot distinguish a misconfigured drive from a group with no media yet.
    const token = await sharePointClient.getAccessToken();
    const driveRes = await axios.get(
        `https://graph.microsoft.com/v1.0/drives/${mediaDriveId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    assert('Media library drive is accessible', driveRes.status === 200, `HTTP ${driveRes.status}`);
    assert('Drive has id', typeof driveRes.data?.id === 'string', `got ${typeof driveRes.data?.id}`);

    // --- Taxonomy term store ---
    console.log('\nTaxonomy term store:');
    const termSetId = sharePoint.site.tagsTermSetId;

    const tree = await taxonomyClient.getTermSetTree(termSetId);
    assert('getTermSetTree() returns an array', Array.isArray(tree), `got ${typeof tree}`);

    if (tree.length > 0) {
        const first = tree[0];
        assert('Term has label', typeof first.label === 'string' && first.label.length > 0, `got "${first.label}"`);
        assert('Term has id', typeof first.id === 'string' && first.id.length > 0, `got "${first.id}"`);
    } else {
        console.log('  (term set is empty — skipping field checks)');
    }

    // --- Backup document library ---
    console.log('\nShared Documents library:');
    const documentsDriveId = sharePoint.libraries.documents;

    // Same direct-drive-root probe as for the media library — downloadFile() also swallows
    // all 404s, so an invalid drive ID would silently return null and still pass.
    const docsRes = await axios.get(
        `https://graph.microsoft.com/v1.0/drives/${documentsDriveId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    assert('Documents drive is accessible', docsRes.status === 200, `HTTP ${docsRes.status}`);
    assert('Drive has id', typeof docsRes.data?.id === 'string', `got ${typeof docsRes.data?.id}`);

    // --- Summary ---
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error('\nFatal error:', err.message);
    if (err.response?.data) console.error('Response:', JSON.stringify(err.response.data, null, 2));
    process.exit(1);
});
