// Extract group and date from URL: /sessions/:group/:date/details.html
const pathParts = window.location.pathname.split('/');
const groupKey = pathParts[2];
const sessionDate = pathParts[3];

let sessionEntries = [];
let sessionDataLoaded = false;
let currentSession = null;
let allGroups = [];

async function registerForSession() {
    const user = window.currentUser;
    const ownIds = user?.profileIds?.length ? user.profileIds : (user?.profileId ? [user.profileId] : []);
    if (!ownIds.length) return;
    const btn = document.querySelector('#registerBtn button');
    if (btn) btn.disabled = true;
    try {
        const registeredIds = sessionEntries.filter(e => e.profileId !== undefined).map(e => e.profileId);
        const toRegister = ownIds.filter(id => !registeredIds.includes(id));
        for (const profileId of toRegister) {
            const res = await fetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(sessionDate)}/entries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volunteerId: profileId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');
        }
        await loadSessionDetail();
    } catch (error) {
        console.error('Registration error:', error);
        alert(error.message || 'Failed to register. Please try again.');
        if (btn) btn.disabled = false;
    }
}

function updateUserActionButtons() {
    if (!sessionDataLoaded) return;
    const container = document.getElementById('userActionButtons');
    if (!container) return;
    const user = window.currentUser;
    if (!user) { container.innerHTML = ''; return; }

    const ownIds = user.profileIds?.length ? user.profileIds : (user.profileId ? [user.profileId] : []);
    const myEntries = ownIds.length ? sessionEntries.filter(e => e.profileId !== undefined && ownIds.includes(e.profileId)) : [];
    const allRegistered = ownIds.length > 0 && myEntries.length === ownIds.length;

    const isPast = currentSession && new Date(currentSession.date) < new Date(new Date().toDateString());

    let html = '';

    const registerBtnEl = document.getElementById('registerBtn');
    if (registerBtnEl) {
        if (user.role === 'selfservice' && !isPast && !allRegistered) {
            registerBtnEl.innerHTML = `<button class="btn-action" onclick="registerForSession()" title="Register for this session">
                <img src="/svg/register.svg" style="width:1em;height:1em;filter:brightness(0) invert(1);vertical-align:middle;">
                Register
            </button>`;
        } else {
            registerBtnEl.innerHTML = '';
        }
    }

    const uploadBtn = document.getElementById('uploadPhotoBtn');
    if (uploadBtn) {
        if (myEntries.length > 0) {
            uploadBtn.innerHTML = `<a href="/upload.html?entryId=${myEntries[0].id}" class="btn-action" title="Upload photos" style="text-decoration:none;">
                <img src="/svg/uploadphoto.svg" style="width:1.4em;height:1.4em;filter:brightness(0) invert(1);vertical-align:middle;" alt="Upload photos">
            </a>`;
        } else {
            uploadBtn.innerHTML = '';
        }
    }

    container.innerHTML = html;
}

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
        // Single stats recompute after all writes complete — avoids N racing fire-and-forgets
        await apiFetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(sessionDate)}/stats`, { method: 'POST' });
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

function updateEntriesHeading() {
    const heading = document.querySelector('.entries-heading');
    if (!heading) return;
    const total = document.querySelectorAll('.entry-row').length;
    const checked = document.querySelectorAll('.checkin-toggle input:checked').length;
    heading.textContent = `Entries (${checked} from ${total})`;
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
        updateEntriesHeading();
    } catch {
        checkbox.checked = !checkbox.checked;
    }
}

async function deleteUncheckedEntries() {
    const unchecked = sessionEntries.filter(e => !e.checkedIn);
    if (!unchecked.length) {
        alert('No unchecked entries to remove.');
        return;
    }
    const msg = `Remove ${unchecked.length} unchecked entr${unchecked.length === 1 ? 'y' : 'ies'}?\n\n` +
        `This deletes the registrations of everyone who hasn't been checked in — useful at the end of a session to remove no-shows.\n\n` +
        `Checked-in entries are not affected.`;
    if (!confirm(msg)) return;

    try {
        const res = await apiFetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(sessionDate)}/unchecked-entries`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Delete failed');
        }
        loadSessionDetail();
    } catch (error) {
        console.error('Error deleting unchecked entries:', error);
        alert(error.message || 'Failed to remove unchecked entries.');
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

        // Render cover media above the carousel
        const coverEl = document.getElementById('sessionCover');
        if (coverEl) {
            const coverMediaId = currentSession && currentSession.coverMediaId;
            const cover = (coverMediaId && photoData.find(p => p.listItemId === coverMediaId))
                || photoData.find(p => p.isPublic !== false)
                || photoData[0];
            const coverIndex = photoData.indexOf(cover);
            const isVideo = cover.mimeType && cover.mimeType.startsWith('video/');
            coverEl.innerHTML = `<div class="session-cover"><a href="#" onclick="openLightbox(${coverIndex},photoData);return false;" ${isVideo ? 'class="session-cover-video"' : ''}>` +
                `<img src="${escapeHtml(cover.largeUrl || cover.thumbnailUrl)}" alt="${escapeHtml(cover.title || cover.name)}">` +
                (isVideo ? `<span class="play-icon">&#9654;</span>` : '') +
                `</a></div>`;
        }

        // Register lightbox edit controls for admin/check-in users
        const isAdmin = ['admin', 'checkin'].includes(document.body.dataset.role);
        if (isAdmin) {
            setLightboxMetaRenderer((p, i) => {
                const isCover = currentSession && currentSession.coverMediaId === p.listItemId;
                return `<div class="lightbox-edit">` +
                    `<label><input type="checkbox" ${p.isPublic !== false ? 'checked' : ''} onchange="setMediaPublic(${i},this.checked)"> Public gallery</label>` +
                    `<label><input type="checkbox" ${isCover ? 'checked' : ''} onchange="setMediaCover(${i},this.checked)"> Cover</label>` +
                    `<input type="text" class="lightbox-title-input" value="${escapeHtml(p.title || '')}" placeholder="Alt text / title" onblur="setMediaTitle(${i},this.value)" maxlength="255">` +
                    `</div>`;
            });
        } else {
            setLightboxMetaRenderer(null);
        }

        carousel.innerHTML = '<div class="photo-strip">' +
            data.data.map((p, i) => {
                const isVideo = p.mimeType && p.mimeType.startsWith('video/');
                return `<a href="#" onclick="openLightbox(${i},photoData);return false;" ${isVideo ? 'class="video-thumb"' : ''}>` +
                    `<img src="${escapeHtml(p.thumbnailUrl)}" alt="${escapeHtml(p.title || p.name)}" loading="lazy">` +
                    (isVideo ? `<span class="play-icon">&#9654;</span>` : '') +
                    `</a>`;
            }).join('') + '</div>';
    } catch { carousel.innerHTML = ''; photoData = []; }
}

async function setMediaCover(index, checked) {
    const photo = photoData[index];
    const newId = checked ? photo.listItemId : null;
    const res = await apiFetch(`/api/sessions/${groupKey}/${sessionDate}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverMediaId: newId })
    });
    if (!res.ok) { showError('Failed to update cover'); return; }
    currentSession.coverMediaId = newId;
    await loadPhotos();   // re-renders cover image above carousel
    refreshLightbox();    // re-renders lightbox checkboxes to reflect new cover state
}

async function setMediaPublic(index, value) {
    const photo = photoData[index];
    const res = await apiFetch(`/api/media/${photo.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: value })
    });
    if (!res.ok) { showError('Failed to update visibility'); return; }
    photoData[index].isPublic = value;
}

async function setMediaTitle(index, value) {
    const photo = photoData[index];
    if (value === (photo.title || '')) return; // no change
    const res = await apiFetch(`/api/media/${photo.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: value })
    });
    if (!res.ok) { showError('Failed to update alt text'); return; }
    photoData[index].title = value || null;
    // Caption stays as filename in admin mode; no update needed
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

        // Update breadcrumb: Home > [Group Display Name]
        const crumbsEl = document.querySelector('.nav-crumbs');
        if (crumbsEl && session.groupName) {
            crumbsEl.innerHTML =
                `<a href="/">Home</a><span class="breadcrumb-sep">/</span>` +
                `<a href="/groups/${encodeURIComponent(groupKey)}/detail.html">${escapeHtml(session.groupName)}</a>`;
        }

        document.title = `${session.displayName || formatDate(session.date)} - DTV Tracker`;
        const sessionTitle = session.displayName || formatDate(session.date);
        const sessionDesc = session.description || `${sessionTitle} — ${session.groupName}, ${formatDate(session.date)}`;
        setPageMeta({ description: sessionDesc, ogTitle: `${sessionTitle} - DTV Tracker` });

        const isPast = new Date(session.date) < new Date(new Date().toDateString());
        const countdown = getCountdown(session.date);
        const isPublicView = !document.body.dataset.role;
        const isSelfService = document.body.dataset.role === 'selfservice';

        const statItems = [
            session.registrations ? `<div class="stat-item"><div class="stat-number">${session.registrations}</div><div class="stat-label">${isPast ? 'Attendees' : 'Registrations'}</div></div>` : '',
            session.hours ? `<div class="stat-item"><div class="stat-number">${session.hours}</div><div class="stat-label">Hours</div></div>` : '',
            session.newCount ? `<div class="stat-item"><div class="stat-number">${session.newCount}</div><div class="stat-label">New</div></div>` : '',
            session.childCount ? `<div class="stat-item"><div class="stat-number">${session.childCount}</div><div class="stat-label">Child</div></div>` : '',
            session.regularCount ? `<div class="stat-item"><div class="stat-number">${session.regularCount}</div><div class="stat-label">Regular</div></div>` : '',
            session.eventbriteCount && !isSelfService ? `<div class="stat-item"><div class="stat-number">${session.eventbriteCount}</div><div class="stat-label">Eventbrite</div></div>` : ''
        ].filter(Boolean).join('');
        const statsSection = statItems
            ? `<div class="stats-section"><div class="stats-grid">${statItems}</div></div>`
            : '';

        const entries = session.entries || [];
        sessionEntries = entries;
        sessionDataLoaded = true;
        const entriesHtml = entries.length > 0
            ? entries.map(entry => {
                const icons = notesToIcons(entry.notes);
                const groupBadge = entry.isGroup ? '<img src="/svg/group.svg" class="group-badge" alt="Group" title="Group">' : '';
                const memberBadge = entry.isMember && !entry.isGroup ? '<img src="/svg/member.svg" class="member-badge" alt="Member" title="Member">' : '';
                const cardBadge = entry.cardStatus ? `<img src="/svg/card.svg" class="card-badge${entry.cardStatus === 'Invited' ? ' invited' : ''}" alt="Card" title="Card">` : '';
                const href = entry.id ? `/entries/${entry.id}/edit.html` : '#';
                const metaItems = [
                    entry.count > 1 ? `<span class="entry-count"><strong>Count:</strong> ${entry.count}</span>` : '',
                    entry.hours ? `<span class="entry-hours"><strong>Hours:</strong> ${entry.hours}</span>` : ''
                ].filter(Boolean).join('');
                return `
                    <div class="entry-row">
                        ${isSelfService
                            ? `<span class="checkin-box${entry.checkedIn ? ' checkin-box--checked' : ''}"></span>`
                            : `<label class="checkin-toggle">
                            <input type="checkbox" ${entry.checkedIn ? 'checked' : ''}
                                   onchange="toggleCheckin(${entry.id}, this)">
                            <span class="checkin-box"></span>
                        </label>`}
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
                ${countdown ? `<div class="countdown">${countdown === 'Today' ? "Today's Session" : `Next session &middot; ${countdown}`}</div>` : ''}
                <div class="date">${formatDate(session.date)}</div>
                <div class="session-title-row">
                    <h1>${escapeHtml(session.displayName || 'Session')}</h1>
                    <div class="session-title-buttons">
                        ${!isPublicView && !isSelfService && session.groupEventbriteSeriesId ? buildEventbriteLink(`https://www.eventbrite.co.uk/e/${encodeURIComponent(session.groupEventbriteSeriesId)}`) : ''}
                        <div id="registerBtn"></div>
                        <div id="uploadPhotoBtn"></div>
                        <button class="btn-action checkin-only" onclick="openEditModal()" title="Edit session">
                            <img src="/svg/edit.svg" width="18" height="18" alt="Edit">
                        </button>
                    </div>
                </div>
                ${session.groupName ? `<div class="group-name">${escapeHtml(session.groupName)}</div>` : ''}
                <div id="sessionCover"></div>
                <div id="photoCarousel"></div>
                ${session.description ? `<div class="description">${escapeHtml(session.description)}</div>` : ''}
                ${statsSection}
                ${window.location.hostname === 'localhost' && session.statsRaw ? `<div style="font-size:0.75rem;color:#888;font-family:monospace;margin-top:0.5rem;word-break:break-all;">Stats: ${escapeHtml(session.statsRaw)}</div>` : ''}
            </div>
            ${renderTagsSection(session)}
            ${session.groupEventbriteSeriesId && isPublicView ? `<div class="session-eventbrite-cta"><p>Volunteer at the ${escapeHtml(session.groupName || 'Dean Trail Volunteers')}</p><a class="btn-eventbrite-cta" href="https://www.eventbrite.co.uk/e/${encodeURIComponent(session.groupEventbriteSeriesId)}" target="_blank" rel="noopener">Register on Eventbrite</a></div>` : ''}
            <div class="auth-only">
                <div id="userActionButtons" style="margin-bottom:0.75rem;"></div>
                <div class="info-card checkin-only">
                    <div class="info-card-title">Free Parking</div>
                    <div class="info-card-body">Ask Forestry England for the Parking Tablet, if not available then email <a href="mailto:fodtrails@forestryengland.uk">fodtrails@forestryengland.uk</a> with a list of vehicle registrations.</div>
                </div>
                <div class="entries-header">
                    <h2 class="entries-heading">${isSelfService ? 'Your Entries' : `Entries (${entries.filter(e => e.checkedIn).length} from ${entries.length})`}</h2>
                    <div class="header-buttons">
                        <button class="btn-action checkin-only" id="refreshBtn" onclick="refreshSession()" title="Refresh session">
                            <img src="/svg/refresh.svg" style="width:1.2em;height:1.2em;filter:brightness(0) invert(1);vertical-align:middle;" alt="Refresh">
                        </button>
                        <button class="btn-action checkin-only btn-action-danger" onclick="deleteUncheckedEntries()" title="Remove no-shows (delete unchecked entries)"><img src="/svg/trash.svg" style="width:1.4em;height:1.4em;filter:brightness(0) invert(1);vertical-align:middle;"></button>
                        <button class="btn-action checkin-only" onclick="openHoursModal()" title="Set default hours"><img src="/svg/clock.svg" style="width:1.4em;height:1.4em;filter:brightness(0) invert(1);vertical-align:middle;" alt="Set Hours"></button>
                        <a class="btn-action checkin-only" href="/sessions/${encodeURIComponent(groupKey)}/${sessionDate}/add-entry.html">
                            <img src="/svg/add.svg" width="16" height="16" alt="">
                        </a>
                    </div>
                </div>
                <div class="entries-list">
                    ${entriesHtml}
                </div>
            </div>
        `;
        initEventbriteButtons(contentDiv);
        loadPhotos();
        updateUserActionButtons();

    } catch (error) {
        console.error('Error loading session detail:', error);
        showError(contentDiv, 'Error Loading Session', error.message);
    }
}

loadSessionDetail();
document.addEventListener('authReady', updateUserActionButtons);
