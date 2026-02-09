const express = require('express');
const sharepoint = require('../services/sharepoint');

const router = express.Router();

// Get all groups (crews)
router.get('/groups', async (req, res) => {
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

// Get all sessions (events) with calculated hours and registrations from Entries
router.get('/sessions', async (req, res) => {
    try {
        // Fetch sessions, entries, and groups in parallel
        const [sessions, entries, groups] = await Promise.all([
            sharepoint.getSessions(),
            sharepoint.getEntries(),
            sharepoint.getGroups()
        ]);

        // Create a map of group ID to group Name (convert ID to string for consistent lookup)
        const groupMap = {};
        groups.forEach(group => {
            groupMap[String(group.ID)] = group.Name || group.Title;
        });

        // Group entries by session ID and calculate hours/registrations
        const sessionStats = {};
        entries.forEach(entry => {
            const sessionId = entry.EventLookupId;
            if (!sessionId) return;

            if (!sessionStats[sessionId]) {
                sessionStats[sessionId] = {
                    registrations: 0,
                    hours: 0
                };
            }

            sessionStats[sessionId].registrations++;
            sessionStats[sessionId].hours += parseFloat(entry.Hours) || 0;
        });

        // Add calculated stats and group name to each session
        const sessionsWithStats = sessions.map(session => ({
            ...session,
            Registrations: sessionStats[session.ID]?.registrations || 0,
            Hours: Math.round((sessionStats[session.ID]?.hours || 0) * 10) / 10, // Round to 1 decimal
            GroupName: session.CrewLookupId ? groupMap[session.CrewLookupId] : null
        }));

        // Debug: Log first session to verify GroupName is added
        if (sessionsWithStats.length > 0) {
            console.log('[Sessions API] First session GroupName:', sessionsWithStats[0].GroupName);
        }

        // Sort by Date descending (most recent first)
        sessionsWithStats.sort((a, b) => {
            const dateA = a.Date ? new Date(a.Date) : new Date(0);
            const dateB = b.Date ? new Date(b.Date) : new Date(0);
            return dateB - dateA;
        });

        res.json({
            success: true,
            count: sessionsWithStats.length,
            data: sessionsWithStats
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
router.get('/profiles', async (req, res) => {
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
router.get('/stats', async (req, res) => {
    try {
        // Calculate current Financial Year (April 1 to March 31)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 3=Apr)

        // FY starts in April, so if we're before April, FY started last year
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyEndYear = fyStartYear + 1;
        const currentFY = `FY${fyStartYear}`;

        // Fetch sessions for current FY (filtered at SharePoint - works well)
        // and all entries (filtering at SharePoint is slow due to complex OR conditions)
        const [sessionsFY, entries] = await Promise.all([
            sharepoint.getSessionsByFY(currentFY),
            sharepoint.getEntries()
        ]);

        // Create set of session IDs for quick lookup
        const sessionIdsFY = new Set(sessionsFY.map(s => s.ID));

        // Filter entries by current FY sessions (in Node.js - faster than complex OData)
        const entriesFY = entries.filter(entry => {
            if (!entry.EventLookupId) return false;
            const sessionId = parseInt(entry.EventLookupId, 10);
            return sessionIdsFY.has(sessionId);
        });

        console.log(`[Stats] Total entries: ${entries.length}, FY entries: ${entriesFY.length}, FY sessions: ${sessionsFY.length}`);

        // Sum individual volunteer hours from entries (not event hours from sessions)
        let entriesWithHours = 0;
        const totalHoursFY = entriesFY.reduce((sum, entry) => {
            const hours = parseFloat(entry.Hours) || 0;
            if (hours > 0) entriesWithHours++;
            return sum + hours;
        }, 0);

        console.log(`[Stats] Entries with hours: ${entriesWithHours}, Total hours: ${totalHoursFY}`);

        // Count unique groups/crews with active sessions in current FY
        const activeGroupIds = new Set(
            sessionsFY
                .filter(s => s.CrewLookupId)
                .map(s => parseInt(s.CrewLookupId, 10))
        );

        res.json({
            success: true,
            data: {
                activeGroupsFY: activeGroupIds.size,
                sessionsFY: sessionsFY.length,
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
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Clear cache endpoint
router.post('/cache/clear', (req, res) => {
    try {
        sharepoint.clearCache();
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache',
            message: error.message
        });
    }
});

// Get cache statistics
router.get('/cache/stats', (req, res) => {
    try {
        const stats = sharepoint.getCacheStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching cache stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cache stats',
            message: error.message
        });
    }
});

module.exports = router;
