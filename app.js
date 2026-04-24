require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { pathToFileURL } = require('url');
const apiRoutes = require('./dist/backend/routes/api');
const authRoutes = require('./dist/backend/routes/auth');
const { requireAuth } = require('./dist/backend/middleware/require-auth');
const { authMiddleware } = require('./dist/backend/middleware/auth');
const { groupsRepository } = require('./dist/backend/services/repositories/groups-repository');
const { sessionsRepository } = require('./dist/backend/services/repositories/sessions-repository');
const { findGroupByKey, findSessionByGroupAndDate, convertGroup } = require('./dist/backend/services/data-layer');
const { SESSION_NOTES, SESSION_COVER_MEDIA } = require('./dist/backend/services/field-names');
const { mediaDriveId } = require('./dist/backend/services/media-upload');
const { sharePointClient } = require('./dist/backend/services/sharepoint-client');
const { getMediaCache, setMediaCache } = require('./dist/backend/services/media-cache');
const axios = require('axios');

const isDev = process.env.NODE_ENV === 'development';

let _v2IndexHtml = null;
async function getV2IndexTemplate() {
    if (!_v2IndexHtml) {
        _v2IndexHtml = await fs.readFile(path.join(__dirname, 'frontend', 'dist', 'index.html'), 'utf8');
    }
    return _v2IndexHtml;
}

function escapeHtmlAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const app = express();

// Trust Azure App Service reverse proxy (for correct req.protocol)
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

// Session management (used for DTV account auth and returnTo during login flows)
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours — DTV account sessions only
        sameSite: 'lax',
    },
}));

// Auth middleware — populates req.session.user from dtv-auth cookie for self-service volunteers.
// Must run after session() so DTV account sessions are already present.
app.use(authMiddleware);

// Health check (unprotected — Azure health probes)
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// Auth routes (unprotected — login/callback/logout/me)
app.use('/auth', authRoutes);

const staticOptions = { maxAge: '1h' };

if (!isDev) {
    // Production: serve built static assets (includes frontend/public/ files verbatim)
    app.use(express.static(path.join(__dirname, 'frontend', 'dist'), staticOptions));
}

// Stable media proxy — serves SharePoint images via stable app-domain URLs.
// Trusted users (admin/check-in/read-only) always served; self-service and public only see isPublic === true items.
// Public items cached 12h in memory and 24h in browser. Retries once on 401/403 with fresh folder metadata.
app.get('/media/:group/:date/:id', async (req, res) => {
    const groupKey = req.params.group.toLowerCase();
    const dateParam = req.params.date;
    const listItemId = parseInt(req.params.id, 10);
    if (isNaN(listItemId)) return res.status(400).end();

    const role = req.session?.user?.role;
    const isTrusted = !!role && role !== 'selfservice';

    // Serve from memory cache for public items (only cache public bytes)
    if (!isTrusted) {
        const cached = getMediaCache(listItemId);
        if (cached) {
            res.set('Content-Type', cached.contentType);
            res.set('Cache-Control', 'public, max-age=86400');
            return res.send(cached.data);
        }
    }

    const driveId = mediaDriveId();
    const folderPath = `${groupKey}/${dateParam}`;

    async function fetchAndServe(allowRetry) {
        const photos = await sharePointClient.listFolderPhotos(driveId, folderPath);
        const photo = photos.find(p => p.listItemId === listItemId);
        if (!photo) return res.status(404).end();
        if (!isTrusted && photo.isPublic !== true) return res.status(403).end();

        const imageUrl = photo.largeUrl || photo.thumbnailUrl;
        if (!imageUrl) return res.status(404).end();

        try {
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
            const imageData = Buffer.from(imageResponse.data);

            if (!isTrusted) {
                setMediaCache(listItemId, imageData, contentType);
                res.set('Cache-Control', 'public, max-age=86400');
            } else {
                res.set('Cache-Control', 'private, no-store');
            }
            res.set('Content-Type', contentType);
            res.send(imageData);
        } catch (err) {
            if (allowRetry && (err.response?.status === 401 || err.response?.status === 403)) {
                // Pre-auth URL expired — refresh folder metadata and retry once
                sharePointClient.clearMediaFolderCache(folderPath);
                return fetchAndServe(false);
            }
            throw err;
        }
    }

    try {
        await fetchAndServe(true);
    } catch (err) {
        console.error(`Error serving media ${groupKey}/${dateParam}/${listItemId}:`, err);
        res.status(502).end();
    }
});

// Mount API routes.
// requireAuth checks req.path for its whitelist (/api/stats, /api/sessions etc.) and for
// its 401-vs-redirect logic (/api/ → JSON, other → redirect to login). Both break if
// requireAuth is mounted inline at /api, because req.path loses its /api prefix inside a
// sub-path mount. Always apply requireAuth as a global (un-prefixed) middleware so req.path
// stays intact.
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/api') return requireAuth(req, res, next);
    next();
});
app.use('/api', apiRoutes);

// Catch unmatched /api/* before the SPA fallback to avoid returning HTML for API 404s
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

if (!isDev) {
    // Server-side OG meta tag injection for session detail pages (social crawler support).
    // Must be before the SPA fallback so crawlers get real og:image/title/description.
    app.get('/sessions/:group/:date', async (req, res) => {
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

            let imageUrl = `${baseUrl}/img/logo-930.jpg`;
            try {
                const driveId = mediaDriveId();
                const photos = await sharePointClient.listFolderPhotos(driveId, `${groupKey}/${dateParam}`);
                const coverMediaId = spSession?.[SESSION_COVER_MEDIA] ? parseInt(String(spSession[SESSION_COVER_MEDIA]), 10) || null : null;
                const coverPhoto = coverMediaId ? photos.find(p => p.listItemId === coverMediaId && p.isPublic === true) : null;
                if (coverPhoto) imageUrl = `${baseUrl}/media/${groupKey}/${dateParam}/${coverPhoto.listItemId}`;
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

            let html = await getV2IndexTemplate();
            html = html.replace(
                '</head>',
                `<title>${escapeHtmlAttr(title)}</title>` +
                `<meta property="og:title" content="${escapeHtmlAttr(title)}">` +
                `<meta property="og:description" content="${escapeHtmlAttr(description)}">` +
                `<meta property="og:url" content="${canonicalUrl}">` +
                `<meta property="og:image" content="${escapeHtmlAttr(imageUrl)}">` +
                `<meta property="og:type" content="website">` +
                `</head>`
            );
            res.set('Content-Type', 'text/html').send(html);
        } catch (err) {
            console.error(`Error rendering session meta tags for ${groupKey}/${dateParam}:`, err);
            res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
        }
    });

    // SPA fallback for all other client-side routes
    app.get('/*path', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html')));
}

// Start server — async to support Vite middleware in dev mode
const port = process.env.PORT || 3000;
(async () => {
    if (isDev) {
        // Load Vite from frontend/node_modules (it's installed there, not at root)
        const viteDir = pathToFileURL(path.join(__dirname, 'frontend', 'node_modules', 'vite', 'dist', 'node', 'index.js')).href;
        const { createServer: createViteServer } = await import(viteDir);

        // Create the HTTP server explicitly so Vite can attach its HMR WebSocket to it
        const httpServer = http.createServer(app);

        const vite = await createViteServer({
            configFile: path.join(__dirname, 'frontend', 'vite.config.ts'),
            root: path.join(__dirname, 'frontend'),
            server: { middlewareMode: true, hmr: { server: httpServer } },
            appType: 'spa',
        });

        // Vite middleware handles asset serving, HMR, and SPA routing (catch-all index.html)
        app.use(vite.middlewares);

        httpServer.listen(port, () => {
            console.log(`Running at http://localhost:${port} [dev, Vite HMR active]`);
        });
    } else {
        app.listen(port, () => {
            console.log(`Running at http://localhost:${port}`);
        });
    }
})();
