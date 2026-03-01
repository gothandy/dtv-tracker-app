let allVolunteers = [];
let currentFilter = getFYKey(0); // FY key e.g. "FY2025", or "all"
let currentSort = 'az';
let currentGroup = '';
let currentTypeFilter = '';
let currentHoursFilter = '';
let currentRecordType = '';
let currentRecordStatus = '';
const MEMBER_HOURS = 15;
let advancedOpen = false;
let selectedVolunteers = new Set();

function toggleAdvanced() {
    const section = document.getElementById('advancedSection');
    const btn = document.getElementById('advancedToggle');
    advancedOpen = section.classList.toggle('open');
    btn.classList.toggle('active', advancedOpen);
    btn.innerHTML = advancedOpen ? 'Advanced &#9652;' : 'Advanced &#9662;';
    if (!advancedOpen) {
        currentTypeFilter = '';
        currentHoursFilter = '';
        currentRecordType = '';
        currentRecordStatus = '';
        document.getElementById('typeSelect').value = '';
        document.getElementById('hoursSelect').value = '';
        document.getElementById('recordTypeSelect').value = '';
        document.getElementById('recordStatusSelect').value = '';
        selectedVolunteers.clear();
        updateSelectAllLink();
        updateAddRecordsButton();
        if (currentGroup) {
            currentGroup = '';
            document.getElementById('groupSelect').value = '';
            persistFilters();
            loadVolunteers();
        } else {
            persistFilters();
            displayVolunteers();
        }
    } else {
        updateSelectAllLink();
        updateSelectionButtons();
        displayVolunteers();
    }
}

function getVisibleVolunteerIds() {
    const searchTerm = document.getElementById('searchBox').value;
    let filtered = allVolunteers;
    if (currentTypeFilter === 'individuals') filtered = filtered.filter(v => !v.isGroup);
    else if (currentTypeFilter === 'groups') filtered = filtered.filter(v => v.isGroup);
    else if (currentTypeFilter === 'users') filtered = filtered.filter(v => !v.isGroup && v.user);
    if (currentFilter !== 'all') filtered = filtered.filter(v => v.hoursThisFY > 0 || v.sessionsThisFY > 0);
    if (searchTerm && searchTerm.length >= 3) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(v => (v.name || '').toLowerCase().includes(term));
    }
    if (currentHoursFilter) {
        const hFilters = {
            '0': v => getHours(v) === 0,
            'lt15': v => { const h = getHours(v); return h > 0 && h < 15; },
            '15plus': v => getHours(v) >= 15,
            '15to30': v => { const h = getHours(v); return h >= 15 && h <= 30; },
            '30plus': v => getHours(v) > 30
        };
        if (hFilters[currentHoursFilter]) filtered = filtered.filter(hFilters[currentHoursFilter]);
    }
    if (currentRecordType) {
        filtered = filtered.filter(v => {
            const recs = (v.records || []).filter(r => r.type === currentRecordType);
            if (currentRecordStatus === 'none') return recs.length === 0;
            if (currentRecordStatus) return recs.some(r => r.status === currentRecordStatus);
            return recs.length > 0;
        });
    } else if (currentRecordStatus === 'none') {
        filtered = filtered.filter(v => !v.records || v.records.length === 0);
    }
    return filtered.map(v => v.id);
}

function updateSelectAllLink() {
    const link = document.getElementById('selectAllLink');
    if (!link) return;
    link.style.display = advancedOpen ? '' : 'none';
    const visibleIds = getVisibleVolunteerIds();
    const allChecked = visibleIds.length > 0 && visibleIds.every(id => selectedVolunteers.has(id));
    link.textContent = allChecked ? 'Deselect all' : 'Select all';
}

function updateSelectionButtons() {
    const addBtn = document.getElementById('addRecordsBtn');
    const csvBtn = document.getElementById('downloadCsvBtn');
    const count = selectedVolunteers.size;
    if (addBtn) {
        addBtn.textContent = count > 0 ? `Add Records (${count})` : 'Add Records';
        addBtn.disabled = count === 0;
    }
    if (csvBtn) {
        csvBtn.disabled = count === 0;
    }
}

function updateAddRecordsButton() {
    updateSelectionButtons();
}

function toggleSelectAll() {
    const visibleIds = getVisibleVolunteerIds();
    const allChecked = visibleIds.length > 0 && visibleIds.every(id => selectedVolunteers.has(id));
    if (allChecked) {
        visibleIds.forEach(id => selectedVolunteers.delete(id));
    } else {
        visibleIds.forEach(id => selectedVolunteers.add(id));
    }
    updateSelectAllLink();
    updateAddRecordsButton();
    displayVolunteers();
}

function onVolunteerCheck(id, checked) {
    if (checked) selectedVolunteers.add(id);
    else selectedVolunteers.delete(id);
    updateSelectAllLink();
    updateAddRecordsButton();
}

function fyKeyToLabel(fyKey) {
    const startYear = parseInt(fyKey.replace('FY', ''));
    const endYear = startYear + 1;
    return `FY ${String(startYear).slice(2)}/${String(endYear).slice(2)}`;
}

async function loadFYOptions() {
    try {
        const res = await fetch('/api/stats/history');
        if (!res.ok) return;
        const result = await res.json();
        if (!result.success) return;

        const menu = document.getElementById('filterMenu');
        menu.innerHTML = '';

        const btnAll = document.createElement('button');
        btnAll.id = 'fyBtn_all';
        btnAll.textContent = 'All';
        btnAll.onclick = () => setFilter('all');
        menu.appendChild(btnAll);

        result.data.forEach(d => {
            const fyKey = `FY${d.financialYear.split('-')[0]}`;
            const btn = document.createElement('button');
            btn.id = `fyBtn_${fyKey}`;
            btn.textContent = fyKeyToLabel(fyKey);
            btn.onclick = () => setFilter(fyKey);
            menu.appendChild(btn);
        });
    } catch (e) {
        console.error('Error loading FY options:', e);
    }
}

function applyURLParams() {
    const params = new URLSearchParams(window.location.search);

    const group = params.get('group');
    if (group) currentGroup = group;

    const sort = params.get('sort');
    if (sort === 'hours') {
        currentSort = 'hours';
        document.getElementById('sortLabel').textContent = 'Hours';
        document.getElementById('btnSortAZ').classList.remove('active');
        document.getElementById('btnSortHours').classList.add('active');
    }

    const search = params.get('search');
    if (search) document.getElementById('searchBox').value = search;

    const type = params.get('type');
    if (type) { currentTypeFilter = type; document.getElementById('typeSelect').value = type; }

    const hours = params.get('hours');
    if (hours) { currentHoursFilter = hours; document.getElementById('hoursSelect').value = hours; }

    const recordType = params.get('recordType');
    if (recordType) currentRecordType = recordType;

    const recordStatus = params.get('recordStatus');
    if (recordStatus) currentRecordStatus = recordStatus;

    if (type || hours || recordType || recordStatus || group) {
        advancedOpen = true;
        document.getElementById('advancedSection').classList.add('open');
        const btn = document.getElementById('advancedToggle');
        btn.classList.add('active');
        btn.innerHTML = 'Advanced &#9652;';
        updateSelectAllLink();
    }
}

function persistFilters() {
    const url = new URL(window.location.href);

    if (currentFilter === getFYKey(0)) {
        url.searchParams.delete('fy');
    } else if (currentFilter === 'all') {
        url.searchParams.set('fy', 'all');
    } else {
        const startYear = parseInt(currentFilter.replace('FY', ''));
        if (!isNaN(startYear)) url.searchParams.set('fy', `${startYear}-${startYear + 1}`);
    }

    if (currentGroup) url.searchParams.set('group', currentGroup);
    else url.searchParams.delete('group');

    if (currentSort !== 'az') url.searchParams.set('sort', currentSort);
    else url.searchParams.delete('sort');

    const searchTerm = document.getElementById('searchBox').value.trim();
    if (searchTerm) url.searchParams.set('search', searchTerm);
    else url.searchParams.delete('search');

    if (currentTypeFilter) url.searchParams.set('type', currentTypeFilter);
    else url.searchParams.delete('type');

    if (currentHoursFilter) url.searchParams.set('hours', currentHoursFilter);
    else url.searchParams.delete('hours');

    if (currentRecordType) url.searchParams.set('recordType', currentRecordType);
    else url.searchParams.delete('recordType');

    if (currentRecordStatus) url.searchParams.set('recordStatus', currentRecordStatus);
    else url.searchParams.delete('recordStatus');

    history.replaceState(null, '', url);
}

function setFilter(filter) {
    currentFilter = filter;
    setCookie('fyFilter', filter);
    const label = filter === 'all' ? 'All' : fyKeyToLabel(filter);
    document.getElementById('filterLabel').textContent = label;
    document.querySelectorAll('#filterMenu button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`fyBtn_${filter}`);
    if (activeBtn) activeBtn.classList.add('active');
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    persistFilters();
    loadVolunteers();
}

function setSort(sort) {
    currentSort = sort;
    const labels = { az: 'A-Z', hours: 'Hours' };
    document.getElementById('sortLabel').textContent = labels[sort];
    ['btnSortAZ', 'btnSortHours'].forEach(id => document.getElementById(id).classList.remove('active'));
    const btnMap = { az: 'btnSortAZ', hours: 'btnSortHours' };
    document.getElementById(btnMap[sort]).classList.add('active');
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    persistFilters();
    displayVolunteers();
}

function setGroup(groupKey) {
    currentGroup = groupKey;
    persistFilters();
    loadVolunteers();
}

function isMember(v) {
    return !!v.isMember;
}

function isMemberForFY(v) {
    if (currentFilter === 'all') return isMember(v);
    return v.hoursThisFY >= MEMBER_HOURS;
}

function getHours(v) {
    return currentFilter === 'all' ? v.hoursAll : v.hoursThisFY;
}

function getSessions(v) {
    return currentFilter === 'all' ? v.sessionsAll : v.sessionsThisFY;
}

function displayVolunteers() {
    const contentDiv = document.getElementById('content');
    const countDiv = document.getElementById('volunteerCount');
    const searchTerm = document.getElementById('searchBox').value;

    let filtered = allVolunteers;
    if (currentTypeFilter === 'individuals') {
        filtered = filtered.filter(v => !v.isGroup);
    } else if (currentTypeFilter === 'groups') {
        filtered = filtered.filter(v => v.isGroup);
    } else if (currentTypeFilter === 'users') {
        filtered = filtered.filter(v => !v.isGroup && v.user);
    }
    if (currentFilter !== 'all') {
        filtered = filtered.filter(v => v.hoursThisFY > 0 || v.sessionsThisFY > 0);
    }
    if (searchTerm && searchTerm.length >= 3) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(v => (v.name || '').toLowerCase().includes(term));
    }
    if (currentHoursFilter) {
        const hFilters = {
            '0': v => getHours(v) === 0,
            'lt15': v => { const h = getHours(v); return h > 0 && h < 15; },
            '15plus': v => getHours(v) >= 15,
            '15to30': v => { const h = getHours(v); return h >= 15 && h <= 30; },
            '30plus': v => getHours(v) > 30
        };
        if (hFilters[currentHoursFilter]) filtered = filtered.filter(hFilters[currentHoursFilter]);
    }
    if (currentRecordType) {
        filtered = filtered.filter(v => {
            const recs = (v.records || []).filter(r => r.type === currentRecordType);
            if (currentRecordStatus === 'none') return recs.length === 0;
            if (currentRecordStatus) return recs.some(r => r.status === currentRecordStatus);
            return recs.length > 0;
        });
    } else if (currentRecordStatus === 'none') {
        filtered = filtered.filter(v => !v.records || v.records.length === 0);
    }

    // Sort
    if (currentSort === 'hours') {
        filtered = [...filtered].sort((a, b) => getHours(b) - getHours(a) || (a.name || '').localeCompare(b.name || ''));
    } else {
        filtered = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    countDiv.textContent = filtered.length;

    if (filtered.length === 0) {
        contentDiv.innerHTML = '<p class="no-sessions">No volunteers found</p>';
        return;
    }

    const html = filtered.map(v => {
        const member = isMember(v);
        const memberForFY = isMemberForFY(v);
        const groupBadge = v.isGroup ? '<img src="/svg/group.svg" class="group-badge" alt="Group" title="Group">' : '';
        const memberBadge = member && !v.isGroup ? '<img src="/svg/member.svg" class="member-badge" alt="Member" title="Member">' : '';
        const cardBadge = v.cardStatus ? `<img src="/svg/card.svg" class="card-badge${v.cardStatus === 'Invited' ? ' invited' : ''}" alt="Card" title="Card">` : '';
        const cardClass = memberForFY && !v.isGroup ? ' is-member' : '';
        const href = v.slug ? `/profiles/${encodeURIComponent(v.slug)}/details.html` : '#';
        const sessions = getSessions(v);
        const hours = getHours(v);
        const card = `
            <a class="volunteer-card${cardClass}" href="${href}">
                <div class="volunteer-name">${escapeHtml(v.name || 'Unknown')}${groupBadge}${memberBadge}${cardBadge}</div>
                <div class="volunteer-meta">
                    <span><strong>Sessions:</strong> ${sessions}</span>
                    <span><strong>Hours:</strong> ${hours}</span>
                </div>
            </a>
        `;
        if (advancedOpen) {
            const checked = selectedVolunteers.has(v.id) ? ' checked' : '';
            return `<div class="card-selectable">
                <input type="checkbox" class="card-checkbox" data-id="${v.id}"${checked}
                    onclick="event.stopPropagation()"
                    onchange="onVolunteerCheck(${v.id}, this.checked)">
                ${card}
            </div>`;
        }
        return card;
    }).join('');

    contentDiv.innerHTML = `<div class="volunteer-list">${html}</div>`;
}

async function loadVolunteers() {
    const contentDiv = document.getElementById('content');

    try {
        let url = currentFilter !== 'all'
            ? `/api/profiles?fy=${encodeURIComponent(currentFilter)}`
            : '/api/profiles';
        if (currentGroup) url += `${url.includes('?') ? '&' : '?'}group=${encodeURIComponent(currentGroup)}`;
        const response = await apiFetch(url);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch volunteers');
        }

        allVolunteers = result.data;
        displayVolunteers();

    } catch (error) {
        console.error('Error loading volunteers:', error);
        showError(contentDiv, 'Error Loading Volunteers', error.message);
    }
}

async function loadGroups() {
    try {
        const response = await apiFetch('/api/groups');
        if (!response.ok) return;
        const result = await response.json();
        if (!result.success) return;

        const select = document.getElementById('groupSelect');
        result.data
            .sort((a, b) => (a.displayName || a.key).localeCompare(b.displayName || b.key))
            .forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.key;
                opt.textContent = g.displayName || g.key;
                select.appendChild(opt);
            });
        if (currentGroup) select.value = currentGroup;
    } catch (e) {
        console.error('Error loading groups:', e);
    }
}

function setTypeFilter(val) { currentTypeFilter = val; persistFilters(); displayVolunteers(); }
function setHoursFilter(val) { currentHoursFilter = val; persistFilters(); displayVolunteers(); }
function setRecordType(val) { currentRecordType = val; persistFilters(); displayVolunteers(); }
function setRecordStatus(val) { currentRecordStatus = val; persistFilters(); displayVolunteers(); }

function downloadCSV() {
    if (selectedVolunteers.size > 0) {
        window.location.href = '/api/profiles/export?profileIds=' + [...selectedVolunteers].join(',');
        return;
    }
    const params = new URLSearchParams();
    params.set('fy', currentFilter); // "FY2025" or "all"
    if (currentGroup) params.set('group', currentGroup);
    const searchTerm = document.getElementById('searchBox').value.trim();
    if (searchTerm) params.set('search', searchTerm);
    if (currentTypeFilter) params.set('type', currentTypeFilter);
    if (currentHoursFilter) params.set('hours', currentHoursFilter);
    if (currentRecordType) params.set('recordType', currentRecordType);
    if (currentRecordStatus) params.set('recordStatus', currentRecordStatus);
    window.location.href = '/api/profiles/export?' + params.toString();
}

async function loadRecordOptions() {
    try {
        const res = await apiFetch('/api/records/options');
        if (!res.ok) {
            console.error('Failed to load record options:', res.status, res.url);
            return;
        }
        const result = await res.json();
        if (!result.success) return;
        const typeSelect = document.getElementById('recordTypeSelect');
        result.data.types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            typeSelect.appendChild(opt);
        });
        const statusSelect = document.getElementById('recordStatusSelect');
        result.data.statuses.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            statusSelect.appendChild(opt);
        });
        if (currentRecordType) typeSelect.value = currentRecordType;
        if (currentRecordStatus) statusSelect.value = currentRecordStatus;
    } catch (e) {
        console.error('Error loading record options:', e);
    }
}

function getFilteredIndividuals() {
    let filtered = allVolunteers.filter(v => !v.isGroup);
    if (currentTypeFilter === 'groups') return [];
    if (currentFilter === 'all') filtered = filtered.filter(v => v.hoursAll > 0);
    else filtered = filtered.filter(v => v.hoursThisFY > 0 || v.sessionsThisFY > 0);
    const searchTerm = document.getElementById('searchBox').value;
    if (searchTerm && searchTerm.length >= 3) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(v => (v.name || '').toLowerCase().includes(term));
    }
    if (currentHoursFilter) {
        const hFilters = {
            '0': v => getHours(v) === 0,
            'lt15': v => { const h = getHours(v); return h > 0 && h < 15; },
            '15plus': v => getHours(v) >= 15,
            '15to30': v => { const h = getHours(v); return h >= 15 && h <= 30; },
            '30plus': v => getHours(v) > 30
        };
        if (hFilters[currentHoursFilter]) filtered = filtered.filter(hFilters[currentHoursFilter]);
    }
    if (currentRecordType) {
        filtered = filtered.filter(v => {
            const recs = (v.records || []).filter(r => r.type === currentRecordType);
            if (currentRecordStatus === 'none') return recs.length === 0;
            if (currentRecordStatus) return recs.some(r => r.status === currentRecordStatus);
            return recs.length > 0;
        });
    } else if (currentRecordStatus === 'none') {
        filtered = filtered.filter(v => !v.records || v.records.length === 0);
    }
    return filtered;
}

let bulkRecordOptions = null;

async function openBulkRecords() {
    const selectedIndividuals = selectedVolunteers.size > 0
        ? allVolunteers.filter(v => !v.isGroup && selectedVolunteers.has(v.id))
        : getFilteredIndividuals();
    if (selectedIndividuals.length === 0) {
        alert(selectedVolunteers.size > 0
            ? 'No individual volunteers in your selection.'
            : 'No individual volunteers in the current filter.');
        return;
    }
    const countDesc = selectedVolunteers.size > 0
        ? `${selectedIndividuals.length} selected volunteer${selectedIndividuals.length === 1 ? '' : 's'}.`
        : `${selectedIndividuals.length} individual volunteer${selectedIndividuals.length === 1 ? '' : 's'} in current filter.`;
    document.getElementById('bulkRecordCount').textContent = countDesc;
    document.getElementById('bulkRecordSummary').textContent = '';

    if (!bulkRecordOptions) {
        try {
            const res = await apiFetch('/api/records/options');
            const result = await res.json();
            if (result.success) bulkRecordOptions = result.data;
        } catch (e) { console.error(e); }
    }
    if (bulkRecordOptions) {
        const typeSelect = document.getElementById('bulkRecordType');
        typeSelect.innerHTML = '<option value="">Select type...</option>';
        bulkRecordOptions.types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t; opt.textContent = t;
            typeSelect.appendChild(opt);
        });
        const statusSelect = document.getElementById('bulkRecordStatus');
        statusSelect.innerHTML = '<option value="">Select status...</option>';
        bulkRecordOptions.statuses.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s;
            statusSelect.appendChild(opt);
        });
    }
    document.getElementById('bulkRecordDate').value = new Date().toISOString().substring(0, 10);
    document.getElementById('bulkRecordModal').classList.add('visible');
}

function closeBulkRecords() {
    document.getElementById('bulkRecordModal').classList.remove('visible');
}

async function submitBulkRecords() {
    const type = document.getElementById('bulkRecordType').value;
    const status = document.getElementById('bulkRecordStatus').value;
    const dateVal = document.getElementById('bulkRecordDate').value;
    if (!type || !status) {
        alert('Please select a record type and status.');
        return;
    }

    const profileIds = selectedVolunteers.size > 0
        ? allVolunteers.filter(v => !v.isGroup && selectedVolunteers.has(v.id)).map(v => v.id)
        : getFilteredIndividuals().map(v => v.id);
    const count = profileIds.length;
    if (!confirm(`You are about to update ${count} volunteer record${count === 1 ? '' : 's'} with "${type}: ${status}". Continue?`)) return;

    const btn = document.getElementById('bulkRecordConfirm');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    const summary = document.getElementById('bulkRecordSummary');
    summary.textContent = '';

    try {
        const date = dateVal ? new Date(dateVal + 'T10:00:00.000Z').toISOString() : new Date().toISOString();
        const res = await apiFetch('/api/records/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileIds, type, status, date })
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || 'Bulk update failed');

        const d = result.data;
        summary.textContent = `Done: ${d.created} created, ${d.updated} updated.`;
        setTimeout(() => {
            closeBulkRecords();
            loadVolunteers();
        }, 1500);
    } catch (error) {
        summary.textContent = error.message || 'Failed';
        summary.style.color = 'var(--error)';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm';
    }
}

document.getElementById('searchBox').addEventListener('input', () => { persistFilters(); displayVolunteers(); });

applyURLParams();
loadFYOptions().then(() => {
    currentFilter = getStoredFY();
    setFilter(currentFilter);
});
loadGroups();
loadRecordOptions();
