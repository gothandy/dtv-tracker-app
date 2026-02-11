require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./dist/routes/api');
const authRoutes = require('./dist/routes/auth');
const { requireAuth } = require('./dist/middleware/require-auth');

const app = express();

// Trust Azure App Service reverse proxy (for correct req.protocol)
app.set('trust proxy', 1);

app.use(express.json());

// Session management
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        sameSite: 'lax',
    },
}));

// Health check (unprotected — Azure health probes)
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// Auth routes (unprotected — login/callback/logout/me)
app.use('/auth', authRoutes);

// Everything below requires login
app.use(requireAuth);

app.use(express.static('public'));

// Serve group detail page at /groups/:key/detail.html
app.get('/groups/:key/detail.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'group-detail.html'));
});

// Serve session detail page at /sessions/:group/:date/details.html
app.get('/sessions/:group/:date/details.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'session-detail.html'));
});

// Serve add entry page at /sessions/:group/:date/add-entry.html
app.get('/sessions/:group/:date/add-entry.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'add-entry.html'));
});

// Serve entry edit page at /entries/:group/:date/:slug/edit.html
app.get('/entries/:group/:date/:slug/edit.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'entry-detail.html'));
});

// Serve profile detail page at /profiles/:slug/details.html
app.get('/profiles/:slug/details.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile-detail.html'));
});

// Mount API routes
app.use('/api', apiRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Running at http://localhost:${port}`);
});
