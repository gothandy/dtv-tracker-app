const express = require('express');
const sharepoint = require('./services/sharepoint');
require('dotenv').config();

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
    console.log('  - GET /api/groups');
    console.log('  - GET /api/sessions');
    console.log('  - GET /api/profiles');
});