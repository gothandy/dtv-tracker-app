require('dotenv').config();
const sharepoint = require('./services/sharepoint');

async function testFYValues() {
    console.log('Testing FinancialYearFlow values in Sessions...\n');

    try {
        const sessions = await sharepoint.getSessions();

        console.log(`Total sessions: ${sessions.length}\n`);

        // Count sessions with FinancialYearFlow
        const sessionsWithFY = sessions.filter(s => s.FinancialYearFlow);
        console.log(`Sessions with FinancialYearFlow: ${sessionsWithFY.length} of ${sessions.length}\n`);

        // Get unique FY values
        const fyValues = new Set();
        sessions.forEach(s => {
            if (s.FinancialYearFlow) {
                fyValues.add(s.FinancialYearFlow);
            }
        });

        console.log('Unique FinancialYearFlow values:');
        Array.from(fyValues).sort().forEach(fy => {
            const count = sessions.filter(s => s.FinancialYearFlow === fy).length;
            console.log(`  ${fy}: ${count} sessions`);
        });

        // Calculate current FY
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const currentFY = `FY${fyStartYear}`;

        console.log(`\nCurrent FY (calculated): ${currentFY}`);
        const currentFYCount = sessions.filter(s => s.FinancialYearFlow === currentFY).length;
        console.log(`Sessions with ${currentFY}: ${currentFYCount}`);

        // Show sample sessions with FY
        if (sessionsWithFY.length > 0) {
            console.log('\nSample sessions with FinancialYearFlow:');
            sessionsWithFY.slice(0, 5).forEach(s => {
                console.log(`  ${s.Date} - ${s.Title} - FY: ${s.FinancialYearFlow}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testFYValues();
