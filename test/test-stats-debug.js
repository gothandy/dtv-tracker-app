require('dotenv').config();
const sharepoint = require('./services/sharepoint');

async function testStats() {
    console.log('Testing stats calculation with UTC dates...\n');

    try {
        const [groups, sessions, entries] = await Promise.all([
            sharepoint.getGroups(),
            sharepoint.getSessions(),
            sharepoint.getEntries()
        ]);

        console.log(`Loaded: ${groups.length} groups, ${sessions.length} sessions, ${entries.length} entries\n`);

        // Calculate current Financial Year (April 1 to March 31) - SAME AS APP.JS
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 3=Apr)

        // FY starts in April, so if we're before April, FY started last year
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyEndYear = fyStartYear + 1;

        console.log(`Today: ${now.toISOString()}`);
        console.log(`Current Year: ${currentYear}, Current Month: ${currentMonth} (${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][currentMonth]})`);
        console.log(`FY Start Year: ${fyStartYear}`);
        console.log(`FY: ${fyStartYear}-${fyEndYear}\n`);

        // Create FY date range in UTC (session dates are in UTC) - SAME AS APP.JS
        const fyStartDate = new Date(Date.UTC(fyStartYear, 3, 1)); // April 1, 00:00:00 UTC
        const fyEndDate = new Date(Date.UTC(fyEndYear, 2, 31, 23, 59, 59)); // March 31, 23:59:59 UTC

        console.log(`FY Start Date (UTC): ${fyStartDate.toISOString()}`);
        console.log(`FY End Date (UTC): ${fyEndDate.toISOString()}\n`);

        // Create a map of session ID to session date for fast lookup - SAME AS APP.JS
        const sessionDateMap = new Map();
        sessions.forEach(session => {
            if (session.Date) {
                sessionDateMap.set(session.ID, new Date(session.Date));
            }
        });

        console.log(`Session date map size: ${sessionDateMap.size}\n`);

        // Filter entries by the session date (via EventLookupId) - SAME AS APP.JS
        const entriesFY = entries.filter(entry => {
            if (!entry.EventLookupId) return false;
            // Convert EventLookupId from string to number for Map lookup
            const sessionId = parseInt(entry.EventLookupId, 10);
            const sessionDate = sessionDateMap.get(sessionId);
            if (!sessionDate) return false;
            return sessionDate >= fyStartDate && sessionDate <= fyEndDate;
        });

        console.log(`Entries in FY ${fyStartYear}: ${entriesFY.length} of ${entries.length}`);

        // Sum individual volunteer hours from entries (not event hours from sessions) - SAME AS APP.JS
        const totalHoursFY = entriesFY.reduce((sum, entry) => {
            return sum + (parseFloat(entry.Hours) || 0);
        }, 0);

        // Count unique sessions in current FY - SAME AS APP.JS
        const sessionIdsFY = new Set(entriesFY.map(entry => entry.EventLookupId).filter(id => id));

        console.log(`Unique sessions in FY ${fyStartYear}: ${sessionIdsFY.size}`);
        console.log(`Total Hours in FY ${fyStartYear}: ${Math.round(totalHoursFY * 10) / 10}\n`);

        if (entriesFY.length > 0) {
            console.log('First 10 entries in FY:');
            entriesFY.slice(0, 10).forEach(e => {
                const sessionId = parseInt(e.EventLookupId, 10);
                const sessionDate = sessionDateMap.get(sessionId);
                console.log(`  ${e.Event} - ${sessionDate?.toISOString()} - ${e.Volunteer} - ${e.Hours} hrs`);
            });
        } else {
            console.log('❌ No entries found in FY!');
            console.log('\nDEBUG: Checking first 5 entries:');
            entries.slice(0, 5).forEach(e => {
                const sessionId = parseInt(e.EventLookupId, 10);
                const sessionDate = sessionDateMap.get(sessionId);
                const inRange = sessionDate && sessionDate >= fyStartDate && sessionDate <= fyEndDate;
                console.log(`  Entry ${e.ID}: EventLookupId="${e.EventLookupId}" (parsed: ${sessionId})`);
                console.log(`    Session date: ${sessionDate?.toISOString() || 'NOT FOUND'}`);
                console.log(`    In FY range? ${inRange}`);
                console.log(`    Comparison: ${sessionDate?.toISOString()} >= ${fyStartDate.toISOString()} && <= ${fyEndDate.toISOString()}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testStats();
