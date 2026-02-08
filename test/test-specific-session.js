require('dotenv').config();
const sharepoint = require('./services/sharepoint');

async function testSpecificSession() {
    console.log('Testing 2025-04-09 Wed session...\n');

    try {
        const [sessions, entries] = await Promise.all([
            sharepoint.getSessions(),
            sharepoint.getEntries()
        ]);

        // Find the session
        const targetSession = sessions.find(s =>
            s.Title && s.Title.includes('2025-04-09') ||
            (s.Date && s.Date.startsWith('2025-04-09'))
        );

        if (!targetSession) {
            console.log('❌ Session not found');
            console.log('\nSearching for sessions in April 2025:');
            sessions
                .filter(s => s.Date && s.Date.startsWith('2025-04'))
                .slice(0, 10)
                .forEach(s => {
                    console.log(`  ${s.Date} - ${s.Title} - ID: ${s.ID}`);
                });
            return;
        }

        console.log('✓ Found session:');
        console.log(`  ID: ${targetSession.ID}`);
        console.log(`  Title: ${targetSession.Title}`);
        console.log(`  Date: ${targetSession.Date}`);
        console.log(`  FinancialYearFlow: ${targetSession.FinancialYearFlow || 'null'}\n`);

        // Find entries for this session
        const sessionEntries = entries.filter(e =>
            parseInt(e.EventLookupId, 10) === targetSession.ID
        );

        console.log(`Entries for this session: ${sessionEntries.length}`);

        // Sum hours
        const totalHours = sessionEntries.reduce((sum, e) =>
            sum + (parseFloat(e.Hours) || 0), 0
        );

        console.log(`Total Hours: ${totalHours}\n`);

        if (sessionEntries.length > 0) {
            console.log('Volunteer hours breakdown:');
            sessionEntries.forEach(e => {
                console.log(`  ${e.Volunteer}: ${e.Hours} hours`);
            });
        }

        // Check FY filtering
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const currentFY = `FY${fyStartYear}`;
        const fyStartDate = new Date(Date.UTC(fyStartYear, 3, 1));
        const fyEndDate = new Date(Date.UTC(fyStartYear + 1, 2, 31, 23, 59, 59));

        console.log(`\nFY Filtering (${currentFY}):`);

        // Check if this session would be included in FY stats
        let includedInFY = false;
        if (targetSession.FinancialYearFlow) {
            includedInFY = targetSession.FinancialYearFlow === currentFY;
            console.log(`  Has FinancialYearFlow: ${targetSession.FinancialYearFlow}`);
            console.log(`  Matches ${currentFY}: ${includedInFY}`);
        } else {
            const sessionDate = new Date(targetSession.Date);
            includedInFY = sessionDate >= fyStartDate && sessionDate <= fyEndDate;
            console.log(`  No FinancialYearFlow (using date fallback)`);
            console.log(`  Session Date: ${sessionDate.toISOString()}`);
            console.log(`  In FY range: ${includedInFY}`);
        }

        console.log(`\n${includedInFY ? '✓' : '✗'} This session ${includedInFY ? 'IS' : 'IS NOT'} included in FY ${currentFY} stats`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testSpecificSession();
