/**
 * Common UI components and utilities
 */

// Strip legacy Facebook OAuth fragment (#_=_) from the URL
if (window.location.hash === '#_=_') {
    history.replaceState(null, '', window.location.href.replace('#_=_', ''));
}

// Inject favicon, manifest, and iOS PWA meta tags into <head> (single source of truth)
document.head.insertAdjacentHTML('beforeend',
    '<link rel="icon" type="image/png" href="/img/logo.png">' +
    '<link rel="manifest" href="/site.webmanifest">' +
    '<link rel="apple-touch-icon" href="/img/icon-192.png">' +
    '<meta name="apple-mobile-web-app-capable" content="yes">' +
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">' +
    '<meta name="apple-mobile-web-app-title" content="DTV Tracker">'
);

// Update or create meta tags by name/property (used by detail pages after data loads)
function setPageMeta({ description, ogTitle, ogDescription } = {}) {
    const setMeta = (attr, key, value) => {
        if (!value) return;
        let el = document.head.querySelector(`meta[${attr}="${key}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, key);
            document.head.appendChild(el);
        }
        el.setAttribute('content', value);
    };
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', ogTitle);
    setMeta('property', 'og:description', ogDescription || description);
}

/**
 * Build breadcrumb trail based on the current page's position in the hierarchy.
 * Each page has fixed parents — navigation always goes "up".
 */
function getBreadcrumbs() {
    const path = window.location.pathname;
    const crumbs = [{ href: '/', label: 'Home' }];

    // Listing pages: one level below Home
    if (path === '/groups.html' || path === '/sessions.html' || path === '/volunteers.html') {
        return crumbs;
    }

    // Media library index: one level below Home
    if (path === '/media/' || path === '/media/index.html') {
        return crumbs;
    }

    // Media session gallery: Home > Media
    if (path === '/media/session.html') {
        crumbs.push({ href: '/media/', label: 'Media' });
        return crumbs;
    }

    // Group detail: Home > Groups
    if (path.startsWith('/groups/') && path.endsWith('/detail.html')) {
        crumbs.push({ href: '/groups.html', label: 'Groups' });
        return crumbs;
    }

    // Session detail: Home > [Group] (display name updated by page script after load)
    if (path.startsWith('/sessions/') && path.endsWith('/details.html')) {
        const group = path.split('/')[2];
        crumbs.push({ href: `/groups/${group}/detail.html`, label: group });
        return crumbs;
    }

    // Profile detail: Home > Volunteers, or Home > Sessions > Session if navigated from a session/entry
    if (path.startsWith('/profiles/') && path.endsWith('/details.html')) {
        const ref = document.referrer;
        const fromSession = ref.match(/\/sessions\/([^/]+)\/([^/]+)\/details\.html/);
        const fromEntry = ref.match(/\/entries\/([^/]+)\/([^/]+)\//);
        const match = fromSession || fromEntry;
        if (match) {
            crumbs.push({ href: '/sessions.html', label: 'Sessions' });
            crumbs.push({ href: `/sessions/${match[1]}/${match[2]}/details.html`, label: 'Session' });
        } else {
            crumbs.push({ href: '/volunteers.html', label: 'Volunteers' });
        }
        return crumbs;
    }

    // Add entry: Home > Sessions > Session
    if (path.startsWith('/sessions/') && path.endsWith('/add-entry.html')) {
        const parts = path.split('/');
        const group = parts[2];
        const date = parts[3];
        crumbs.push({ href: '/sessions.html', label: 'Sessions' });
        crumbs.push({ href: `/sessions/${group}/${date}/details.html`, label: 'Session' });
        return crumbs;
    }

    // Entry detail: Home > [Group] > [Session] (both updated by page script after load)
    if (path.startsWith('/entries/') && path.endsWith('/edit.html')) {
        return crumbs; // page script fills in group + session after API load
    }

    // Upload: Home > Sessions > Session (from referrer if available)
    if (path === '/upload.html') {
        const ref = document.referrer;
        const fromSession = ref.match(/\/sessions\/([^/]+)\/([^/]+)\/details\.html/);
        if (fromSession) {
            crumbs.push({ href: '/sessions.html', label: 'Sessions' });
            crumbs.push({ href: `/sessions/${fromSession[1]}/${fromSession[2]}/details.html`, label: 'Session' });
        }
        return crumbs;
    }

    return crumbs;
}

/**
 * Create and insert the site header
 */
function createHeader(subtitle = 'Stats, Sign-ups, Photos .', showBackLink = false) {
    const crumbs = showBackLink ? getBreadcrumbs() : null;
    const breadcrumbHtml = crumbs
        ? crumbs.map(c => `<a href="${c.href}">${c.label}</a>`).join('<span class="breadcrumb-sep">/</span>')
        : '';
    const isCompact = showBackLink && breadcrumbHtml.length > 0;
    const headerHTML = `
        <header class="site-header${isCompact ? ' compact' : ''}">
            <div class="header-top">
                <div class="header-brand">
                    <img src="/img/logo.png" alt="DTV" class="header-logo">
                    <h1>My DTV Tracker</h1>
                </div>
                <div class="user-info" id="userInfo"></div>
            </div>
            <p>${subtitle}</p>
        </header>
        ${showBackLink ? `
        <nav class="site-nav">
            <div class="nav-crumbs">${breadcrumbHtml}</div>
            <button class="share-btn" id="shareBtn" style="display:none" title="Share this page">
                <img src="/svg/share.svg" class="btn-icon" alt="" width="16" height="16">
                <span class="btn-label">Share</span>
            </button>
        </nav>
        ` : ''}
    `;
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn && navigator.share) {
        shareBtn.style.display = '';
        shareBtn.addEventListener('click', () => {
            navigator.share({ title: document.title, url: window.location.href });
        });
    }

    fetch('/auth/me')
        .then(r => r.json())
        .then(data => {
            const el = document.getElementById('userInfo');
            if (data.authenticated) {
                window.currentUser = data.user;
                document.body.dataset.role = data.user.role;
                document.dispatchEvent(new CustomEvent('authReady', { detail: data.user }));
                if (el) {
                    const profileBtn = data.user.profileSlug
                        ? `<a href="/profiles/${encodeURIComponent(data.user.profileSlug)}/details.html" class="header-btn" title="${escapeHtml(data.user.displayName)}"><img src="/svg/profile.svg" class="btn-icon" alt="" width="16" height="16"><span class="btn-label">${escapeHtml(data.user.displayName)}</span></a>`
                        : `<span class="header-btn"><img src="/svg/profile.svg" class="btn-icon" alt="" width="16" height="16"><span class="btn-label">${escapeHtml(data.user.displayName)}</span></span>`;
                    el.innerHTML = `
                        ${profileBtn}
                        <a href="/auth/logout" class="header-btn" title="Logout"><img src="/svg/logout.svg" class="btn-icon" alt="" width="16" height="16"><span class="btn-label">Logout</span></a>
                    `;
                }
            } else {
                if (el) {
                    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
                    el.innerHTML = `<a href="/login.html?returnTo=${returnTo}" class="header-btn login-btn"><img src="/svg/profile.svg" class="btn-icon" alt="" width="16" height="16"><span class="btn-label">Log in</span></a>`;
                }
            }
        })
        .catch(() => {});
}

/**
 * Create the site footer
 */
function createFooter() {
    document.body.insertAdjacentHTML('beforeend', `
        <footer class="site-footer">
            <p><span class="footer-seg">&copy; ${new Date().getFullYear()} <a href="https://www.deantrailvolunteers.org.uk" target="_blank" rel="noopener">Dean Trail Volunteers</a></span> &middot; <span class="footer-seg">Charity No. <a href="https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/5243025" target="_blank" rel="noopener">1208988</a></span></p>
            <p><span class="footer-seg"><a href="/privacy.html">Privacy Policy</a></span> &middot; <span class="footer-seg"><a href="/terms.html">Terms of Use</a></span> &middot; <span class="footer-seg"><a href="#" id="about-link">About</a></span></p>
        </footer>
        <div id="about-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
            <div style="background:var(--surface,#fff);border-radius:12px;padding:1.5rem;max-width:340px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,0.18);">
                <h3 style="margin:0 0 1rem;font-size:1.1rem;">DTV Tracker App</h3>
                <p style="margin:0 0 0.5rem;font-size:0.9rem;">Build: <span id="about-build-link"></span></p>
                <p style="margin:0 0 0.5rem;font-size:0.9rem;">GitHub: <a id="about-github-link" href="#" target="_blank" rel="noopener"></a></p>
                <p style="margin:0 0 0.5rem;font-size:0.9rem;">Contact: <a href="mailto:admin@deantrailvolunteers.org.uk">admin@deantrailvolunteers.org.uk</a></p>
                <p style="margin:0 0 1.25rem;font-size:0.9rem;">Licence: <a href="https://github.com/gothandy/dtv-tracker-app/blob/main/LICENSE" target="_blank" rel="noopener">MIT</a></p>
                <button id="about-close" class="btn btn-secondary" style="width:100%;">Close</button>
            </div>
        </div>
    `);

    document.getElementById('about-link').addEventListener('click', e => {
        e.preventDefault();
        fetch('/build.json')
            .then(r => r.ok ? r.json() : null)
            .then(info => {
                const modal = document.getElementById('about-modal');
                if (info) {
                    const d = new Date(info.built);
                    const date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                    const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    const buildLink = document.getElementById('about-build-link');
                    buildLink.textContent = `${date} ${time}`;

                    const githubLink = document.getElementById('about-github-link');
                    githubLink.textContent = info.commit.slice(0, 7);
                    githubLink.href = `https://github.com/gothandy/dtv-tracker-app/commit/${info.commit}`;
                }
                modal.style.display = 'flex';
            })
            .catch(() => {
                document.getElementById('about-modal').style.display = 'flex';
            });
    });

    document.getElementById('about-close').addEventListener('click', () => {
        document.getElementById('about-modal').style.display = 'none';
    });

    document.getElementById('about-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
}

/**
 * Format a date string for display (e.g. "7 Feb 2026")
 */
function formatDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get FY key string (e.g. "FY2025") with optional offset (-1 for last FY)
 */
function getFYKey(offset = 0) {
    const now = new Date();
    const fyStartYear = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + offset;
    return `FY${fyStartYear}`;
}

/**
 * Cookie helpers for persisting filter state across pages
 */
function setCookie(name, value, days = 0) {
    let cookie = `${name}=${encodeURIComponent(value)};path=/`;
    if (days > 0) cookie += `;expires=${new Date(Date.now() + days * 864e5).toUTCString()}`;
    document.cookie = cookie;
}
function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Convert FY key (e.g. "FY2025") to URL param value (e.g. "2025-2026")
 */
function fyKeyToParam(fyKey) {
    if (fyKey === 'all') return null;
    const startYear = parseInt(fyKey.replace('FY', ''));
    return `${startYear}-${startYear + 1}`;
}

/**
 * Read FY selection: URL param takes priority, then current FY default.
 */
function getStoredFY(fallback) {
    const params = new URLSearchParams(window.location.search);
    const fy = params.get('fy');
    if (fy === 'all') return 'all';
    if (fy) {
        const startYear = parseInt(fy.split('-')[0]);
        if (!isNaN(startYear)) return `FY${startYear}`;
    }
    return fallback || getFYKey(0);
}

/**
 * Update URL to reflect FY selection.
 * Current FY (default) omits the param for a clean URL.
 */
function persistFY(fyKey) {
    const url = new URL(window.location.href);
    if (fyKey === getFYKey(0)) {
        url.searchParams.delete('fy');
    } else if (fyKey === 'all') {
        url.searchParams.set('fy', 'all');
    } else {
        const startYear = parseInt(fyKey.replace('FY', ''));
        if (!isNaN(startYear)) url.searchParams.set('fy', `${startYear}-${startYear + 1}`);
    }
    history.replaceState(null, '', url);
}

/**
 * Show an error message in a container
 */
function showError(container, title, message) {
    container.innerHTML = `
        <div class="error">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(message)}</p>
            <p class="hint">Make sure the server is running: <code>node app.js</code></p>
        </div>
    `;
}

/**
 * Clamp all .description elements to 3 lines with a "show more" toggle.
 * Call after rendering content that contains descriptions.
 */
function clampDescriptions(container) {
    const root = container || document;
    root.querySelectorAll('.description').forEach(el => {
        // Skip if already processed
        if (el.dataset.clamped) return;
        el.dataset.clamped = 'true';

        el.classList.add('description-clamped');

        // Check after a frame so layout is computed
        requestAnimationFrame(() => {
            if (el.scrollHeight <= el.clientHeight) return;

            const toggle = document.createElement('div');
            toggle.className = 'description-toggle';
            toggle.textContent = 'Show more';
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const clamped = el.classList.toggle('description-clamped');
                toggle.textContent = clamped ? 'Show more' : 'Show less';
            });
            el.insertAdjacentElement('afterend', toggle);
        });
    });
}

/**
 * Toggle a dropdown menu open/closed, closing any other open dropdowns.
 * Also registers a one-time document click listener to close on outside click.
 */
function toggleDropdown(menuId) {
    const menu = document.getElementById(menuId);
    const wasOpen = menu.classList.contains('open');
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    if (!wasOpen) menu.classList.add('open');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }
});

/**
 * Check if a volunteer object qualifies as a member (15+ hours in either FY)
 */
function isMember(volunteer) {
    if (volunteer.isGroup) return false;
    return (volunteer.hoursLastFY >= 15 || volunteer.hoursThisFY >= 15);
}

/**
 * Build an Eventbrite link button HTML string
 */
function buildEventbriteLink(url) {
    return `<a class="btn-action btn-eventbrite" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="Eventbrite">
        <img src="/svg/eventbrite.svg" width="18" height="18" alt="Eventbrite" style="filter: brightness(0) invert(1)">
    </a>`;
}

function initEventbriteButtons() {}

/**
 * Fetch wrapper that redirects to login on 401
 */
async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        window.location.href = '/login.html?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search);
        throw new Error('Authentication required');
    }
    return response;
}
