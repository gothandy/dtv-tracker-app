require('dotenv').config();
const { entriesRepository } = require('../dist/services/repositories/entries-repository');

async function testEntries() {
    console.log('Testing Entries list data...\n');

    try {
        const entries = await entriesRepository.getAll();

        console.log(`✓ Retrieved ${entries.length} entries\n`);

        if (entries.length > 0) {
            console.log('First entry (all fields):');
            console.log(JSON.stringify(entries[0], null, 2));
            console.log('\n');

            // Check how many entries have EntryDate
            const entriesWithEntryDate = entries.filter(e => e.EntryDate).length;
            console.log(`Entries with EntryDate: ${entriesWithEntryDate} of ${entries.length}`);

            // Check for entries with Hours
            const entriesWithHours = entries.filter(e => e.Hours).length;
            console.log(`Entries with Hours: ${entriesWithHours} of ${entries.length}`);

            // Sum all hours
            const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.Hours) || 0), 0);
            console.log(`Total Hours (all entries): ${totalHours}`);

            // Show field names from first entry
            console.log('\nAvailable fields in first entry:');
            console.log(Object.keys(entries[0]).join(', '));
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testEntries();
