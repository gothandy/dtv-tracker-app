/**
 * Unit tests: Financial year calculation functions
 *
 * Pure function tests — no SharePoint connection required. Uses Node's built-in
 * assert module so no test framework is needed.
 *
 * Covers calculateFinancialYear() and calculateCurrentFY() from data-layer.ts.
 * These functions are duplicated client-side in common.js, so correctness here
 * confirms the server-side implementation is sound.
 *
 * Run: node test/test-fy-calc.js
 */

require('dotenv').config();
const { calculateFinancialYear, calculateCurrentFY } = require('../dist/backend/services/data-layer');

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

function fy(dateStr) {
    return calculateFinancialYear(new Date(dateStr));
}

console.log('FY calculation unit tests\n');

// --- calculateFinancialYear ---
console.log('calculateFinancialYear():');

assert('Apr 1 is in FY of that year',        fy('2025-04-01') === 2025, `got ${fy('2025-04-01')}`);
assert('Dec 15 is in FY of that year',       fy('2024-12-15') === 2024, `got ${fy('2024-12-15')}`);
assert('Mar 31 is in previous FY',           fy('2025-03-31') === 2024, `got ${fy('2025-03-31')}`);
assert('Jan 1 is in previous FY',            fy('2025-01-01') === 2024, `got ${fy('2025-01-01')}`);
assert('Apr 1 boundary (FY2024)',            fy('2024-04-01') === 2024, `got ${fy('2024-04-01')}`);
assert('Mar 31 boundary (FY2023)',           fy('2024-03-31') === 2023, `got ${fy('2024-03-31')}`);
assert('Returns a number',                   typeof fy('2025-06-01') === 'number');

// --- calculateCurrentFY ---
console.log('\ncalculateCurrentFY():');

const current = calculateCurrentFY();
assert('Returns an object', typeof current === 'object' && current !== null);
assert('Has startYear', 'startYear' in current && typeof current.startYear === 'number');
assert('Has endYear',   'endYear' in current   && typeof current.endYear === 'number');
assert('Has key',       'key' in current       && typeof current.key === 'string');
assert('endYear is startYear + 1', current.endYear === current.startYear + 1,
    `startYear=${current.startYear}, endYear=${current.endYear}`);
assert('key matches FY{startYear}', current.key === `FY${current.startYear}`,
    `key=${current.key}, startYear=${current.startYear}`);

// Confirm current FY is consistent with calculateFinancialYear for today
const todayFY = calculateFinancialYear(new Date());
assert('currentFY.startYear matches calculateFinancialYear(today)', current.startYear === todayFY,
    `currentFY.startYear=${current.startYear}, calculateFinancialYear(today)=${todayFY}`);

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
