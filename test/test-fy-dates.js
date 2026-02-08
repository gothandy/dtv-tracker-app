require('dotenv').config();
const sharepoint = require('./services/sharepoint');

async function testFYDates() {
    console.log('Testing Financial Year date filtering...\n');

    try {
        const [sessions, entries] = await Promise.all([
            sharepoint.getSessions(),
            sharepoint.getEntries()
        ]);

        // Calculate current FY
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 3=Apr)
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyEndYear = fyStartYear + 1;

        console.log(`Today: ${now.toISOString().split('T')[0]}`);
        console.log(`Current FY: ${fyStartYear}-${fyEndYear} (April ${fyStartYear} to March ${fyEndYear})\n`);

        // Create FY date range
        const fyStartDate = new Date(fyStartYear, 3, 1); // April 1
        const fyEndDate = new Date(fyEndYear, 2, 31, 23, 59, 59); // March 31 end of day

        console.log(`FY Start Date: ${fyStartDate.toISOString().split('T')[0]}`);
        console.log(`FY End Date: ${fyEndDate.toISOString().split('T')[0]}\n`);

        // Count sessions in current FY
        const sessionsInFY = sessions.filter(s => {
            if (!s.Date) return false;
            const sessionDate = new Date(s.Date);
            return sessionDate >= fyStartDate && sessionDate <= fyEndDate;
        });

        console.log(`Sessions in FY ${fyStartYear}: ${sessionsInFY.length} of ${sessions.length}`);

        // Show first 5 sessions with dates
        console.log('\nFirst 5 sessions with dates:');
        sessions.filter(s => s.Date).slice(0, 5).forEach(s => {
            const sessionDate = new Date(s.Date);
            const inFY = sessionDate >= fyStartDate && sessionDate <= fyEndDate;
            console.log(`  ${s.Date} - ${s.Title} - In FY? ${inFY}`);
        });

        // Create session date map
        const sessionDateMap = new Map();
        sessions.forEach(session => {
            if (session.Date) {
                sessionDateMap.set(session.ID, new Date(session.Date));
            }
        });

        // Filter entries by session date
        const entriesInFY = entries.filter(entry => {
            if (!entry.EventLookupId) return false;
            const sessionDate = sessionDateMap.get(entry.EventLookupId);
            if (!sessionDate) return false;
            return sessionDate >= fyStartDate && sessionDate <= fyEndDate;
        });

        console.log(`\nEntries in FY ${fyStartYear}: ${entriesInFY.length} of ${entries.length}`);

        // Sum hours
        const totalHours = entriesInFY.reduce((sum, e) => sum + (parseFloat(e.Hours) || 0), 0);
        console.log(`Total Hours in FY ${fyStartYear}: ${totalHours}`);

        // Show some entries
        if (entriesInFY.length > 0) {
            console.log('\nFirst 5 entries in FY:');
            entriesInFY.slice(0, 5).forEach(e => {
                const sessionDate = sessionDateMap.get(e.EventLookupId);
                console.log(`  ${e.Event} (${sessionDate.toISOString().split('T')[0]}) - ${e.Volunteer} - ${e.Hours} hours`);
            });
        }

        // Check all unique years in session dates
        const years = new Set();
        sessions.forEach(s => {
            if (s.Date) {
                const year = new Date(s.Date).getFullYear();
                years.add(year);
            }
        });
        console.log(`\nYears with sessions: ${Array.from(years).sort().join(', ')}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testFYDates();
