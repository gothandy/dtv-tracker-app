require('dotenv').config();
const sharepoint = require('./services/sharepoint');

async function testFYEntries() {
    console.log('Testing entries for FY2025 sessions...\n');

    try {
        const [sessions, entries] = await Promise.all([
            sharepoint.getSessions(),
            sharepoint.getEntries()
        ]);

        const currentFY = 'FY2025';

        // Get sessions with FY2025
        const sessionsFY = sessions.filter(s => s.FinancialYearFlow === currentFY);
        console.log(`Sessions with ${currentFY}: ${sessionsFY.length}`);

        // Get session IDs
        const sessionIdsFY = new Set(sessionsFY.map(s => s.ID));
        console.log(`Session IDs: ${Array.from(sessionIdsFY).join(', ')}\n`);

        // Filter entries for those sessions
        const entriesFY = entries.filter(entry => {
            if (!entry.EventLookupId) return false;
            const sessionId = parseInt(entry.EventLookupId, 10);
            return sessionIdsFY.has(sessionId);
        });

        console.log(`Entries for ${currentFY} sessions: ${entriesFY.length}`);

        // Sum hours
        const totalHours = entriesFY.reduce((sum, e) => sum + (parseFloat(e.Hours) || 0), 0);
        console.log(`Total Hours: ${totalHours}\n`);

        // Show entries by session
        sessionsFY.forEach(session => {
            const sessionEntries = entriesFY.filter(e => parseInt(e.EventLookupId, 10) === session.ID);
            const sessionHours = sessionEntries.reduce((sum, e) => sum + (parseFloat(e.Hours) || 0), 0);
            console.log(`${session.Date.split('T')[0]} - ${session.Title}:`);
            console.log(`  ${sessionEntries.length} entries, ${sessionHours} hours`);
        });

        // Now check: What if we used DATE filtering instead?
        console.log('\n--- Comparison: Date-based filtering ---\n');

        const fyStartDate = new Date(Date.UTC(2025, 3, 1)); // April 1, 2025
        const fyEndDate = new Date(Date.UTC(2026, 2, 31, 23, 59, 59)); // March 31, 2026

        const sessionDateMap = new Map();
        sessions.forEach(session => {
            if (session.Date) {
                sessionDateMap.set(session.ID, new Date(session.Date));
            }
        });

        const entriesByDate = entries.filter(entry => {
            if (!entry.EventLookupId) return false;
            const sessionId = parseInt(entry.EventLookupId, 10);
            const sessionDate = sessionDateMap.get(sessionId);
            if (!sessionDate) return false;
            return sessionDate >= fyStartDate && sessionDate <= fyEndDate;
        });

        const hoursByDate = entriesByDate.reduce((sum, e) => sum + (parseFloat(e.Hours) || 0), 0);
        const uniqueSessions = new Set(entriesByDate.map(e => parseInt(e.EventLookupId, 10)));

        console.log(`Date-based filtering (Apr 1, 2025 - Mar 31, 2026):`);
        console.log(`  ${entriesByDate.length} entries`);
        console.log(`  ${uniqueSessions.size} unique sessions`);
        console.log(`  ${hoursByDate} total hours`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testFYEntries();
