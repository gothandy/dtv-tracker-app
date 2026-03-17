// Extract slug from URL: /profiles/:slug/details.html
const pathParts = window.location.pathname.split('/');
const profileSlug = pathParts[2];

let allEntries = [];
let currentFilter = 'all';
let currentGroup = '';
let currentProfile = null;
let canEditHours = false;
let wordCloudController = null;

const authReady = apiFetch('/auth/me').then(r => r.json()).then(data => {
    if (data.authenticated) {
        canEditHours = data.user.role === 'admin' ||
            (data.user.role === 'checkin' && data.user.profileSlug === profileSlug);
    }
}).catch(() => {});

function buildDuplicatesCards(duplicates) {
    if (!duplicates || duplicates.length === 0) return '';
    const labels = {
        green: 'Similar profile — distinguished by display name',
        orange: 'Possible duplicate — same name, different email',
        red: 'Likely duplicate — same name and email'
    };
    // Group by severity so each gets its own coloured card
    const bySeverity = { red: [], orange: [], green: [] };
    duplicates.forEach(d => bySeverity[d.severity]?.push(d));
    return ['red', 'orange', 'green']
        .filter(s => bySeverity[s].length > 0)
        .map(s => `
            <div class="duplicate-card severity-${s}">
                <h3>${labels[s]}</h3>
                <ul>
                    ${bySeverity[s].map(d => `<li>
                        <a href="/profiles/${encodeURIComponent(d.slug)}/details.html">${escapeHtml(d.name)}</a>
                        ${d.email ? `<span class="auth-only"> · ${escapeHtml(d.email)}</span>` : ''}
                    </li>`).join('')}
                </ul>
            </div>`).join('');
}

function buildLinkedProfilesCard(linkedProfiles) {
    if (!linkedProfiles || linkedProfiles.length === 0) return '';
    const links = linkedProfiles
        .map(lp => `<a href="/profiles/${encodeURIComponent(lp.slug)}/details.html">${escapeHtml(lp.name)}</a>`)
        .join(', ');
    return `<div class="info-card">
        <div class="info-card-title">Linked profiles</div>
        <div class="info-card-body">This email is also used by: ${links}</div>
    </div>`;
}

function buildChart() {
    const container = document.getElementById('fyChart');
    if (!container) return;

    const fyMap = {};
    allEntries.forEach(e => {
        if (!e.financialYear) return;
        fyMap[e.financialYear] = (fyMap[e.financialYear] || 0) + (e.hours || 0);
    });

    const fyKeys = Object.keys(fyMap).filter(k => k.startsWith('FY')).sort();
    const maxHours = Math.max(...Object.values(fyMap), 1);
    const T1 = 15, T2 = 30;

    container.innerHTML = '';
    fyKeys.forEach(fyKey => {
        const hours = Math.round(fyMap[fyKey] * 10) / 10;
        const startYear = parseInt(fyKey.replace('FY', ''));
        const barLabel = `${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`;

        const seg1 = Math.min(hours, T1) / maxHours * 100;
        const seg2 = Math.max(0, Math.min(hours, T2) - T1) / maxHours * 100;
        const seg3 = Math.max(0, hours - T2) / maxHours * 100;

        const btn = document.createElement('button');
        btn.className = 'fy-bar-row' + (fyKey === currentFilter ? ' selected' : '');
        btn.innerHTML = `
            <span class="fy-bar-label">${barLabel}</span>
            <div class="fy-bar-track">
                ${seg1 > 0 ? `<div class="fy-bar-seg fy-bar-seg-lo" style="width:${seg1}%"></div>` : ''}
                ${seg2 > 0 ? `<div class="fy-bar-seg fy-bar-seg-mid" style="width:${seg2}%"></div>` : ''}
                ${seg3 > 0 ? `<div class="fy-bar-seg fy-bar-seg-lo" style="width:${seg3}%"></div>` : ''}
            </div>
            <span class="fy-bar-hours">${hours}h</span>`;
        btn.addEventListener('click', () => selectFY(fyKey));
        container.appendChild(btn);
    });
}

function selectFY(fyKey) {
    currentFilter = (fyKey === currentFilter) ? 'all' : fyKey;
    buildChart();
    displayGroups();
    displayEntries();
    refreshWordCloud();
}

function setGroup(value) {
    currentGroup = value;
    displayEntries();
    refreshWordCloud();
}

async function refreshWordCloud() {
    const params = new URLSearchParams({ profile: profileSlug });
    if (currentFilter && currentFilter !== 'all') params.set('fy', currentFilter);
    if (currentGroup) {
        // Find the group key for the selected group name by looking in profile data
        const gh = (currentProfile?.groupHours || []).find(g => g.groupName === currentGroup);
        if (gh?.groupKey) params.set('group', gh.groupKey);
    }
    const url = `/api/tags/hours-by-taxonomy?${params}`;
    try {
        const res = await fetch(url);
        if (!res.ok) { console.error('[WordCloud] fetch failed', res.status, url); return; }
        const result = await res.json();
        if (!result.success) { console.error('[WordCloud] API error', result.error); return; }
        if (!wordCloudController) {
            wordCloudController = createWordCloud(document.getElementById('wordCloudSection'), { title: 'Hours by Area' });
        }
        wordCloudController.update(result.data);
    } catch (err) {
        console.error('[WordCloud] error', err);
    }
}

function openEditModal() {
    if (!currentProfile) return;
    document.getElementById('editName').value = currentProfile.name || '';
    document.getElementById('editEmail').value = currentProfile.email || '';
    document.getElementById('editMatchName').value = currentProfile.matchName || '';
    document.getElementById('editUser').value = currentProfile.user || '';
    document.getElementById('editIsGroup').checked = !!currentProfile.isGroup;
    document.getElementById('editModal').classList.add('visible');
    document.getElementById('editName').focus();
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('visible');
}

async function deleteProfile() {
    if (!confirm('Delete this profile? This cannot be undone.')) return;
    try {
        const res = await apiFetch(`/api/profiles/${encodeURIComponent(profileSlug)}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Delete failed');
        }
        window.location.href = '/volunteers.html';
    } catch (error) {
        console.error('Error deleting profile:', error);
        alert(error.message || 'Failed to delete profile.');
    }
}

let transferProfiles = [];
let transferTargetId = null;

async function openTransferModal() {
    transferTargetId = null;
    document.getElementById('transferSearch').value = '';
    document.getElementById('transferResults').innerHTML = '';
    document.getElementById('transferHint').textContent = 'Type at least 2 characters';
    document.getElementById('transferSelected').style.display = 'none';
    document.getElementById('confirmTransferBtn').disabled = true;
    document.getElementById('transferDelete').checked = true;
    document.getElementById('transferModal').classList.add('visible');

    if (transferProfiles.length === 0) {
        document.getElementById('transferHint').textContent = 'Loading profiles...';
        try {
            const res = await apiFetch('/api/profiles');
            const result = await res.json();
            if (result.success) transferProfiles = result.data;
        } catch (e) { /* ignore */ }
        document.getElementById('transferHint').textContent = 'Type at least 2 characters';
    }
    document.getElementById('transferSearch').focus();
}

function closeTransferModal() {
    document.getElementById('transferModal').classList.remove('visible');
}

function filterTransferProfiles(query) {
    const hint = document.getElementById('transferHint');
    const results = document.getElementById('transferResults');
    if (!query || query.length < 2) {
        results.innerHTML = '';
        hint.textContent = 'Type at least 2 characters';
        return;
    }
    const q = query.toLowerCase();
    const matches = transferProfiles.filter(p =>
        p.id !== currentProfile.id &&
        ((p.name && p.name.toLowerCase().includes(q)) ||
         (p.email && p.email.toLowerCase().includes(q)))
    );
    hint.textContent = matches.length ? `${matches.length} match${matches.length !== 1 ? 'es' : ''}` : 'No matches';
    results.innerHTML = matches.slice(0, 30).map(p => `
        <div class="result-card" onclick="selectTransferTarget(${p.id}, '${escapeHtml(p.name || '')}')" style="padding:0.5rem 0.75rem; cursor:pointer; border-bottom:1px solid var(--border);">
            <div style="font-weight:600;">${escapeHtml(p.name || 'Unknown')}</div>
            ${p.email ? `<div style="font-size:0.85rem; color:var(--text-faint);">${escapeHtml(p.email)}</div>` : ''}
        </div>
    `).join('');
}

function selectTransferTarget(id, name) {
    transferTargetId = id;
    document.getElementById('transferTargetName').textContent = name;
    document.getElementById('transferSelected').style.display = 'block';
    document.getElementById('transferResults').innerHTML = '';
    document.getElementById('transferSearch').value = '';
    document.getElementById('transferHint').textContent = '';
    document.getElementById('confirmTransferBtn').disabled = false;
}

async function confirmTransfer() {
    if (!transferTargetId) return;
    const deleteAfter = document.getElementById('transferDelete').checked;
    const targetName = document.getElementById('transferTargetName').textContent;

    if (!confirm(`Transfer all entries, regulars and records to "${targetName}"?${deleteAfter ? ' This profile will be deleted.' : ''}`)) return;

    const btn = document.getElementById('confirmTransferBtn');
    btn.disabled = true;
    btn.textContent = 'Transferring...';

    try {
        const res = await apiFetch(`/api/profiles/${encodeURIComponent(profileSlug)}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetProfileId: transferTargetId, deleteAfter })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Transfer failed');
        }
        const result = await res.json();
        const d = result.data;
        const parts = [];
        if (d.entriesTransferred) parts.push(`${d.entriesTransferred} entries`);
        if (d.regularsTransferred) parts.push(`${d.regularsTransferred} regulars`);
        if (d.recordsTransferred) parts.push(`${d.recordsTransferred} records`);

        if (d.deleted) {
            alert(parts.length ? `Transferred: ${parts.join(', ')}` : 'Transfer complete');
            window.location.href = `/profiles/${encodeURIComponent(d.targetSlug)}/details.html`;
        } else {
            closeTransferModal();
            if (parts.length) alert(`Transferred: ${parts.join(', ')}`);
            loadProfile();
        }
    } catch (error) {
        console.error('Error transferring profile:', error);
        alert(error.message || 'Failed to transfer profile.');
        btn.disabled = false;
        btn.textContent = 'Transfer';
    }
}

async function saveProfileEdit() {
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const matchName = document.getElementById('editMatchName').value.trim();
    const user = document.getElementById('editUser').value.trim();
    const isGroup = document.getElementById('editIsGroup').checked;

    if (!name) { alert('Name is required.'); return; }

    const btn = document.getElementById('confirmEditBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await apiFetch(`/api/profiles/${encodeURIComponent(profileSlug)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, matchName, user, isGroup })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Save failed');
        }
        closeEditModal();
        loadProfile();
    } catch (error) {
        console.error('Error saving profile:', error);
        alert(error.message || 'Failed to save profile.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

async function toggleRegular(checkbox) {
    const groupId = parseInt(checkbox.dataset.groupId);
    const regularId = checkbox.dataset.regularId;
    const isAdding = checkbox.checked;

    checkbox.disabled = true;

    try {
        if (isAdding) {
            const res = await apiFetch(`/api/profiles/${encodeURIComponent(profileSlug)}/regulars`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add regular');
            }
            const result = await res.json();
            checkbox.dataset.regularId = result.data.id;
        } else {
            if (!regularId) throw new Error('No regular ID');
            const res = await apiFetch(`/api/regulars/${regularId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to remove regular');
            }
            checkbox.dataset.regularId = '';
        }
    } catch (error) {
        console.error('Error toggling regular:', error);
        checkbox.checked = !isAdding;
        alert(error.message || 'Failed to update regular status.');
    } finally {
        checkbox.disabled = false;
    }
}

function displayGroups() {
    const container = document.getElementById('groupsContainer');
    const card = document.getElementById('groupsCard');
    if (!container || !currentProfile) return;

    // Compute hours per group from entries for the selected FY
    const filteredEntries = currentFilter === 'all' ? allEntries : allEntries.filter(e => e.financialYear === currentFilter);
    const groupHoursMap = {};
    filteredEntries.forEach(e => {
        if (e.groupName) groupHoursMap[e.groupName] = (groupHoursMap[e.groupName] || 0) + (e.hours || 0);
    });

    const groupMeta = currentProfile.groupHours || [];

    if (card) card.style.display = groupMeta.length > 0 ? '' : 'none';
    if (groupMeta.length === 0) { container.innerHTML = ''; return; }

    const isSelfService = window.currentUser?.role === 'selfservice';

    container.innerHTML = groupMeta.map(gh => {
        const hours = Math.round((groupHoursMap[gh.groupName] ?? 0) * 10) / 10;
        if (isSelfService) {
            // Read-only view: highlight regular groups, no checkbox interaction
            return `<div class="group-hours-item${gh.isRegular ? ' group-hours-item--regular' : ''}">
                ${escapeHtml(gh.groupName)} <strong>${hours}h</strong>${gh.isRegular ? ' <span class="regular-badge">Regular</span>' : ''}
            </div>`;
        }
        return `<label class="group-hours-item">
            <input type="checkbox" class="regular-checkbox"
                data-group-id="${gh.groupId}"
                data-regular-id="${gh.regularId || ''}"
                ${gh.isRegular ? 'checked' : ''}
                onchange="toggleRegular(this)">
            ${escapeHtml(gh.groupName)} <strong>${hours}h</strong>
        </label>`;
    }).join('');
}

function displayEntries() {
    const container = document.getElementById('entriesContainer');
    const countEl = document.getElementById('entriesCount');
    if (!container) return;

    let filtered = allEntries;
    if (currentFilter !== 'all') {
        filtered = filtered.filter(e => e.financialYear === currentFilter);
    }

    // Populate group select from FY-filtered entries
    const groupSelect = document.getElementById('groupSelect');
    if (groupSelect) {
        const groups = [...new Set(filtered.map(e => e.groupName).filter(Boolean))].sort();
        const prev = groupSelect.value;
        groupSelect.innerHTML = '<option value="">All Groups</option>' +
            groups.map(g => `<option value="${escapeHtml(g)}"${g === prev ? ' selected' : ''}>${escapeHtml(g)}</option>`).join('');
    }

    if (currentGroup) {
        filtered = filtered.filter(e => e.groupName === currentGroup);
    }

    countEl.textContent = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-sessions">No entries</p>';
        return;
    }

    container.innerHTML = '<div class="entries-list">' + filtered.map(entry => {
        const icons = notesToIcons(entry.notes);
        const detailUrl = entry.groupKey && entry.date
            ? `/sessions/${encodeURIComponent(entry.groupKey)}/${entry.date.substring(0, 10)}/details.html`
            : '#';
        const hoursHtml = canEditHours
            ? `<input type="number" class="inline-hours" value="${entry.hours}" min="0" step="0.5"
                   data-entry-id="${entry.id}" data-original="${entry.hours}"
                   onchange="updateEntryHours(this)" onclick="event.stopPropagation()">`
            : `<span class="inline-hours-display">${entry.hours}h</span>`;
        return `
            <div class="entry-row">
                <a class="entry-card${entry.checkedIn ? ' checked-in' : ''}" href="${detailUrl}">
                    <div class="entry-info">
                        ${entry.sessionName ? `<span class="entry-session-name">${escapeHtml(entry.sessionName)}</span>` : ''}
                        ${entry.groupName ? `<span class="entry-group">${escapeHtml(entry.groupName)}</span>` : ''}
                        <span class="entry-date">${formatDate(entry.date)}</span>
                        ${icons ? `<span class="entry-tags">${icons}</span>` : ''}
                    </div>
                    ${entry.count > 1 ? `<div class="entry-meta"><span><strong>Count:</strong> ${entry.count}</span></div>` : ''}
                </a>
                ${hoursHtml}
            </div>
        `;
    }).join('') + '</div>';
}

async function loadProfile() {
    const contentDiv = document.getElementById('content');

    if (!profileSlug) {
        contentDiv.innerHTML = `
            <div class="empty-state">
                <p>No profile specified</p>
                <a href="/volunteers.html" class="btn-primary">Back to Volunteers</a>
            </div>
        `;
        return;
    }

    try {
        const profileFetch = apiFetch(`/api/profiles/${encodeURIComponent(profileSlug)}`);
        await authReady;
        const response = await profileFetch;

        if (!response.ok) {
            if (response.status === 403) {
                const selfUrl = window.currentUser?.profileSlug
                    ? `/profiles/${encodeURIComponent(window.currentUser.profileSlug)}/details.html`
                    : '/index.html';
                contentDiv.innerHTML = `<div class="empty-state"><p>You don't have permission to view this profile.</p><a href="${selfUrl}" class="btn-primary">Go back</a></div>`;
                return;
            }
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch profile');
        }

        const profile = result.data;
        currentProfile = profile;
        document.title = `${profile.name || 'Profile'} - DTV Tracker`;

        allEntries = profile.entries || [];

        const groupBadge = profile.isGroup ? '<img src="/svg/group.svg" class="group-badge" alt="Group" title="Group">' : '';
        const memberBadge = isMember(profile) ? '<img src="/svg/member.svg" class="member-badge" alt="Member" title="Member">' : '';

        contentDiv.innerHTML = `
            <div class="profile-detail">
                <div class="profile-title-row">
                    <h1>${escapeHtml(profile.name || 'Unknown')}${groupBadge}${memberBadge}</h1>
                    <div class="profile-actions">
                        <button class="btn-action checkin-only" onclick="openEditModal()" title="Edit profile">
                            <img src="/svg/edit.svg" width="18" height="18" alt="Edit">
                        </button>
                    </div>
                </div>
                ${profile.email ? `<div class="subtitle"><a href="mailto:${encodeURIComponent(profile.email)}">${escapeHtml(profile.email)}</a></div>` : ''}
            </div>

            ${buildDuplicatesCards(profile.duplicates)}
            ${buildLinkedProfilesCard(profile.linkedProfiles)}

            <div class="section-card" id="groupsCard" style="display:none;">
                <div class="section-header">
                    <h2>Groups</h2>
                    <span class="section-hint">Regular Attendee</span>
                </div>
                <div class="group-hours-list" id="groupsContainer"></div>
            </div>

            <div id="wordCloudSection"></div>

            <div class="section-card">
                <div class="consent-header">
                    <h2>Records</h2>
                    <button class="btn-add-record admin-only" onclick="openAddRecord()">+ Add</button>
                </div>
                <div class="consent-pills">
                    ${(profile.records || []).map(r => `<span class="consent-pill admin-clickable status-${(r.status || '').toLowerCase()}" onclick="openEditRecord(${r.id}, '${escapeHtml(r.type).replace(/'/g, "\\'")}', '${escapeHtml(r.status || '').replace(/'/g, "\\'")}', '${r.date || ''}')">${escapeHtml(r.type)} <span class="consent-date">${escapeHtml(r.status || '')}${r.date ? ' · ' + formatDate(r.date) : ''}</span></span>`).join('')}
                    ${(!profile.records || profile.records.length === 0) ? '<span style="color:var(--text-faint); font-size:0.85rem;">No records</span>' : ''}
                </div>
            </div>

            <div class="filter-bar">
                <div class="title-row">
                    <div class="title-left">
                        <h2>Entries</h2>
                        <div class="count" id="entriesCount"></div>
                    </div>
                    <select id="groupSelect" onchange="setGroup(this.value)">
                        <option value="">All Groups</option>
                    </select>
                </div>
                <div id="fyChart"></div>
            </div>
            <div id="entriesContainer"></div>
            <div class="delete-section admin-only">
                ${allEntries.length > 0 ? '<button class="btn-delete" onclick="openTransferModal()">Transfer</button>' : ''}
                ${allEntries.length === 0 ? '<button class="btn-delete" onclick="deleteProfile()">Delete Profile</button>' : ''}
            </div>
        `;

        wordCloudController = null;
        currentFilter = 'all';
        buildChart();
        displayGroups();
        displayEntries();
        refreshWordCloud();

    } catch (error) {
        console.error('Error loading profile:', error);
        showError(contentDiv, 'Error Loading Profile', error.message);
    }
}

loadProfile();

async function updateEntryHours(input) {
    const entryId = input.dataset.entryId;
    const original = parseFloat(input.dataset.original);
    const hours = parseFloat(input.value);

    if (isNaN(hours) || hours < 0) {
        input.value = original;
        return;
    }

    try {
        const res = await apiFetch(`/api/entries/${entryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hours })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Save failed');
        }
        input.dataset.original = hours;
    } catch (error) {
        input.value = original;
        alert(error.message || 'Failed to update hours.');
    }
}

// === Records management ===
let recordOptions = null;
let editingRecordId = null;

async function loadRecordOptions() {
    if (recordOptions) return recordOptions;
    try {
        const res = await apiFetch('/api/records/options');
        const data = await res.json();
        if (data.success) recordOptions = data.data;
    } catch (e) { console.error('Failed to load record options:', e); }
    return recordOptions || { types: [], statuses: [] };
}

function populateSelect(selectEl, options, selected) {
    selectEl.innerHTML = options.map(o =>
        `<option value="${escapeHtml(o)}"${o === selected ? ' selected' : ''}>${escapeHtml(o)}</option>`
    ).join('');
}

function toDateInputValue(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toISOString().substring(0, 10);
}

async function openEditRecord(id, type, status, date) {
    editingRecordId = id;
    const opts = await loadRecordOptions();
    document.getElementById('editRecordTitle').textContent = type;
    populateSelect(document.getElementById('editRecordStatus'), opts.statuses, status);
    document.getElementById('editRecordDate').value = toDateInputValue(date);
    document.getElementById('editRecordModal').classList.add('visible');
}

function closeRecordModal() {
    document.getElementById('editRecordModal').classList.remove('visible');
    editingRecordId = null;
}

async function saveRecord() {
    if (!editingRecordId) return;
    const btn = document.getElementById('saveRecordBtn');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
        const status = document.getElementById('editRecordStatus').value;
        const dateVal = document.getElementById('editRecordDate').value;
        const date = dateVal ? new Date(dateVal + 'T10:00:00.000Z').toISOString() : undefined;
        const res = await apiFetch(`/api/records/${editingRecordId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, date })
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
        closeRecordModal();
        loadProfile();
    } catch (error) {
        alert(error.message || 'Failed to save record.');
    } finally {
        btn.disabled = false; btn.textContent = 'Save';
    }
}

async function deleteRecord() {
    if (!editingRecordId) return;
    if (!confirm('Delete this record?')) return;
    const btn = document.getElementById('deleteRecordBtn');
    btn.disabled = true; btn.textContent = 'Deleting...';
    try {
        const res = await apiFetch(`/api/records/${editingRecordId}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
        closeRecordModal();
        loadProfile();
    } catch (error) {
        alert(error.message || 'Failed to delete record.');
    } finally {
        btn.disabled = false; btn.textContent = 'Delete';
    }
}

async function openAddRecord() {
    const opts = await loadRecordOptions();
    populateSelect(document.getElementById('addRecordType'), opts.types, '');
    populateSelect(document.getElementById('addRecordStatus'), opts.statuses, '');
    document.getElementById('addRecordDate').value = new Date().toISOString().substring(0, 10);
    document.getElementById('addRecordModal').classList.add('visible');
}

function closeAddRecordModal() {
    document.getElementById('addRecordModal').classList.remove('visible');
}

async function createRecord() {
    if (!currentProfile) return;
    const btn = document.getElementById('createRecordBtn');
    btn.disabled = true; btn.textContent = 'Adding...';
    try {
        const type = document.getElementById('addRecordType').value;
        const status = document.getElementById('addRecordStatus').value;
        const dateVal = document.getElementById('addRecordDate').value;
        const date = dateVal ? new Date(dateVal + 'T10:00:00.000Z').toISOString() : new Date().toISOString();
        const res = await apiFetch(`/api/profiles/${currentProfile.id}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, status, date })
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Create failed'); }
        closeAddRecordModal();
        loadProfile();
    } catch (error) {
        alert(error.message || 'Failed to create record.');
    } finally {
        btn.disabled = false; btn.textContent = 'Add';
    }
}
