/**
 * Common UI components and utilities
 */

/**
 * Create and insert the site header
 */
function createHeader(subtitle = 'Volunteer hours tracking and registration system', showBackLink = false) {
    const headerHTML = `
        <header class="site-header${showBackLink ? ' compact' : ''}">
            <h1>DTV Tracker</h1>
            <p>${subtitle}</p>
        </header>
        ${showBackLink ? `
        <nav class="site-nav">
            <a href="/">&larr; Back to Home</a>
        </nav>
        ` : ''}
    `;
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
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

        const card = document.createElement('div');
        card.className = 'session-card' + (isNext ? ' next-session' : '');
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
