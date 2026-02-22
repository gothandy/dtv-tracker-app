/**
 * Common UI components and utilities
 */

// Inject favicon and manifest links into <head> (single source of truth)
document.head.insertAdjacentHTML('beforeend',
    '<link rel="icon" type="image/png" href="/img/logo.png">' +
    '<link rel="manifest" href="/site.webmanifest">'
);

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

    // Session detail: Home > Sessions
    if (path.startsWith('/sessions/') && path.endsWith('/details.html')) {
        crumbs.push({ href: '/sessions.html', label: 'Sessions' });
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

    // Entry detail: Home > Sessions > Session
    if (path.startsWith('/entries/') && path.endsWith('/edit.html')) {
        const parts = path.split('/');
        const group = parts[2];
        const date = parts[3];
        crumbs.push({ href: '/sessions.html', label: 'Sessions' });
        crumbs.push({ href: `/sessions/${group}/${date}/details.html`, label: 'Session' });
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
    const headerHTML = `
        <header class="site-header${showBackLink ? ' compact' : ''}">
            <div class="header-top">
                <div class="header-brand">
                    <img src="/img/logo.png" alt="DTV" class="header-logo">
                    <h1>DTV Tracker</h1>
                </div>
                <div class="user-info" id="userInfo"></div>
            </div>
            <p>${subtitle}</p>
        </header>
        ${breadcrumbHtml ? `
        <nav class="site-nav">
            ${breadcrumbHtml}
        </nav>
        ` : ''}
    `;
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    fetch('/auth/me')
        .then(r => r.json())
        .then(data => {
            if (data.authenticated) {
                document.body.dataset.role = data.user.role;
                const el = document.getElementById('userInfo');
                if (el) {
                    const nameHtml = data.user.profileSlug
                        ? `<a href="/profiles/${encodeURIComponent(data.user.profileSlug)}/details.html" class="user-name">${escapeHtml(data.user.displayName)}</a>`
                        : `<span class="user-name">${escapeHtml(data.user.displayName)}</span>`;
                    el.innerHTML = `
                        ${nameHtml}
                        <a href="/auth/logout" class="logout-link">Logout</a>
                    `;
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
            <p>Dean Trail Volunteers &copy; ${new Date().getFullYear()}</p>
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
 * Build a countdown string for an upcoming session date
 * Returns null if the date is in the past
 */
function getCountdown(dateString) {
    if (!dateString) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sessionDate = new Date(dateString);
    sessionDate.setHours(0, 0, 0, 0);
    const diffMs = sessionDate - now;
    if (diffMs < 0) return null;
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
}

/**
 * Find the nearest upcoming session date from a list.
 * Returns the Date, or null if none are upcoming.
 */
function findNextSessionDate(sessions) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let nearest = null;
    for (const s of sessions) {
        if (!s.date) continue;
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        if (d >= now && (!nearest || d < nearest)) nearest = d;
    }
    return nearest;
}

/**
 * Find the most recent past session date from a list.
 * Returns the Date, or null if none are past.
 */
function findLastSessionDate(sessions) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let latest = null;
    for (const s of sessions) {
        if (!s.date) continue;
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        if (d < now && (!latest || d > latest)) latest = d;
    }
    return latest;
}

/**
 * Build the URL for a session detail page from a session object
 */
function buildSessionDetailUrl(session) {
    if (!session.groupKey || !session.date) return '#';
    const dateStr = session.date.substring(0, 10);
    return `/sessions/${encodeURIComponent(session.groupKey)}/${dateStr}/details.html`;
}

/**
 * Render a list of session cards into a container element
 */
function renderSessionList(container, sessions, options = {}) {
    const { showGroup = true } = options;

    if (sessions.length === 0) {
        container.innerHTML = '<p class="no-sessions">No sessions</p>';
        return;
    }

    const nextDate = findNextSessionDate(sessions);
    const lastDate = findLastSessionDate(sessions);

    const list = document.createElement('div');
    list.className = 'sessions-list';

    sessions.forEach((session, i) => {
        let isNext = false;
        let isLast = false;
        if (nextDate && session.date) {
            const d = new Date(session.date);
            d.setHours(0, 0, 0, 0);
            isNext = d.getTime() === nextDate.getTime();
        }
        if (lastDate && session.date) {
            const d = new Date(session.date);
            d.setHours(0, 0, 0, 0);
            isLast = d.getTime() === lastDate.getTime();
        }
        const countdown = isNext ? getCountdown(session.date) : null;
        const url = buildSessionDetailUrl(session);

        let card;
        if (isLast) {
            card = document.createElement('div');
            card.className = 'session-card last-session';
            card.dataset.sessionIdx = String(i);
            card.dataset.sessionPath = `${session.groupKey}/${(session.date || '').substring(0, 10)}`;
            card.addEventListener('click', () => { window.location.href = url; });
            card.innerHTML = `
                <div class="last-session-label">Last session</div>
                <div class="date">${formatDate(session.date)}</div>
                <div class="title">${escapeHtml(session.displayName)}</div>
                ${showGroup && session.groupName ? `<div class="group">${escapeHtml(session.groupName)}</div>` : ''}
                <div class="photo-carousel-slot"></div>
                ${session.description ? `<div class="description">${escapeHtml(session.description)}</div>` : ''}
                ${session.registrations || session.hours || session.photoCount ? `<div class="meta">
                    ${session.registrations ? `<div class="meta-item"><strong>Attendees:</strong> ${session.registrations}</div>` : ''}
                    ${session.hours ? `<div class="meta-item"><strong>Hours:</strong> ${session.hours}</div>` : ''}
                    ${session.photoCount ? `<div class="meta-item"><strong>Media:</strong> ${session.photoCount}</div>` : ''}
                </div>` : ''}
            `;
        } else {
            card = document.createElement('a');
            card.className = 'session-card' + (isNext ? ' next-session' : '');
            card.href = url;
            card.innerHTML = `
                ${countdown ? `<div class="countdown">Next session &middot; ${countdown}</div>` : ''}
                <div class="date">${formatDate(session.date)}</div>
                <div class="title">${escapeHtml(session.displayName)}</div>
                ${showGroup && session.groupName ? `<div class="group">${escapeHtml(session.groupName)}</div>` : ''}
                ${session.description ? `<div class="description">${escapeHtml(session.description)}</div>` : ''}
                ${session.registrations || session.hours || session.photoCount ? `<div class="meta">
                    ${session.registrations ? `<div class="meta-item"><strong>${new Date(session.date) >= new Date(new Date().toDateString()) ? 'Registrations' : 'Attendees'}:</strong> ${session.registrations}</div>` : ''}
                    ${session.hours ? `<div class="meta-item"><strong>Hours:</strong> ${session.hours}</div>` : ''}
                    ${session.photoCount ? `<div class="meta-item"><strong>Media:</strong> ${session.photoCount}</div>` : ''}
                </div>` : ''}
            `;
        }
        list.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(list);
    clampDescriptions(list);

    // Lazy-load photos for last-session cards
    list.querySelectorAll('.session-card.last-session[data-session-idx]').forEach(card => {
        const idx = parseInt(card.dataset.sessionIdx, 10);
        const parts = (card.dataset.sessionPath || '').split('/');
        const gk = parts[0];
        const date = parts[1];
        if (gk && date) loadCardPhotos(card, gk, date, sessions[idx]);
    });
}

/**
 * Fetch photo counts for a list of sessions and attach as session.photoCount.
 * Makes one Graph API call per unique group key. Silently ignores errors.
 */
async function attachPhotoCounts(sessions) {
    if (!sessions.length) return;
    const paths = sessions
        .filter(s => s.groupKey && s.date)
        .map(s => `${s.groupKey}/${s.date.substring(0, 10)}`);
    if (!paths.length) return;
    try {
        const res = await fetch(`/api/photos/counts?paths=${encodeURIComponent(paths.join(','))}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;
        const counts = data.data;
        sessions.forEach(s => {
            if (s.groupKey && s.date) {
                const count = counts[`${s.groupKey}/${s.date.substring(0, 10)}`];
                if (count) s.photoCount = count;
            }
        });
    } catch { /* photo counts are optional */ }
}

/**
 * Render photos into a carousel slot element inside a session card.
 */
function populatePhotoSlot(slot, photos) {
    slot.innerHTML = '<div class="photo-strip">' +
        photos.map(p =>
            `<a href="${escapeHtml(p.webUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">` +
            `<img src="${escapeHtml(p.thumbnailUrl)}" alt="${escapeHtml(p.name)}" loading="lazy"></a>`
        ).join('') + '</div>';
}

/**
 * Async photo loader for last-session cards. Caches results on session._photos.
 */
async function loadCardPhotos(card, groupKey, date, session) {
    const slot = card.querySelector('.photo-carousel-slot');
    if (!slot) return;
    if (session && session._photos !== undefined) {
        if (session._photos.length) populatePhotoSlot(slot, session._photos);
        return;
    }
    try {
        const res = await fetch(`/api/photos?groupKey=${encodeURIComponent(groupKey)}&date=${encodeURIComponent(date)}`);
        const data = await res.json();
        const photos = data.success ? data.data : [];
        if (session) session._photos = photos;
        if (photos.length) populatePhotoSlot(slot, photos);
    } catch { if (session) session._photos = []; }
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
    return `<a class="btn-action btn-eventbrite" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="Eventbrite" style="background:#F05537;">
        <svg viewBox="0 0 1000 1214" fill="white"><path d="M917 814.9L515.3 501.7c-6.7-5.1.2-15.4 7.5-11.3l156.9 87.9c71.1 39.9 161 16.8 204.1-52.4 45.4-73 21.4-169.1-53.2-212.2L600.4 180.6c-7.3-4.3-1.9-15.3 6-12.2l105.8 42.3c.2.1 2.7 1 3.7 1.3 11.2 3.9 23.3 6.1 35.9 6.1 57.4 0 104.5-45.4 108.6-99.4C865.5 48.9 812 0 748.2 0h-489c-62.8 0-115.5 51.3-114.7 113.9.4 33.3 15.3 63 38.7 83.4 17.6 15.3 76.9 62.8 105.1 85.3 5 4 2.2 12.1-4.3 12.1h-97.9C83.2 295.3 0 378.9 0 482c0 52.1 21.3 99.2 55.6 133.1l566.6 538.5c40.1 37.4 93.9 60.3 153.1 60.3 124.1 0 224.7-100.6 224.7-224.7 0-70.3-32.4-133.1-83-174.3z"/></svg>
    </a>`;
}

/**
 * Attach hover handlers to all Eventbrite buttons in a container
 */
function initEventbriteButtons(container) {
    (container || document).querySelectorAll('.btn-eventbrite').forEach(btn => {
        btn.addEventListener('mouseover', () => btn.style.background = '#D94425');
        btn.addEventListener('mouseout', () => btn.style.background = '#F05537');
    });
}

/**
 * Fetch wrapper that redirects to login on 401
 */
async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        window.location.href = '/auth/login';
        throw new Error('Authentication required');
    }
    return response;
}
