require('dotenv').config();

const API_KEY = process.env.API_SYNC_KEY;
const BASE_URL = 'http://localhost:3000';

async function testUserFilter() {
    console.log('Testing user field in /api/profiles response...\n');

    const res = await fetch(`${BASE_URL}/api/profiles`, {
        headers: { 'X-Api-Key': API_KEY }
    });

    if (!res.ok) {
        console.error(`API returned ${res.status}: ${res.statusText}`);
        process.exit(1);
    }

    const result = await res.json();
    if (!result.success) {
        console.error('API error:', result.error);
        process.exit(1);
    }

    const profiles = result.data;
    console.log(`Total profiles: ${profiles.length}`);

    const withUser = profiles.filter(p => p.user);
    const withoutGroup = profiles.filter(p => !p.isGroup && p.user);

    console.log(`Profiles with user field set: ${withUser.length}`);
    console.log(`Non-group profiles with user field set: ${withoutGroup.length}`);

    if (withUser.length > 0) {
        console.log('\nSample profiles with user set:');
        withUser.slice(0, 3).forEach(p => {
            console.log(`  - ${p.name} | user: "${p.user}" | isGroup: ${p.isGroup}`);
        });
    }

    // Check if user field exists at all on any profile
    const hasUserKey = profiles.some(p => 'user' in p);
    console.log(`\n"user" key present in response objects: ${hasUserKey}`);

    if (!hasUserKey) {
        console.log('\n✗ PROBLEM: "user" field is missing from API response — build may not have run.');
    } else if (withUser.length === 0) {
        console.log('\n✗ PROBLEM: "user" field exists but no profiles have a value set.');
    } else {
        console.log('\n✓ API looks correct.');
    }
}

testUserFilter().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
});
