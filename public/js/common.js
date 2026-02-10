/**
 * Common UI components and utilities
 */

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

    // Profile detail: Home > Volunteers
    if (path.startsWith('/profiles/') && path.endsWith('/details.html')) {
        crumbs.push({ href: '/volunteers.html', label: 'Volunteers' });
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
                <h1>DTV Tracker</h1>
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
            const el = document.getElementById('userInfo');
            if (data.authenticated && el) {
                el.innerHTML = `
                    <span class="user-name">${escapeHtml(data.user.displayName)}</span>
                    <a href="/auth/logout" class="logout-link">Logout</a>
                `;
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
 * Find the nearest upcoming session from a list (sorted date desc)
 * Returns the index, or -1 if none are upcoming
 */
function findNextSessionIndex(sessions) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let nextIdx = -1;
    for (let i = 0; i < sessions.length; i++) {
        if (!sessions[i].date) continue;
        const d = new Date(sessions[i].date);
        d.setHours(0, 0, 0, 0);
        if (d >= now) nextIdx = i;
    }
    return nextIdx;
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

    const nextIdx = findNextSessionIndex(sessions);

    const list = document.createElement('div');
    list.className = 'sessions-list';

    sessions.forEach((session, i) => {
        const isNext = i === nextIdx;
        const countdown = isNext ? getCountdown(session.date) : null;

        const card = document.createElement('a');
        card.className = 'session-card' + (isNext ? ' next-session' : '');
        card.href = buildSessionDetailUrl(session);
        card.innerHTML = `
            ${countdown ? `<div class="countdown">Next session &middot; ${countdown}</div>` : ''}
            <div class="date">${formatDate(session.date)}</div>
            <div class="title">${escapeHtml(session.displayName)}</div>
            ${showGroup && session.groupName ? `<div class="group">${escapeHtml(session.groupName)}</div>` : ''}
            ${session.description ? `<div class="description">${escapeHtml(session.description)}</div>` : ''}
            ${session.registrations || session.hours ? `<div class="meta">
                ${session.registrations ? `<div class="meta-item"><strong>${new Date(session.date) >= new Date(new Date().toDateString()) ? 'Registrations' : 'Attendees'}:</strong> ${session.registrations}</div>` : ''}
                ${session.hours ? `<div class="meta-item"><strong>Hours:</strong> ${session.hours}</div>` : ''}
            </div>` : ''}
        `;
        list.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(list);
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
