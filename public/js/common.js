/**
 * Common UI components and utilities
 */

/**
 * Create and insert the site header
 * @param {string} subtitle - The subtitle to display (e.g., "Volunteer Groups", "Volunteer Sessions")
 * @param {boolean} showBackLink - Whether to show the back to home link
 */
function createHeader(subtitle = 'Volunteer hours tracking and registration system', showBackLink = false) {
    const headerHTML = `
        <header style="background-color: #2c5f2d; color: white; padding: ${showBackLink ? '1.5rem 2rem' : '2rem'}; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${showBackLink ? '' : 'text-align: center;'}">
            <h1 style="font-size: ${showBackLink ? '1.8rem' : '2.5rem'}; margin-bottom: ${showBackLink ? '0.3rem' : '0.5rem'};">DTV Tracker</h1>
            <p style="font-size: ${showBackLink ? '0.95rem' : '1.1rem'}; opacity: 0.9;">${subtitle}</p>
        </header>
        ${showBackLink ? `
        <nav style="background-color: #f8f8f8; border-bottom: 1px solid #ddd; padding: 0.8rem 2rem;">
            <a href="/" style="color: #2c5f2d; text-decoration: none; font-weight: 500;">&larr; Back to Home</a>
        </nav>
        ` : ''}
    `;

    document.body.insertAdjacentHTML('afterbegin', headerHTML);
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
 * Inject session list CSS once
 */
let _sessionCssInjected = false;
function injectSessionListCSS() {
    if (_sessionCssInjected) return;
    _sessionCssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
        .sessions-list { display: flex; flex-direction: column; gap: 1rem; }
        .session-card { background: white; border-radius: 8px; padding: 1.25rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; }
        .session-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        .session-card .date { font-size: 0.9rem; color: #2c5f2d; font-weight: 600; margin-bottom: 0.3rem; }
        .session-card .title { font-size: 1.2rem; font-weight: 600; color: #333; margin-bottom: 0.5rem; line-height: 1.3; }
        .session-card .group { font-size: 0.95rem; color: #666; margin-bottom: 0.75rem; }
        .session-card .description { font-size: 0.95rem; color: #888; font-style: italic; margin-bottom: 0.75rem; }
        .session-card .meta { display: flex; gap: 1.5rem; font-size: 0.9rem; color: #777; padding-top: 0.75rem; border-top: 1px solid #eee; }
        .session-card .meta-item { display: flex; align-items: center; gap: 0.3rem; }
        .session-card .meta-item strong { color: #555; }
        @media (max-width: 600px) { .session-card .meta { flex-direction: column; gap: 0.5rem; } }
    `;
    document.head.appendChild(style);
}

/**
 * Render a list of session cards into a container element
 * @param {HTMLElement} container - The element to render into
 * @param {Array} sessions - Array of session objects from the API
 * @param {object} options - { showGroup: boolean }
 */
function renderSessionList(container, sessions, options = {}) {
    injectSessionListCSS();
    const { showGroup = true } = options;

    if (sessions.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 1rem;">No sessions</p>';
        return;
    }

    const list = document.createElement('div');
    list.className = 'sessions-list';

    sessions.forEach(session => {
        const card = document.createElement('div');
        card.className = 'session-card';
        card.innerHTML = `
            <div class="date">${formatDate(session.date)}</div>
            <div class="title">${escapeHtml(session.displayName)}</div>
            ${showGroup && session.groupName ? `<div class="group">${escapeHtml(session.groupName)}</div>` : ''}
            ${session.description ? `<div class="description">${escapeHtml(session.description)}</div>` : ''}
            <div class="meta">
                <div class="meta-item"><strong>Hours:</strong> ${session.hours || 0}</div>
                <div class="meta-item"><strong>Registrations:</strong> ${session.registrations || 0}</div>
            </div>
        `;
        list.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(list);
}

/**
 * Create the site footer
 */
function createFooter() {
    const footerHTML = `
        <footer style="text-align: center; padding: 2rem; color: #666; font-size: 0.9rem;">
            <p>Dean Trail Volunteers &copy; ${new Date().getFullYear()}</p>
        </footer>
    `;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
}
