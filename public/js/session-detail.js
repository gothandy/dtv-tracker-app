// Extract group and date from URL: /sessions/:group/:date/details.html
const pathParts = window.location.pathname.split('/');
const groupKey = pathParts[2];
const sessionDate = pathParts[3];

let sessionEntries = [];
let currentSession = null;
let allGroups = [];

initSessionTags({
    groupKey,
    sessionDate,
    getSession: () => currentSession,
    onUpdate: () => loadSessionDetail()
});

async function loadEditGroups() {
    if (allGroups.length > 0) return;
    try {
        const res = await apiFetch('/api/groups');
        const result = await res.json();
        if (result.success) {
            allGroups = result.data.sort((a, b) => (a.displayName || a.key).localeCompare(b.displayName || b.key));
            const select = document.getElementById('editGroup');
            select.innerHTML = allGroups.map(g =>
                `<option value="${g.id}" data-key="${escapeHtml(g.key)}">${escapeHtml(g.displayName || g.key)}</option>`
            ).join('');
        }
    } catch (e) { console.error('Error loading groups:', e); }
}

async function openEditModal() {
    if (!currentSession) return;
    await loadEditGroups();
    const select = document.getElementById('editGroup');
    if (currentSession.groupId) select.value = String(currentSession.groupId);
    document.getElementById('editDate').value = currentSession.date ? currentSession.date.substring(0, 10) : '';
    document.getElementById('editName').value = currentSession.displayName || '';
    document.getElementById('editDescription').value = currentSession.description || '';
    document.getElementById('editEventbriteId').value = currentSession.eventbriteEventId || '';
    document.getElementById('editModal').classList.add('visible');
    document.getElementById('editName').focus();
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('visible');
}

async function saveSessionEdit() {
    const date = document.getElementById('editDate').value;
    const displayName = document.getElementById('editName').value.trim();
    const description = document.getElementById('editDescription').value;
    const eventbriteEventId = document.getElementById('editEventbriteId').value.trim();
    const groupSelect = document.getElementById('editGroup');
    const selectedGroupId = parseInt(groupSelect.value, 10);
    const selectedOption = groupSelect.options[groupSelect.selectedIndex];
    const selectedGroupKey = selectedOption ? selectedOption.dataset.key : groupKey;
    const groupChanged = currentSession.groupId && selectedGroupId !== currentSession.groupId;

    if (groupChanged) {
        const groupName = selectedOption ? selectedOption.textContent : selectedGroupKey;
        if (!confirm(`Move this session to "${groupName}"? All existing entries will remain attached.`)) return;
    }

    const btn = document.getElementById('confirmEditBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const body = { displayName, description, eventbriteEventId, date: date || undefined };
        if (groupChanged) body.groupId = selectedGroupId;

        const res = await apiFetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(sessionDate)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Save failed');
        }
        const result = await res.json();
        closeEditModal();
        const newGroupKey = result.data.groupKey || groupKey;
        const newDate = result.data.date || sessionDate;
        if (newGroupKey !== groupKey || newDate !== sessionDate) {
            window.location.href = `/sessions/${encodeURIComponent(newGroupKey)}/${newDate}/details.html`;
        } else {
            loadSessionDetail();
        }
    } catch (error) {
        console.error('Error saving session:', error);
        alert(error.message || 'Failed to save session.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

async function deleteSession() {
    if (!currentSession) return;
    if (!confirm('Delete this session? This cannot be undone.')) return;

    try {
        const res = await apiFetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(sessionDate)}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Delete failed');
        }
        window.location.href = `/groups/${encodeURIComponent(groupKey)}/detail.html`;
    } catch (error) {
        console.error('Error deleting session:', error);
        alert(error.message || 'Failed to delete session.');
    }
}

function openHoursModal() {
    document.getElementById('defaultHoursInput').value = '3';
    document.getElementById('hoursModal').classList.add('visible');
    document.getElementById('defaultHoursInput').focus();
}

function closeHoursModal() {
    document.getElementById('hoursModal').classList.remove('visible');
}

async function applyDefaultHours() {
    const input = document.getElementById('defaultHoursInput');
    const hours = parseFloat(input.value);
    if (isNaN(hours) || hours <= 0) return;

    const btn = document.getElementById('confirmHoursBtn');
    btn.disabled = true;
    btn.textContent = 'Applying...';

    const toUpdate = sessionEntries.filter(e => e.checkedIn && !e.hours);
    try {
        await Promise.all(toUpdate.map(entry =>
            apiFetch(`/api/entries/${entry.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hours })
            })
        ));
        closeHoursModal();
        loadSessionDetail();
    } catch (error) {
        console.error('Error setting hours:', error);
        alert('Failed to set hours for some entries.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Apply';
    }
}

async function toggleCheckin(entryId, checkbox) {
    const row = checkbox.closest('.entry-row');
    const card = row.querySelector('.entry-card');
    try {
        const res = await apiFetch(`/api/entries/${entryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkedIn: checkbox.checked })
        });
        if (!res.ok) throw new Error();
        card.classList.toggle('checked-in', checkbox.checked);
    } catch {
        checkbox.checked = !checkbox.checked;
    }
}

async function refreshSession() {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.classList.add('spinning');
    try {
        const res = await apiFetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(sessionDate)}/refresh`, {
            method: 'POST'
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Refresh failed');
        }
        const result = await res.json();
        const d = result.data;
        const parts = [];
        if (d.addedRegulars) parts.push(`${d.addedRegulars} regulars`);
        if (d.addedFromEventbrite) parts.push(`${d.addedFromEventbrite} from Eventbrite`);
        if (d.newProfiles) parts.push(`${d.newProfiles} new profiles`);
        if (d.noPhotoTagged) parts.push(`${d.noPhotoTagged} #NoPhoto`);
        loadSessionDetail();
        if (parts.length > 0) {
            alert('Added: ' + parts.join(', '));
        }
    } catch (error) {
        console.error('Error refreshing session:', error);
        alert(error.message || 'Failed to refresh session.');
    } finally {
        btn.disabled = false;
    }
}

let photoData = [];

async function loadPhotos() {
    const carousel = document.getElementById('photoCarousel');
    if (!carousel) return;
    try {
        const res = await apiFetch(`/api/media?groupKey=${encodeURIComponent(groupKey)}&date=${encodeURIComponent(sessionDate)}`);
        const data = await res.json();
        if (!data.success || !data.data.length) { carousel.innerHTML = ''; photoData = []; return; }
        photoData = data.data;
        carousel.innerHTML = '<div class="photo-strip">' +
            data.data.map((p, i) => {
                const isVideo = p.mimeType && p.mimeType.startsWith('video/');
                if (isVideo) {
                    return `<a href="${escapeHtml(p.webUrl)}" target="_blank" rel="noopener" class="video-thumb">` +
                        `<img src="${escapeHtml(p.thumbnailUrl)}" alt="${escapeHtml(p.name)}" loading="lazy">` +
                        `<span class="play-icon">&#9654;</span>` +
                        `</a>`;
                }
                return `<a href="#" onclick="openLightbox(${i},photoData);return false;">` +
                    `<img src="${escapeHtml(p.thumbnailUrl)}" alt="${escapeHtml(p.name)}" loading="lazy">` +
                    `</a>`;
            }).join('') + '</div>';
    } catch { carousel.innerHTML = ''; photoData = []; }
}

async function loadSessionDetail() {
    const contentDiv = document.getElementById('content');

    if (!groupKey || !sessionDate) {
        contentDiv.innerHTML = `
            <div class="empty-state">
                <p>No session specified</p>
                <a href="/sessions.html" class="btn-primary">Back to Sessions</a>
            </div>
        `;
        return;
    }

    try {
        const response = await apiFetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(sessionDate)}`);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch session');
        }

        const session = result.data;
        currentSession = session;
        document.title = `${session.displayName || formatDate(session.date)} - DTV Tracker`;

        const isPast = new Date(session.date) < new Date(new Date().toDateString());
        const countdown = getCountdown(session.date);

        const statsSection = `
            <div class="stats-section">
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${session.registrations}</div>
                        <div class="stat-label">${isPast ? 'Attendees' : 'Registrations'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${session.hours}</div>
                        <div class="stat-label">Hours</div>
                    </div>
                </div>
            </div>
        `;

        const entries = session.entries || [];
        sessionEntries = entries;
        const entriesHtml = entries.length > 0
            ? entries.map(entry => {
                const icons = notesToIcons(entry.notes);
                const groupBadge = entry.isGroup ? '<img src="/svg/group.svg" class="group-badge" alt="Group" title="Group">' : '';
                const memberBadge = entry.isMember && !entry.isGroup ? '<img src="/svg/member.svg" class="member-badge" alt="Member" title="Member">' : '';
                const cardBadge = entry.cardStatus ? `<img src="/svg/card.svg" class="card-badge${entry.cardStatus === 'Invited' ? ' invited' : ''}" alt="Card" title="Card">` : '';
                const href = entry.volunteerSlug
                    ? `/entries/${encodeURIComponent(groupKey)}/${sessionDate}/${encodeURIComponent(entry.volunteerSlug)}/edit.html`
                    : '#';
                const metaItems = [
                    entry.count > 1 ? `<span class="entry-count"><strong>Count:</strong> ${entry.count}</span>` : '',
                    entry.hours ? `<span class="entry-hours"><strong>Hours:</strong> ${entry.hours}</span>` : ''
                ].filter(Boolean).join('');
                return `
                    <div class="entry-row">
                        <label class="checkin-toggle">
                            <input type="checkbox" ${entry.checkedIn ? 'checked' : ''}
                                   onchange="toggleCheckin(${entry.id}, this)">
                            <span class="checkin-box"></span>
                        </label>
                        <a class="entry-card${entry.checkedIn ? ' checked-in' : ''}" href="${href}">
                            <div class="entry-name-row" style="flex:1">
                                <div class="entry-name">
                                    ${escapeHtml(entry.volunteerName || 'Unknown')}${groupBadge}${memberBadge}${cardBadge}
                                </div>
                                ${icons ? `<div class="entry-tags">${icons}</div>` : ''}
                            </div>
                            ${metaItems ? `<div class="entry-meta">${metaItems}</div>` : ''}
                        </a>
                    </div>
                `;
            }).join('')
            : '<p class="no-sessions">No registrations yet</p>';

        contentDiv.innerHTML = `
            <div class="session-detail${countdown ? ' next-session' : ''}">
                ${countdown ? `<div class="countdown">Next session &middot; ${countdown}</div>` : ''}
                <div class="date">${formatDate(session.date)}</div>
                <div class="session-title-row">
                    <h1>${escapeHtml(session.displayName || 'Session')}</h1>
                    <div class="session-title-buttons">
                        <button class="btn-action checkin-only" onclick="openEditModal()" title="Edit session">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                <path d="m15 5 4 4"/>
                            </svg>
                        </button>
                    </div>
                </div>
                ${session.groupName ? `<div class="group-name">${escapeHtml(session.groupName)}</div>` : ''}
                <div id="photoCarousel"></div>
                ${session.description ? `<div class="description">${escapeHtml(session.description)}</div>` : ''}
                ${statsSection}
            </div>
            ${renderTagsSection(session)}
            <div class="info-card">
                <div class="info-card-title">Free Parking</div>
                <div class="info-card-body">Ask Forestry England for the Parking Tablet, if not available then email <a href="mailto:fodtrails@forestryengland.uk">fodtrails@forestryengland.uk</a> with a list of vehicle registrations.</div>
            </div>
            <div class="entries-header">
                <h2 class="entries-heading">Entries (${entries.length})</h2>
                <div class="header-buttons">
                    <button class="btn-action checkin-only" id="refreshBtn" onclick="refreshSession()" title="Refresh session">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0 1 10.3-4.2L11 5h4V1l-1.7 1.7A8 8 0 0 0 0 8h2zm12 0a6 6 0 0 1-10.3 4.2L5 11H1v4l1.7-1.7A8 8 0 0 0 16 8h-2z" fill="currentColor"/></svg>
                    </button>
                    <button class="btn-action checkin-only" onclick="openHoursModal()">Set Hours</button>
                    <a class="btn-action checkin-only" href="/sessions/${encodeURIComponent(groupKey)}/${sessionDate}/add-entry.html">
                        <svg viewBox="0 0 16 16"><path d="M8 2v12M2 8h12" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
                    </a>
                </div>
            </div>
            <div class="entries-list">
                ${entriesHtml}
            </div>
        `;
        initEventbriteButtons(contentDiv);
        clampDescriptions(contentDiv);
        loadPhotos();

    } catch (error) {
        console.error('Error loading session detail:', error);
        showError(contentDiv, 'Error Loading Session', error.message);
    }
}

loadSessionDetail();
