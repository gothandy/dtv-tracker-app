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

    const list = document.createElement('div');
    list.className = 'sessions-list';

    sessions.forEach((session, i) => {
        let isNext = false;
        if (nextDate && session.date) {
            const d = new Date(session.date);
            d.setHours(0, 0, 0, 0);
            isNext = d.getTime() === nextDate.getTime();
        }
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
    clampDescriptions(list);
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
 * Tag icons used across entry-related pages
 */
const TAG_ICONS = [
    { icon: "\u{1F476}", tag: "#Child" },
    { icon: "\u{1F501}", tag: "#Regular" },
    { icon: "\u2728",     tag: "#New" },
    { icon: "\u{1F451}", tag: "#DigLead" },
    { icon: "\u{1F691}", tag: "#FirstAider" },
    { icon: "\u{1F40C}", tag: "#Late" },
    { icon: "\u{1F3E2}", tag: "#CSR" },
    { icon: "\u{1F4F5}", tag: "#NoPhoto" }
];

/**
 * Convert notes text to icon HTML (for display)
 */
function notesToIcons(notes) {
    if (!notes) return '';
    return TAG_ICONS
        .filter(t => new RegExp(t.tag.replace('#', '#'), 'i').test(notes))
        .map(t => `<span class="entry-tag" title="${escapeHtml(t.tag)}">${t.icon}</span>`)
        .join('');
}

/**
 * Render tag toggle buttons below a notes textarea.
 * Each button toggles its #tag in/out of the textarea text.
 * onToggle callback is called after each change with the new text value.
 */
function renderTagButtons(textareaId, containerId, onToggle) {
    const textarea = document.getElementById(textareaId);
    const container = document.getElementById(containerId);
    if (!textarea || !container) return;

    function hasTag(text, tag) {
        return new RegExp(tag.replace('#', '#'), 'i').test(text);
    }

    function refresh() {
        const text = textarea.value;
        container.querySelectorAll('.tag-btn').forEach(btn => {
            const tag = btn.dataset.tag;
            btn.classList.toggle('active', hasTag(text, tag));
        });
    }

    container.innerHTML = TAG_ICONS.map(t =>
        `<button type="button" class="tag-btn" data-tag="${escapeHtml(t.tag)}" title="${escapeHtml(t.tag)}">${t.icon}</button>`
    ).join('');

    container.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            let text = textarea.value;
            if (hasTag(text, tag)) {
                text = text.replace(new RegExp('\\s*' + tag.replace('#', '#'), 'gi'), '').trim();
            } else {
                text = text ? text.trimEnd() + ' ' + tag : tag;
            }
            textarea.value = text;
            refresh();
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            if (onToggle) onToggle(text);
        });
    });

    textarea.addEventListener('input', refresh);
    refresh();
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
