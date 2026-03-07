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
 *
 * options:
 *   showGroup     — show group name on each card (default true)
 *   allSessions   — full session list for next/last determination
 *   checkboxMode  — prepend a checkbox to each card (default false)
 *   checkedIds    — Set of session IDs that should start checked
 *   onCheckChange — callback(id, checked) called on checkbox change
 */
function buildCardTagsHTML(metadata) {
    if (!metadata || !metadata.length) return '';
    const items = metadata
        .filter(t => t.label)
        .map(t => {
            const label = t.label.split(' > ').map(s => s.trim()).join(': ');
            return `<span class="session-card-tag">${escapeHtml(label)}</span>`;
        })
        .join('');
    return items ? `<div class="session-card-tags">${items}</div>` : '';
}

/**
 * Build the meta stats bar for a session card.
 * isPast controls the label for the attendance count.
 * Each stat is hidden if zero/falsy.
 */
function buildSessionMetaHTML(session, isPast) {
    const items = [
        session.registrations ? `<div class="meta-item"><strong>${isPast ? 'Attendees' : 'Registrations'}:</strong> ${session.registrations}</div>` : '',
        session.hours ? `<div class="meta-item"><strong>Hours:</strong> ${session.hours}</div>` : '',
        session.newCount ? `<div class="meta-item"><strong>New:</strong> ${session.newCount}</div>` : '',
        session.childCount ? `<div class="meta-item"><strong>Child:</strong> ${session.childCount}</div>` : '',
        session.regularCount ? `<div class="meta-item"><strong>Regular:</strong> ${session.regularCount}</div>` : '',
        session.eventbriteCount ? `<div class="meta-item"><strong>Eventbrite:</strong> ${session.eventbriteCount}</div>` : ''
    ].filter(Boolean).join('');
    return items ? `<div class="meta">${items}</div>` : '';
}

function renderSessionList(container, sessions, options = {}) {
    const { showGroup = true, allSessions, checkboxMode = false, checkedIds, onCheckChange } = options;

    if (sessions.length === 0) {
        container.innerHTML = '<p class="no-sessions">No sessions</p>';
        return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // Use the full session list for next/last determination if provided,
    // so selected-day cards are labelled correctly relative to all sessions.
    const context = allSessions || sessions;
    const nextDate = findNextSessionDate(context);
    const lastDate = findLastSessionDate(context);

    const list = document.createElement('div');
    list.className = 'sessions-list';

    sessions.forEach((session, i) => {
        let isNext = false;
        let isLast = false;
        let isPast = false;
        if (session.date) {
            const d = new Date(session.date);
            d.setHours(0, 0, 0, 0);
            if (nextDate) isNext = d.getTime() === nextDate.getTime();
            if (lastDate) isLast = d.getTime() === lastDate.getTime();
            // Include today so same-day sessions show the photo carousel
            isPast = d <= now;
        }
        const countdown = isNext ? getCountdown(session.date) : null;
        const url = buildSessionDetailUrl(session);

        let card;
        if (isPast) {
            // Past (and today's) sessions use <div> so photo thumbnail links (nested <a>) are valid HTML
            card = document.createElement('div');
            card.className = 'session-card' + (isNext ? ' next-session' : isLast ? ' last-session' : '');
            card.dataset.sessionIdx = String(i);
            card.dataset.sessionPath = `${session.groupKey}/${(session.date || '').substring(0, 10)}`;
            card.addEventListener('click', () => { window.location.href = url; });
            card.innerHTML = `
                ${isNext && countdown ? `<div class="countdown">${countdown === 'Today' ? "Today's Session" : `Next session &middot; ${countdown}`}</div>` : ''}
                ${isLast && !isNext ? '<div class="last-session-label">Last session</div>' : ''}
                <div class="date">${formatDate(session.date)}</div>
                <div class="title">${escapeHtml(session.displayName)}</div>
                ${showGroup && session.groupName ? `<div class="group"><a href="/groups/${encodeURIComponent(session.groupKey)}/detail.html" onclick="event.stopPropagation()">${escapeHtml(session.groupName)}</a></div>` : ''}
                <div class="photo-carousel-slot"></div>
                ${session.description ? `<div class="description">${escapeHtml(session.description)}</div>` : ''}
                ${buildSessionMetaHTML(session, true)}
                ${buildCardTagsHTML(session.metadata)}
            `;
        } else {
            card = document.createElement('a');
            card.className = 'session-card' + (isNext ? ' next-session' : '');
            card.href = url;
            card.innerHTML = `
                ${countdown ? `<div class="countdown">${countdown === 'Today' ? "Today's Session" : `Next session &middot; ${countdown}`}</div>` : ''}
                <div class="date">${formatDate(session.date)}</div>
                <div class="title">${escapeHtml(session.displayName)}</div>
                ${showGroup && session.groupName ? `<div class="group"><a href="/groups/${encodeURIComponent(session.groupKey)}/detail.html" onclick="event.stopPropagation()">${escapeHtml(session.groupName)}</a></div>` : ''}
                ${session.description ? `<div class="description">${escapeHtml(session.description)}</div>` : ''}
                ${buildSessionMetaHTML(session, false)}
                ${buildCardTagsHTML(session.metadata)}
            `;
        }
        if (checkboxMode) {
            const wrapper = document.createElement('div');
            wrapper.className = 'card-selectable';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'card-checkbox';
            checkbox.dataset.id = String(session.id);
            checkbox.checked = checkedIds ? checkedIds.has(session.id) : false;
            // Stop click propagation so the checkbox doesn't trigger card navigation
            checkbox.addEventListener('click', e => e.stopPropagation());
            checkbox.addEventListener('change', function(e) {
                e.stopPropagation();
                if (onCheckChange) onCheckChange(session.id, this.checked);
            });

            wrapper.appendChild(checkbox);
            wrapper.appendChild(card);
            list.appendChild(wrapper);
        } else {
            list.appendChild(card);
        }
    });

    container.innerHTML = '';
    container.appendChild(list);
    clampDescriptions(list);

    // Lazy-load photos for all past session cards that have media
    list.querySelectorAll('.session-card[data-session-idx]').forEach(card => {
        const idx = parseInt(card.dataset.sessionIdx, 10);
        const session = sessions[idx];
        if (!session || !session.mediaCount) return;
        const parts = (card.dataset.sessionPath || '').split('/');
        const gk = parts[0];
        const date = parts[1];
        if (gk && date) loadCardPhotos(card, gk, date, session);
    });
}

/**
 * Render photos into a carousel slot element inside a session card.
 */
function populatePhotoSlot(slot, photos) {
    slot.innerHTML = '<div class="photo-strip">' +
        photos.map((p, i) => {
            const isVideo = p.mimeType && p.mimeType.startsWith('video/');
            if (isVideo) {
                return `<a href="${escapeHtml(p.webUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="video-thumb">` +
                    `<img src="${escapeHtml(p.thumbnailUrl)}" alt="${escapeHtml(p.name)}" loading="lazy">` +
                    `<span class="play-icon">&#9654;</span></a>`;
            }
            return `<a href="#" onclick="openLightbox(${i},this.closest('.photo-carousel-slot')._lbPhotos);event.stopPropagation();return false;">` +
                `<img src="${escapeHtml(p.thumbnailUrl)}" alt="${escapeHtml(p.name)}" loading="lazy"></a>`;
        }).join('') + '</div>';
    slot._lbPhotos = photos;
}

/**
 * Async photo loader for past session cards. Caches results on session._photos.
 */
async function loadCardPhotos(card, groupKey, date, session) {
    const slot = card.querySelector('.photo-carousel-slot');
    if (!slot) return;
    if (session && session._photos !== undefined) {
        if (session._photos.length) populatePhotoSlot(slot, session._photos);
        return;
    }
    try {
        const res = await fetch(`/api/media?groupKey=${encodeURIComponent(groupKey)}&date=${encodeURIComponent(date)}`);
        const data = await res.json();
        const photos = data.success ? data.data : [];
        if (session) session._photos = photos;
        if (photos.length) populatePhotoSlot(slot, photos);
    } catch { if (session) session._photos = []; }
}
