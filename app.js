require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { pathToFileURL } = require('url');
const apiRoutes = require('./dist/routes/api');
const authRoutes = require('./dist/routes/auth');
const { requireAuth } = require('./dist/middleware/require-auth');
const { authMiddleware } = require('./dist/middleware/auth');
const { groupsRepository } = require('./dist/services/repositories/groups-repository');
const { sessionsRepository } = require('./dist/services/repositories/sessions-repository');
const { findGroupByKey, findSessionByGroupAndDate, convertGroup } = require('./dist/services/data-layer');
const { SESSION_NOTES, SESSION_COVER_MEDIA } = require('./dist/services/field-names');
const { mediaDriveId } = require('./dist/services/media-upload');
const { sharePointClient } = require('./dist/services/sharepoint-client');
const { getCoverCache, setCoverCache } = require('./dist/services/cover-cache');
const axios = require('axios');

// v1 or v2 — controls which frontend is served at /
// Set SITE_MODE in .env locally. Defaults to v1.
const siteMode = process.env.SITE_MODE || 'v1';
const isDev = process.env.NODE_ENV === 'development';

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

// Static assets shared by both modes (icons come from frontend/dist)
const staticOptions = { maxAge: '1h' };
app.use('/icons', express.static(path.join(__dirname, 'frontend', 'dist', 'icons'), staticOptions));

// Serve in both modes — Vue index.html requests it and auth error paths may redirect to /login.html
app.get('/site.webmanifest', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public', 'site.webmanifest'));
});

if (siteMode === 'v1') {
    // v1-specific static assets
    app.use('/svg', express.static(path.join(__dirname, 'frontend', 'dist', 'icons'), staticOptions)); // legacy alias — v1 only
    app.use('/img', express.static(path.join(__dirname, 'public', 'img'), staticOptions));
    app.use('/css', express.static(path.join(__dirname, 'public', 'css'), staticOptions));
    app.use('/js', express.static(path.join(__dirname, 'public', 'js'), staticOptions));
    app.use('/media/embla', express.static(path.join(__dirname, 'public', 'media', 'embla'), staticOptions));
    app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.ico')));

    // Vue frontend at /v2/
    app.use('/v2', express.static(path.join(__dirname, 'frontend', 'dist')));
    app.get('/v2/*path', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html')));

    // Public pages — served before auth so unauthenticated visitors can browse
    app.get('/upload.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'upload.html'));
    });
    app.get('/login.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });
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

            // Use stable proxy URL if any media exists; proxy handles cover selection internally
            let imageUrl = `${baseUrl}/img/logo-930.jpg`;
            try {
                const driveId = mediaDriveId();
                const photos = await sharePointClient.listFolderPhotos(driveId, `${groupKey}/${dateParam}`);
                if (photos.length > 0) imageUrl = `${baseUrl}/media/${groupKey}/${dateParam}/cover.jpg`;
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
}

if (siteMode === 'v2') {
    // Redirect /login.html to /login — auth error paths in magic.ts still redirect to /login.html
    app.get('/login.html', (_req, res) => res.redirect(302, '/login'));

    // Redirect v1 session detail URLs to v2 equivalents (bookmarked or shared links).
    // 302 not 301 — browser-cached 301s would survive a rollback to v1 where /details.html is valid again.
    app.get('/sessions/:group/:date/details.html', (req, res) => {
        res.redirect(302, `/sessions/${req.params.group}/${req.params.date}`);
    });

    app.get('/profiles/:slug/consent.html', (req, res) => {
        res.redirect(302, `/profiles/${req.params.slug}/consent`);
    });

    app.get('/upload.html', (req, res) => {
        const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        res.redirect(302, `/upload${qs}`);
    });

    if (!isDev) {
        // Production: serve built static assets before API routes for performance.
        // Dev: Vite middleware (added during server startup) handles asset serving and HMR.
        app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
    }
}

// Public cover image proxy — stable URL for og:image and public gallery slides.
// Authenticated users (admin/check-in): cover photo served regardless of isPublic; not cached.
// Unauthenticated users: cover photo only served if isPublic is true; response cached 1h.
app.get('/media/:group/:date/cover.jpg', async (req, res) => {
    const groupKey = req.params.group.toLowerCase();
    const dateParam = req.params.date;
    const isAuthenticated = !!req.session?.user;
    const cacheKey = `${groupKey}/${dateParam}`;
    try {
        if (!isAuthenticated) {
            const cached = getCoverCache(cacheKey);
            if (cached) {
                res.set('Content-Type', cached.contentType);
                res.set('Cache-Control', 'public, max-age=3600');
                return res.send(cached.data);
            }
        }

        const driveId = mediaDriveId();
        const [photos, rawGroups, rawSessions] = await Promise.all([
            sharePointClient.listFolderPhotos(driveId, `${groupKey}/${dateParam}`),
            groupsRepository.getAll(),
            sessionsRepository.getAll()
        ]);
        if (photos.length === 0) return res.redirect('/img/logo-930.jpg');

        const spGroup = findGroupByKey(rawGroups, groupKey);
        const spSession = spGroup ? findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam) : null;
        const coverMediaId = spSession?.[SESSION_COVER_MEDIA] ? parseInt(String(spSession[SESSION_COVER_MEDIA]), 10) || null : null;
        const coverPhoto = coverMediaId ? photos.find(p => p.listItemId === coverMediaId) : null;

        // Authenticated: serve cover as-is; unauthenticated: only if isPublic
        const photo = isAuthenticated
            ? coverPhoto
            : (coverPhoto?.isPublic !== false ? coverPhoto : null);
        if (!photo) return res.redirect('/img/logo-930.jpg');

        const imageUrl = photo.largeUrl || photo.thumbnailUrl;
        if (!imageUrl) return res.redirect('/img/logo-930.jpg');

        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
        const imageData = Buffer.from(imageResponse.data);

        if (!isAuthenticated) {
            setCoverCache(cacheKey, imageData, contentType);
            res.set('Cache-Control', 'public, max-age=3600');
        } else {
            res.set('Cache-Control', 'private, no-store');
        }

        res.set('Content-Type', contentType);
        res.send(imageData);
    } catch (err) {
        console.error(`Error serving cover image for ${groupKey}/${dateParam}:`, err);
        res.redirect('/img/logo-930.jpg');
    }
});

if (siteMode === 'v1') {
    // Policy pages — public, required for Google OAuth consent screen
    app.get('/privacy.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
    app.get('/terms.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));
    app.get('/build.json', (req, res) => res.sendFile(path.join(__dirname, 'public', 'build.json')));

    // Everything below requires login (v1 pages)
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

    // Serve entry edit page — ID-based URL (preferred) and legacy group/date/slug URL
    app.get('/entries/:id/edit.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'entry-detail.html'));
    });
    app.get('/entries/:group/:date/:slug/edit.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'entry-detail.html'));
    });

    // Serve profile detail page at /profiles/:slug/details.html
    app.get('/profiles/:slug/details.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'profile-detail.html'));
    });

    // Serve consent collection page at /profiles/:slug/consent.html
    app.get('/profiles/:slug/consent.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'consent.html'));
    });
}

// Mount API routes.
// requireAuth checks req.path for its whitelist (/api/stats, /api/sessions etc.) and for
// its 401-vs-redirect logic (/api/ → JSON, other → redirect to login.html). Both break if
// requireAuth is mounted inline at /api, because req.path loses its /api prefix inside a
// sub-path mount. Always apply requireAuth as a global (un-prefixed) middleware so req.path
// stays intact.
//
// v1: global requireAuth already registered above covers everything including API routes.
// v2: no global requireAuth (SPA handles its own auth for pages), so apply it here but only
//     for /api paths to avoid incorrectly gating SPA page routes.
if (siteMode === 'v2') {
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/') || req.path === '/api') return requireAuth(req, res, next);
        next();
    });
}
app.use('/api', apiRoutes);

if (siteMode === 'v2') {
    // Catch unmatched /api/* before the SPA fallback to avoid returning HTML for API 404s
    app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

    if (!isDev) {
        // Production: SPA fallback for client-side routes
        app.get('/*path', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html')));
    }
    // Dev: Vite middleware handles SPA routing (added during server startup below)
}

// Start server — async to support Vite middleware in v2 dev mode
const port = process.env.PORT || 3000;
(async () => {
    if (siteMode === 'v2' && isDev) {
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
            console.log(`Running at http://localhost:${port} [SITE_MODE=${siteMode}, Vite HMR active]`);
        });
    } else {
        app.listen(port, () => {
            console.log(`Running at http://localhost:${port} [SITE_MODE=${siteMode}]`);
        });
    }
})();
