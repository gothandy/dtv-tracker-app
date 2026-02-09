const express = require('express');
const sharepoint = require('../services/sharepoint');
const { enrichSessions, sortSessionsByDate, validateArray, validateSession, validateEntry, validateGroup } = require('../dist/services/data-layer');

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
        const [sessionsRaw, entriesRaw, groupsRaw] = await Promise.all([
            sharepoint.getSessions(),
            sharepoint.getEntries(),
            sharepoint.getGroups()
        ]);

        // Validate data from SharePoint (logs warnings for invalid items)
        const sessions = validateArray(sessionsRaw, validateSession, 'Session');
        const entries = validateArray(entriesRaw, validateEntry, 'Entry');
        const groups = validateArray(groupsRaw, validateGroup, 'Group');

        // Use data layer to enrich sessions with stats and group names
        // This handles all the SharePoint nasties:
        // - Title vs Name convention
        // - Type coercion (string vs number IDs)
        // - Lookup map building
        // - Stats calculation
        const enrichedSessions = enrichSessions(sessions, entries, groups);

        // Sort by date (most recent first)
        const sortedSessions = sortSessionsByDate(enrichedSessions);

        // Convert to API response format with SharePoint field names for backwards compatibility
        const apiSessions = sortedSessions.map(session => ({
            ID: session.id,
            Title: session.title,
            Name: session.displayName,
            Description: session.notes,
            Date: session.date.toISOString(),
            CrewLookupId: session.groupId ? String(session.groupId) : undefined,
            GroupName: session.groupName,
            Registrations: session.registrations,
            Hours: session.hours,
            FinancialYearFlow: session.financialYear,
            EventbriteEventID: session.eventbriteEventId,
            Url: session.eventbriteUrl,
            Created: session.created.toISOString(),
            Modified: session.modified.toISOString()
        }));

        res.json({
            success: true,
            count: apiSessions.length,
            data: apiSessions
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
