/**
 * Test runner
 *
 * Runs each test file and strips log noise (cache, fetch, dotenv).
 * On pass: shows one summary line per file.
 * On fail: shows the failing assertion lines so the problem is immediately visible.
 *
 * Run: npm run test:live
 */

require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const tests = [
  'test-auth.js',
  'test-records.js',
  'test-data-contracts.js',
  'test-eventbrite-live.js',
  'test-media-taxonomy.js',
];

// Lines worth keeping from test output (assertions, summaries, fatal errors)
const KEEP = [
  /^\s+[✓✗]/,        // assertion results: "  ✓ ..." or "  ✗ ..."
  /\d+ passed/,       // summary: "16 passed, 0 failed"
  /^✗\s/,            // top-level failures (test-auth.js style)
  /^Fatal error/,     // fatal crash line
];

function filterOutput(output) {
  return output
    .split('\n')
    .filter(line => KEEP.some(r => r.test(line)))
    .map(line => '    ' + line.trim())
    .join('\n');
}

let allPassed = true;
console.log();

for (const file of tests) {
  const result = spawnSync('node', [path.join(__dirname, file)], { encoding: 'utf8' });
  const ok = result.status === 0;
  const combined = result.stdout + (result.stderr || '');
  const summary = combined.match(/(\d+) passed, (\d+) failed/);
  const summaryStr = summary ? `${summary[1]} passed, ${summary[2]} failed` : '';

  if (ok) {
    console.log(`  ✓ ${file}${summaryStr ? '  —  ' + summaryStr : ''}`);
  } else {
    allPassed = false;
    console.log(`  ✗ ${file}${summaryStr ? '  —  ' + summaryStr : ''}`);
    const detail = filterOutput(combined);
    if (detail.trim()) console.log(detail);
  }
}

console.log();
if (allPassed) {
  console.log('All tests passed.');
} else {
  console.log('Some tests failed.');
  process.exit(1);
}
