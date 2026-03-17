/**
 * Common UI components and utilities
 */

// Strip legacy Facebook OAuth fragment (#_=_) from the URL
if (window.location.hash === '#_=_') {
    history.replaceState(null, '', window.location.href.replace('#_=_', ''));
}

// Inject favicon and manifest links into <head> (single source of truth)
document.head.insertAdjacentHTML('beforeend',
    '<link rel="icon" type="image/png" href="/img/logo.png">' +
    '<link rel="manifest" href="/site.webmanifest">'
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
function createHeader(subtitle = 'Volunteer hours tracking and registration system', showBackLink = false) {
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
                    <h1>DTV Tracker</h1>
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
            <p>&copy; ${new Date().getFullYear()} <a href="https://www.deantrailvolunteers.org.uk" target="_blank" rel="noopener">Dean Trail Volunteers</a> &middot; Charity No. <a href="https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/5243025" target="_blank" rel="noopener">1208988</a></p>
            <p><a href="/privacy.html">Privacy Policy</a> &middot; <a href="/terms.html">Terms of Use</a></p>
        </footer>
    `);
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
        <svg viewBox="0 0 1000 1214" fill="white"><path d="M917 814.9L515.3 501.7c-6.7-5.1.2-15.4 7.5-11.3l156.9 87.9c71.1 39.9 161 16.8 204.1-52.4 45.4-73 21.4-169.1-53.2-212.2L600.4 180.6c-7.3-4.3-1.9-15.3 6-12.2l105.8 42.3c.2.1 2.7 1 3.7 1.3 11.2 3.9 23.3 6.1 35.9 6.1 57.4 0 104.5-45.4 108.6-99.4C865.5 48.9 812 0 748.2 0h-489c-62.8 0-115.5 51.3-114.7 113.9.4 33.3 15.3 63 38.7 83.4 17.6 15.3 76.9 62.8 105.1 85.3 5 4 2.2 12.1-4.3 12.1h-97.9C83.2 295.3 0 378.9 0 482c0 52.1 21.3 99.2 55.6 133.1l566.6 538.5c40.1 37.4 93.9 60.3 153.1 60.3 124.1 0 224.7-100.6 224.7-224.7 0-70.3-32.4-133.1-83-174.3z"/></svg>
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
