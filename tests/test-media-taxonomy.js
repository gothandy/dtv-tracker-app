/**
 * Integration test: Media library, taxonomy term store, and backup drive
 *
 * Verifies that each integration is reachable and auth works.
 * Sections are skipped gracefully if the relevant env var is not set.
 *
 * Run: node tests/test-media-taxonomy.js
 */

require('dotenv').config();
const { sharePointClient } = require('../dist/backend/services/sharepoint-client');
const { taxonomyClient } = require('../dist/backend/services/taxonomy-client');
const { groupsRepository } = require('../dist/backend/services/repositories/groups-repository');

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
    console.log('Media library (MEDIA_LIBRARY_DRIVE_ID):');
    const mediaDriveId = process.env.MEDIA_LIBRARY_DRIVE_ID;

    if (!mediaDriveId) {
        console.log('  (skipped — MEDIA_LIBRARY_DRIVE_ID not set)');
    } else {
        const groups = await groupsRepository.getAll();
        assert('Groups available for group key lookup', groups.length > 0, `got ${groups.length}`);

        if (groups.length > 0) {
            const groupKey = (groups[0].Title || groups[0].Name || '').toLowerCase();
            assert('First group has a key', !!groupKey, `got "${groupKey}"`);

            if (groupKey) {
                const counts = await sharePointClient.listGroupDateCounts(mediaDriveId, groupKey);
                assert('listGroupDateCounts() returns a Map', counts instanceof Map, `got ${typeof counts}`);
                // Map may be empty if group has no media yet — that's fine, it proves auth worked
            }
        }
    }

    // --- Taxonomy term store ---
    console.log('\nTaxonomy term store (TAXONOMY_TERM_SET_ID):');
    const termSetId = process.env.TAXONOMY_TERM_SET_ID;

    if (!termSetId) {
        console.log('  (skipped — TAXONOMY_TERM_SET_ID not set)');
    } else {
        const tree = await taxonomyClient.getTermSetTree(termSetId);
        assert('getTermSetTree() returns an array', Array.isArray(tree), `got ${typeof tree}`);

        if (tree.length > 0) {
            const first = tree[0];
            assert('Term has label', typeof first.label === 'string' && first.label.length > 0, `got "${first.label}"`);
            assert('Term has id', typeof first.id === 'string' && first.id.length > 0, `got "${first.id}"`);
        } else {
            console.log('  (term set is empty — skipping field checks)');
        }
    }

    // --- Backup document library ---
    console.log('\nBackup document library (BACKUP_DRIVE_ID):');
    const backupDriveId = process.env.BACKUP_DRIVE_ID;

    if (!backupDriveId) {
        console.log('  (skipped — BACKUP_DRIVE_ID not set)');
    } else {
        // downloadFile returns null on 404 (file not found) and throws on auth errors.
        // A null result proves the drive is accessible and auth succeeded.
        const result = await sharePointClient.downloadFile(backupDriveId, '__probe__.json');
        assert('Backup drive is accessible (auth ok)', result === null || Buffer.isBuffer(result),
            'null = not found (expected); Buffer = found; any throw = auth failure');
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
