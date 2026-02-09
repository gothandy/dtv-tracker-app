require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./dist/routes/api');
const authRoutes = require('./dist/routes/auth');
const { requireAuth } = require('./dist/middleware/require-auth');

const app = express();

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

// Mount API routes
app.use('/api', apiRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Running at http://localhost:${port}`);
});
