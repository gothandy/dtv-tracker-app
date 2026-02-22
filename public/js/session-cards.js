/**
 * Session card rendering and photo utilities.
 * Depends on: common.js (escapeHtml, formatDate, clampDescriptions)
 */

/**
 * Build a countdown string for an upcoming session date.
 * Returns null if the date is in the past.
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
 * Build the URL for a session detail page from a session object.
 */
function buildSessionDetailUrl(session) {
    if (!session.groupKey || !session.date) return '#';
    const dateStr = session.date.substring(0, 10);
    return `/sessions/${encodeURIComponent(session.groupKey)}/${dateStr}/details.html`;
}

/**
 * Render a list of session cards into a container element.
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
