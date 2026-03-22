const pathParts = window.location.pathname.split('/');
const groupKey = pathParts[2];

let currentGroup = null;
let allSessions = [];
let currentFilter = 'all';
let wordCloudController = null;

function getFilteredSessions() {
    if (currentFilter === 'all') return allSessions;
    return allSessions.filter(s => s.financialYear === currentFilter);
}

function buildChart() {
    const container = document.getElementById('fyChart');
    if (!container) return;

    // Group hours by FY key
    const fyMap = {};
    allSessions.forEach(s => {
        if (!s.financialYear) return;
        fyMap[s.financialYear] = (fyMap[s.financialYear] || 0) + (s.hours || 0);
    });

    const fyKeys = Object.keys(fyMap).filter(k => k.startsWith('FY')).sort();
    const maxHours = Math.max(...Object.values(fyMap), 1);

    container.innerHTML = '';
    fyKeys.forEach(fyKey => {
        const hours = Math.round(fyMap[fyKey] * 10) / 10;
        const pct = Math.round((hours / maxHours) * 100);
        const startYear = parseInt(fyKey.replace('FY', ''));
        const barLabel = `${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`;

        const btn = document.createElement('button');
        btn.className = 'fy-bar-row' + (fyKey === currentFilter ? ' selected' : '');
        btn.innerHTML = `
            <span class="fy-bar-label">${barLabel}</span>
            <div class="fy-bar-track"><div class="fy-bar-actual" style="width:${pct}%"></div></div>
            <span class="fy-bar-hours">${hours}h</span>`;
        btn.addEventListener('click', () => selectFY(fyKey));
        container.appendChild(btn);
    });
}

function selectFY(fyKey) {
    currentFilter = fyKey;
    persistFY(fyKey);
    buildChart();
    displaySessions();
    refreshWordCloud();
}

async function refreshWordCloud() {
    const fy = currentFilter !== 'all' ? currentFilter : null;
    const params = new URLSearchParams({ group: groupKey });
    if (fy) params.set('fy', fy);
    const url = `/api/tags/hours-by-taxonomy?${params}`;
    try {
        const res = await fetch(url);
        if (!res.ok) { console.error('[WordCloud] fetch failed', res.status, url); return; }
        const result = await res.json();
        if (!result.success) { console.error('[WordCloud] API error', result.error); return; }
        if (!wordCloudController) {
            wordCloudController = createWordCloud(document.getElementById('wordCloudSection'), {
                embedded: true,
                getLinkUrl(item) {
                    if (!item.termGuid) return null;
                    const p = new URLSearchParams({ tag: item.termGuid });
                    if (currentFilter && currentFilter !== 'all') p.set('fy', currentFilter);
                    if (currentGroup?.id) p.set('group', String(currentGroup.id));
                    return `/sessions.html?${p}`;
                }
            });
        }
        wordCloudController.update(result.data);
        wordCloudController.setCsvVisible(true);
    } catch (err) {
        console.error('[WordCloud] error', err);
    }
}

function displaySessions() {
    const container = document.getElementById('sessionsContainer');
    const countEl = document.getElementById('sessionCount');
    if (!container) return;
    const filtered = getFilteredSessions();
    if (countEl) countEl.textContent = filtered.length;
    renderSessionList(container, filtered, { showGroup: false });
}

// Edit modal
function openEditModal() {
    if (!currentGroup) return;
    document.getElementById('editName').value = currentGroup.displayName || '';
    document.getElementById('editDescription').value = currentGroup.description || '';
    document.getElementById('editKey').value = currentGroup.key || '';
    document.getElementById('editEventbriteId').value = currentGroup.eventbriteSeriesId || '';
    document.getElementById('editModal').classList.add('visible');
    document.getElementById('editName').focus();
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('visible');
}

async function saveGroupEdit() {
    const displayName = document.getElementById('editName').value.trim();
    const description = document.getElementById('editDescription').value;
    const key = document.getElementById('editKey').value.trim();
    const eventbriteSeriesId = document.getElementById('editEventbriteId').value.trim();

    if (!key) {
        document.getElementById('editKey').focus();
        return;
    }

    if (key.toLowerCase() !== (currentGroup.key || '').toLowerCase()) {
        if (!confirm(`Changing the Key Name will update all session titles for this group and redirect you to the new URL. Continue?`)) return;
    }

    const btn = document.getElementById('confirmEditBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const res = await apiFetch(`/api/groups/${encodeURIComponent(groupKey)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, displayName, description, eventbriteSeriesId })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Save failed');
        }
        const result = await res.json();
        closeEditModal();
        const newKey = result.data?.key;
        if (newKey && newKey !== groupKey) {
            window.location.href = `/groups/${encodeURIComponent(newKey)}/details.html`;
        } else {
            loadGroupDetail();
        }
    } catch (error) {
        console.error('Error saving group:', error);
        alert(error.message || 'Failed to save group.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

async function deleteGroup() {
    if (!currentGroup) return;
    if (!confirm(`Delete "${currentGroup.displayName}"? This cannot be undone.`)) return;

    try {
        const res = await apiFetch(`/api/groups/${encodeURIComponent(groupKey)}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Delete failed');
        }
        window.location.href = '/groups.html';
    } catch (error) {
        console.error('Error deleting group:', error);
        alert(error.message || 'Failed to delete group.');
    }
}

// New session modal
function openNewSessionModal() {
    const select = document.getElementById('newSessionGroup');
    select.innerHTML = `<option value="${currentGroup.id}">${escapeHtml(currentGroup.displayName || groupKey)}</option>`;
    document.getElementById('newSessionDate').value = '';
    document.getElementById('newSessionName').value = '';
    document.getElementById('newSessionDescription').value = '';
    document.getElementById('newSessionModal').classList.add('visible');
    document.getElementById('newSessionDate').focus();
}

function closeNewSessionModal() {
    document.getElementById('newSessionModal').classList.remove('visible');
}

async function saveNewSession() {
    const date = document.getElementById('newSessionDate').value;
    const name = document.getElementById('newSessionName').value.trim();
    const description = document.getElementById('newSessionDescription').value.trim();

    if (!date) {
        document.getElementById('newSessionDate').focus();
        return;
    }

    const btn = document.getElementById('confirmNewSessionBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
        const res = await apiFetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: currentGroup.id, date, name: name || undefined, description: description || undefined })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to create session');
        }

        const result = await res.json();
        closeNewSessionModal();
        window.location.href = `/sessions/${encodeURIComponent(result.data.groupKey)}/${result.data.date}/details.html`;
    } catch (error) {
        console.error('Error creating session:', error);
        alert(error.message || 'Failed to create session.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create';
    }
}

async function loadGroupDetail() {
    const contentDiv = document.getElementById('content');

    if (!groupKey) {
        contentDiv.innerHTML = '<div class="empty-state"><p>No group specified</p></div>';
        return;
    }

    try {
        const response = await fetch(`/api/groups/${encodeURIComponent(groupKey)}`);
        if (!response.ok) throw new Error(`API returned ${response.status}: ${response.statusText}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch group');

        const group = result.data;
        currentGroup = group;
        allSessions = group.sessions || [];
        document.title = `${group.displayName} - DTV Tracker`;
        const groupDesc = group.description || `${group.displayName} volunteer crew`;
        setPageMeta({ description: groupDesc, ogTitle: `${group.displayName} - DTV Tracker` });

        const isPublicView = !document.body.dataset.role;
        const eventbriteBtn = group.eventbriteSeriesId && !isPublicView
            ? buildEventbriteLink(`https://www.eventbrite.co.uk/e/${encodeURIComponent(group.eventbriteSeriesId)}`)
            : '';

        const editBtn = `
            <button class="btn-action admin-only" onclick="openEditModal()" title="Edit group">
                <img src="/svg/edit.svg" width="18" height="18" alt="Edit">
            </button>`;

        const regulars = group.regulars || [];
        let regularsSection = '';
        if (regulars.length > 0) {
            regularsSection = `<div class="regulars-section">
                    <h2>Regulars (${regulars.length})</h2>
                    <ul class="regulars-list">
                        ${regulars.map(r => `<li><a href="/profiles/${encodeURIComponent(r.slug)}/details.html">${escapeHtml(r.name)}</a></li>`).join('')}
                    </ul>
               </div>`;
        } else if (group.isCurrentUserRegular === true) {
            regularsSection = `<div class="regulars-section"><p>You are a regular volunteer for this group.</p></div>`;
        }

        contentDiv.innerHTML = `
            <div class="group-detail">
                <div class="group-title-row">
                    <h2>${escapeHtml(group.displayName)}</h2>
                    <div style="display:flex; gap:0.5rem;">
                        ${eventbriteBtn}
                        ${editBtn}
                    </div>
                </div>
                ${group.description ? `<div class="description">${escapeHtml(group.description)}</div>` : ''}
            </div>

            ${group.eventbriteSeriesId && isPublicView ? `<div class="session-eventbrite-cta"><p>Volunteer at the ${escapeHtml(group.displayName)}</p><a class="btn-eventbrite-cta" href="https://www.eventbrite.co.uk/e/${encodeURIComponent(group.eventbriteSeriesId)}" target="_blank" rel="noopener">Register on Eventbrite</a></div>` : ''}

            ${regularsSection}

            <div class="filter-bar">
                <div class="title-row">
                    <div class="title-left">
                        <h2>Sessions</h2>
                        <div class="count" id="sessionCount">-</div>
                    </div>
                    <button class="btn-action admin-only" onclick="openNewSessionModal()">
                        <img src="/svg/add.svg" width="16" height="16" alt="">
                    </button>
                </div>
                <div id="fyChart"></div>
                <div id="wordCloudSection"></div>
            </div>
            <div id="sessionsContainer"></div>
        `;

        clampDescriptions(contentDiv);
        initEventbriteButtons(contentDiv);
        wordCloudController = null;
        currentFilter = getStoredFY();
        // If the selected FY has no sessions in this group (e.g. early in a new FY),
        // fall back to the most recent FY that does have data.
        const fyKeysWithData = [...new Set(allSessions.map(s => s.financialYear).filter(k => k?.startsWith('FY')))].sort();
        if (fyKeysWithData.length > 0 && !fyKeysWithData.includes(currentFilter)) {
            currentFilter = fyKeysWithData[fyKeysWithData.length - 1];
        }
        buildChart();
        displaySessions();
        refreshWordCloud();

    } catch (error) {
        console.error('Error loading group detail:', error);
        showError(contentDiv, 'Error Loading Group Details', error.message);
    }
}

loadGroupDetail();
