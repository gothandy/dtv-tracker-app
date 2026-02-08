require('dotenv').config();
const express = require('express');
const sharepoint = require('./services/sharepoint');

const app = express();

app.use(express.static('public'));
app.use(express.json());

// API Routes

// Get all groups (crews)
app.get('/api/groups', async (req, res) => {
    try {
        const groups = await sharepoint.getGroups();
        res.json({
            success: true,
            count: groups.length,
            data: groups
        });
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch groups from SharePoint',
            message: error.message
        });
    }
});

// Get all sessions (events)
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await sharepoint.getSessions();
        res.json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sessions from SharePoint',
            message: error.message
        });
    }
});

// Get all profiles (volunteers)
app.get('/api/profiles', async (req, res) => {
    try {
        const profiles = await sharepoint.getProfiles();
        res.json({
            success: true,
            count: profiles.length,
            data: profiles
        });
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profiles from SharePoint',
            message: error.message
        });
    }
});

// Get dashboard statistics (server-side aggregation for mobile performance)
app.get('/api/stats', async (req, res) => {
    try {
        // Fetch groups and sessions in parallel
        const [groups, sessions] = await Promise.all([
            sharepoint.getGroups(),
            sharepoint.getSessions()
        ]);

        // Calculate current Financial Year (April 1 to March 31)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 3=Apr)

        // FY starts in April, so if we're before April, FY started last year
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyEndYear = fyStartYear + 1;
        const fyStart = new Date(fyStartYear, 3, 1); // April 1
        const fyEnd = new Date(fyEndYear, 2, 31, 23, 59, 59); // March 31

        // Filter sessions for current FY
        const sessionsFY = sessions.filter(session => {
            if (!session.Date) return false;
            const sessionDate = new Date(session.Date);
            return sessionDate >= fyStart && sessionDate <= fyEnd;
        });

        // Sum hours for current FY
        const totalHoursFY = sessionsFY.reduce((sum, session) => {
            return sum + (parseFloat(session.Hours) || 0);
        }, 0);

        res.json({
            success: true,
            data: {
                totalGroups: groups.length,
                totalSessions: sessions.length,
                sessionsFY: sessionsFY.length,
                hoursFY: Math.round(totalHoursFY),
                financialYear: `${fyStartYear}-${fyEndYear}`
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

app.listen(3000, () => {
    console.log('Running at http://localhost:3000');
    console.log('API endpoints available:');
    console.log('  - GET /api/health');
    console.log('  - GET /api/stats');
    console.log('  - GET /api/groups');
    console.log('  - GET /api/sessions');
    console.log('  - GET /api/profiles');
});