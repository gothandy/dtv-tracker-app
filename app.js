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
        // Fetch groups, sessions, and entries in parallel
        const [groups, sessions, entries] = await Promise.all([
            sharepoint.getGroups(),
            sharepoint.getSessions(),
            sharepoint.getEntries()
        ]);

        // Calculate current Financial Year (April 1 to March 31)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 3=Apr)

        // FY starts in April, so if we're before April, FY started last year
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyEndYear = fyStartYear + 1;
        const currentFY = `FY${fyStartYear}`;

        // Create FY date range for fallback when FinancialYearFlow is null
        const fyStartDate = new Date(Date.UTC(fyStartYear, 3, 1)); // April 1, 00:00:00 UTC
        const fyEndDate = new Date(Date.UTC(fyEndYear, 2, 31, 23, 59, 59)); // March 31, 23:59:59 UTC

        // Create maps for session lookup
        // Note: FinancialYearFlow on Entries is not maintained; use Sessions.FinancialYearFlow instead
        // Note: FinancialYearFlow is auto-populated by Power Automate but not backfilled for older sessions
        const sessionDataMap = new Map();
        sessions.forEach(session => {
            sessionDataMap.set(session.ID, {
                fy: session.FinancialYearFlow,
                date: session.Date ? new Date(session.Date) : null
            });
        });

        // Filter entries using hybrid approach:
        // 1. Use Sessions.FinancialYearFlow when populated (preferred)
        // 2. Fall back to date-based filtering when FinancialYearFlow is null (for older sessions)
        const entriesFY = entries.filter(entry => {
            if (!entry.EventLookupId) return false;

            // Convert EventLookupId from string to number for Map lookup
            const sessionId = parseInt(entry.EventLookupId, 10);
            const sessionData = sessionDataMap.get(sessionId);
            if (!sessionData) return false;

            // Prefer FinancialYearFlow if available
            if (sessionData.fy) {
                return sessionData.fy === currentFY;
            }

            // Fall back to date-based filtering
            if (sessionData.date) {
                return sessionData.date >= fyStartDate && sessionData.date <= fyEndDate;
            }

            return false;
        });

        // Sum individual volunteer hours from entries (not event hours from sessions)
        const totalHoursFY = entriesFY.reduce((sum, entry) => {
            return sum + (parseFloat(entry.Hours) || 0);
        }, 0);

        // Count unique sessions in current FY
        const sessionIdsFY = new Set(entriesFY.map(entry => entry.EventLookupId).filter(id => id));

        // Count unique groups/crews with active sessions in current FY
        // Get the group ID for each session in the FY
        const activeGroupIds = new Set();
        sessionIdsFY.forEach(sessionIdStr => {
            const sessionId = parseInt(sessionIdStr, 10);
            const session = sessions.find(s => s.ID === sessionId);
            if (session && session.CrewLookupId) {
                activeGroupIds.add(session.CrewLookupId);
            }
        });

        res.json({
            success: true,
            data: {
                activeGroupsFY: activeGroupIds.size,
                sessionsFY: sessionIdsFY.size,
                hoursFY: Math.round(totalHoursFY * 10) / 10, // Round to 1 decimal place
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