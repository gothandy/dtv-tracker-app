require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs').promises;
const apiRoutes = require('./dist/routes/api');
const authRoutes = require('./dist/routes/auth');
const uploadRoutes = require('./dist/routes/upload');
const { requireAuth } = require('./dist/middleware/require-auth');
const { groupsRepository } = require('./dist/services/repositories/groups-repository');
const { sessionsRepository } = require('./dist/services/repositories/sessions-repository');
const { findGroupByKey, findSessionByGroupAndDate, convertGroup } = require('./dist/services/data-layer');
const { SESSION_NOTES } = require('./dist/services/field-names');
const { mediaDriveId } = require('./dist/services/media-upload');
const { sharePointClient } = require('./dist/services/sharepoint-client');

// Cache the session-detail HTML template in memory (read once, reuse across requests)
let _sessionDetailHtml = null;
async function getSessionDetailTemplate() {
    if (!_sessionDetailHtml) {
        _sessionDetailHtml = await fs.readFile(path.join(__dirname, 'public', 'session-detail.html'), 'utf8');
    }
    return _sessionDetailHtml;
}

function escapeHtmlAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

// Serve static assets that must be public (manifest, icons, CSS, JS)
app.get('/site.webmanifest', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public', 'site.webmanifest'));
});
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/svg', express.static(path.join(__dirname, 'public', 'svg')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.ico')));

// Upload page — public, code validates itself (handles /upload and /upload/AGHR)
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});
app.get('/upload/:code', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});
app.use('/api', uploadRoutes);

// Public pages — served before auth so unauthenticated visitors can browse
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/sessions.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sessions.html')));
app.get('/groups.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'groups.html')));
app.get('/groups/:key/detail.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'group-detail.html')));
// Session detail: server-side OG meta tag injection so social crawlers (Facebook etc.) get real content
app.get('/sessions/:group/:date/details.html', async (req, res) => {
    const groupKey = req.params.group.toLowerCase();
    const dateParam = req.params.date;
    try {
        const [rawGroups, rawSessions] = await Promise.all([
            groupsRepository.getAll(),
            sessionsRepository.getAll()
        ]);

        const spGroup = findGroupByKey(rawGroups, groupKey);
        const spSession = spGroup ? findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam) : null;

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const canonicalUrl = `${baseUrl}${req.path}`;

        // Default to DTV logo; use first session photo if available
        let imageUrl = `${baseUrl}/img/logo-930.jpg`;
        try {
            const driveId = mediaDriveId();
            const photos = await sharePointClient.listFolderPhotos(driveId, `${groupKey}/${dateParam}`);
            if (photos.length > 0 && photos[0].largeUrl) imageUrl = photos[0].largeUrl;
        } catch { /* media library not configured or folder missing */ }

        let title = 'Session Details - DTV Tracker';
        let description = 'DTV volunteer session';

        if (spGroup && spSession) {
            const group = convertGroup(spGroup);
            const sessionName = spSession.Name || spSession.Title || group.displayName;
            const date = new Date(dateParam);
            const formattedDate = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            title = `${sessionName} — ${formattedDate}`;
            description = spSession[SESSION_NOTES] || `${group.displayName} volunteer session on ${formattedDate}`;
        }

        let html = await getSessionDetailTemplate();
        html = html
            .replace('<title>Session Details - DTV Tracker</title>', `<title>${escapeHtmlAttr(title)}</title>`)
            .replace('property="og:title" content=""', `property="og:title" content="${escapeHtmlAttr(title)}"`)
            .replace('property="og:description" content=""', `property="og:description" content="${escapeHtmlAttr(description)}"`)
            .replace('property="og:url" content=""', `property="og:url" content="${canonicalUrl}"`)
            .replace('property="og:image" content=""', `property="og:image" content="${escapeHtmlAttr(imageUrl)}"`);

        res.set('Content-Type', 'text/html').send(html);
    } catch (err) {
        console.error(`Error rendering session meta tags for ${groupKey}/${dateParam}:`, err);
        res.sendFile(path.join(__dirname, 'public', 'session-detail.html'));
    }
});

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
