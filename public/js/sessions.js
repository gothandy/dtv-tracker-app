let allSessions = [];
let allGroups = [];
let currentFilter = 'all';
let currentSearch = '';
let currentGroup = '';
let currentTag = '';
let advancedOpen = false;
let selectedSessions = new Set();

function fyKeyToLabel(fyKey) {
    const startYear = parseInt(fyKey.replace('FY', ''));
    const endYear = startYear + 1;
    return `FY ${String(startYear).slice(2)}/${String(endYear).slice(2)}`;
}

function applyURLParams() {
    const params = new URLSearchParams(window.location.search);
    currentSearch = params.get('search') || '';
    currentGroup  = params.get('group')  || '';
    currentTag    = params.get('tag')    || '';
    if (currentSearch) document.getElementById('searchBox').value = currentSearch;
    if (currentGroup || currentTag) {
        advancedOpen = true;
        document.getElementById('advancedSection').classList.add('open');
        document.getElementById('advancedToggle').innerHTML = 'Advanced &#9652;';
        updateSelectAllLink();
    }
}

function persistFilters() {
    const url = new URL(window.location.href);
    currentSearch ? url.searchParams.set('search', currentSearch) : url.searchParams.delete('search');
    currentGroup  ? url.searchParams.set('group',  currentGroup)  : url.searchParams.delete('group');
    currentTag    ? url.searchParams.set('tag',    currentTag)    : url.searchParams.delete('tag');
    history.replaceState(null, '', url);
}

function buildDropdown() {
    const fyKeys = [...new Set(allSessions.map(s => s.financialYear))]
        .filter(k => k && k.startsWith('FY'))
        .sort((a, b) => a.localeCompare(b));

    const menu = document.getElementById('filterMenu');
    menu.innerHTML = '';

    const btnAll = document.createElement('button');
    btnAll.id = 'fyBtn_all';
    btnAll.textContent = 'All';
    btnAll.onclick = () => filterSessions('all');
    menu.appendChild(btnAll);

    fyKeys.forEach(fyKey => {
        const btn = document.createElement('button');
        btn.id = `fyBtn_${fyKey}`;
        btn.textContent = fyKeyToLabel(fyKey);
        btn.onclick = () => filterSessions(fyKey);
        menu.appendChild(btn);
    });
}

function refreshGroupDropdown(sessions) {
    const groupSelect = document.getElementById('groupSelect');
    const groups = [...new Map(
        sessions.filter(s => s.groupName && s.groupId != null)
                .map(s => [s.groupId, s.groupName])
    ).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    groupSelect.innerHTML = '<option value="">All Groups</option>';
    groups.forEach(([id, name]) => {
        const opt = document.createElement('option');
        opt.value = String(id);
        opt.textContent = name;
        groupSelect.appendChild(opt);
    });
    if (currentGroup && !groups.some(([id]) => String(id) === currentGroup)) {
        currentGroup = '';
        persistFilters();
    }
    groupSelect.value = currentGroup;
}

function buildFilterDropdowns() {
    refreshGroupDropdown(allSessions);
    // Restore tag filter button label from session metadata when loading from URL
    if (currentTag) {
        for (const s of allSessions) {
            const tag = (s.metadata || []).find(t => t.termGuid === currentTag);
            if (tag) {
                const labelEl = document.getElementById('tagFilterLabel');
                if (labelEl) labelEl.textContent = tagShortLabel(tag.label);
                break;
            }
        }
    }
}

function tagShortLabel(label) {
    return label.split(' > ').map(s => s.trim()).join(': ');
}

// Tag filter tree dropdown
let tagTaxonomy = null;
let tagFilterOpen = false;
let _tagFilterCounter = 0;
let availableTagGuids = null; // null = no constraint; Set = restrict to these GUIDs

function refreshTagFilter(sessions) {
    const guids = new Set();
    sessions.forEach(s => (s.metadata || []).forEach(t => { if (t.termGuid) guids.add(t.termGuid); }));
    if (currentTag && !guids.has(currentTag)) {
        currentTag = '';
        const labelEl = document.getElementById('tagFilterLabel');
        if (labelEl) labelEl.textContent = 'All Tags';
        persistFilters();
    }
    availableTagGuids = guids;
    if (tagFilterOpen) renderTagFilterTree();
}

async function toggleTagFilter() {
    tagFilterOpen = !tagFilterOpen;
    const panel = document.getElementById('tagFilterPanel');
    const btn = document.getElementById('tagFilterBtn');
    if (tagFilterOpen) {
        btn.classList.add('active');
        panel.style.display = '';
        if (!tagTaxonomy) {
            const treeEl = document.getElementById('tagFilterTree');
            if (treeEl) treeEl.innerHTML = '<li style="padding:0.5rem 0.75rem;color:var(--text-mid);font-size:0.9rem;">Loading…</li>';
            try {
                const res = await fetch('/api/tags/taxonomy');
                const data = await res.json();
                tagTaxonomy = (data.success && data.data) ? data.data : [];
            } catch (e) { tagTaxonomy = []; }
        }
        renderTagFilterTree();
    } else {
        closeTagFilter();
    }
}

function closeTagFilter() {
    tagFilterOpen = false;
    const panel = document.getElementById('tagFilterPanel');
    const btn = document.getElementById('tagFilterBtn');
    if (panel) panel.style.display = 'none';
    if (btn) btn.classList.remove('active');
}

function buildTagFilterTreeHTML(nodes, path) {
    const parts = [];
    for (const node of nodes) {
        const nodePath = (path || []).concat([node.label]);
        const pathStr = nodePath.join(' > ');
        const hasChildren = node.children && node.children.length;
        // Build children first to know whether any are visible
        const childrenHTML = hasChildren ? buildTagFilterTreeHTML(node.children, nodePath) : '';
        const hasVisibleChildren = childrenHTML.length > 0;
        // Skip node if its GUID is not in the available set and no children are visible
        if (availableTagGuids && !availableTagGuids.has(node.id) && !hasVisibleChildren) continue;
        const nodeId = 'tfnode-' + (++_tagFilterCounter);
        const depth = path ? path.length : 0;
        const indent = Array(depth).fill('<span class="tag-tree-indent"></span>').join('');
        const toggle = hasVisibleChildren
            ? `<button class="tag-tree-toggle" onclick="toggleTagNode('${nodeId}', event)">−</button>`
            : '<span class="tag-tree-indent"></span>';
        const isSelected = node.id && node.id === currentTag;
        const escapedPath = pathStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        parts.push(`<li>
            <div class="tag-tree-row${isSelected ? ' selected' : ''}" onclick="selectTagFilter('${escapeHtml(node.id || '')}', '${escapedPath}')">
                ${indent}${toggle}<span class="tag-tree-label">${escapeHtml(node.label)}</span>
            </div>
            ${hasVisibleChildren ? `<ul class="tag-tree-children open" id="${nodeId}">${childrenHTML}</ul>` : ''}
        </li>`);
    }
    return parts.join('');
}

function renderTagFilterTree() {
    const tree = document.getElementById('tagFilterTree');
    if (!tree) return;
    _tagFilterCounter = 0;
    const allRow = `<li><div class="tag-tree-row${!currentTag ? ' selected' : ''}" onclick="selectTagFilter('', 'All Tags')" style="font-style:italic;">
        <span class="tag-tree-indent"></span><span class="tag-tree-indent"></span><span class="tag-tree-label">All Tags</span>
    </div></li>`;
    tree.innerHTML = allRow + (tagTaxonomy && tagTaxonomy.length
        ? buildTagFilterTreeHTML(tagTaxonomy, [])
        : '<li style="padding:0.5rem 0.75rem;color:var(--text-mid);font-size:0.9rem;">No tags available</li>');
}

function selectTagFilter(termGuid, label) {
    currentTag = termGuid;
    const labelEl = document.getElementById('tagFilterLabel');
    if (labelEl) labelEl.textContent = termGuid ? tagShortLabel(label) : 'All Tags';
    closeTagFilter();
    persistFilters();
    displaySessions(allSessions);
}

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
    if (!e.target.closest('#tagFilterWrap')) {
        closeTagFilter();
    }
});

function toggleAdvanced() {
    advancedOpen = !advancedOpen;
    const section = document.getElementById('advancedSection');
    const btn = document.getElementById('advancedToggle');
    section.classList.toggle('open', advancedOpen);
    btn.innerHTML = advancedOpen ? 'Advanced &#9652;' : 'Advanced &#9662;';
    if (!advancedOpen) {
        selectedSessions.clear();
        updateBulkTagButton();
    }
    updateSelectAllLink();
    displaySessions(allSessions);
}

function getVisibleSessionIds() {
    let filtered = allSessions;
    if (currentFilter !== 'all') filtered = filtered.filter(s => s.financialYear === currentFilter);
    if (currentGroup) filtered = filtered.filter(s => String(s.groupId) === currentGroup);
    if (currentTag) filtered = filtered.filter(s => (s.metadata || []).some(t => t.termGuid === currentTag));
    if (currentSearch.length >= 3) {
        const term = currentSearch.toLowerCase();
        filtered = filtered.filter(s =>
            (s.displayName || '').toLowerCase().includes(term) ||
            (s.description  || '').toLowerCase().includes(term)
        );
    }
    return filtered.map(s => s.id);
}

function updateBulkTagButton() {
    const btn = document.getElementById('addTagsBtn');
    if (!btn) return;
    const count = selectedSessions.size;
    btn.disabled = count === 0;
    btn.textContent = count > 0 ? `Add Tags (${count})` : 'Add Tags';
}

function updateSelectAllLink() {
    const link = document.getElementById('selectAllLink');
    if (!link) return;
    link.style.display = advancedOpen ? '' : 'none';
    const visibleIds = getVisibleSessionIds();
    const allChecked = visibleIds.length > 0 && visibleIds.every(id => selectedSessions.has(id));
    link.textContent = allChecked ? 'Deselect all' : 'Select all';
}

function toggleSelectAll() {
    const visibleIds = getVisibleSessionIds();
    const allChecked = visibleIds.length > 0 && visibleIds.every(id => selectedSessions.has(id));
    if (allChecked) {
        visibleIds.forEach(id => selectedSessions.delete(id));
    } else {
        visibleIds.forEach(id => selectedSessions.add(id));
    }
    updateSelectAllLink();
    updateBulkTagButton();
    displaySessions(allSessions);
}

function openBulkTagModal() {
    const count = selectedSessions.size;
    if (count === 0) return;
    const h3 = document.querySelector('#addTagModal h3');
    if (h3) h3.textContent = `Add Tag to ${count} session${count === 1 ? '' : 's'}`;
    openAddTagModal();
}

async function handleBulkTagConfirm(tag) {
    const res = await apiFetch('/api/sessions/bulk-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionIds: [...selectedSessions],
            tags: [{ label: tag.label, termGuid: tag.termGuid }]
        })
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || 'Bulk tag failed');
    selectedSessions.clear();
    updateBulkTagButton();
    updateSelectAllLink();
    loadSessions();
}

function setGroup(value) {
    currentGroup = value;
    persistFilters();
    displaySessions(allSessions);
}

function filterSessions(filter) {
    currentFilter = filter;
    persistFY(filter);
    persistFilters();
    const label = filter === 'all' ? 'All' : fyKeyToLabel(filter);
    document.getElementById('filterLabel').textContent = label;
    document.querySelectorAll('#filterMenu button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`fyBtn_${filter}`);
    if (activeBtn) activeBtn.classList.add('active');
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    displaySessions(allSessions);
}

function displaySessions(sessions) {
    const contentDiv = document.getElementById('content');
    const countDiv = document.getElementById('sessionCount');

    let filtered = sessions;

    if (currentFilter !== 'all') {
        filtered = filtered.filter(s => s.financialYear === currentFilter);
    }
    if (currentSearch.length >= 3) {
        const term = currentSearch.toLowerCase();
        filtered = filtered.filter(s =>
            (s.displayName || '').toLowerCase().includes(term) ||
            (s.description  || '').toLowerCase().includes(term)
        );
    }

    // Base for cascades: FY + search (no tag or group filter yet)
    const base = filtered;

    // Cascade tags: sessions matching FY + search + group (not tag)
    // refreshTagFilter may clear currentTag if it's no longer available
    refreshTagFilter(currentGroup
        ? base.filter(s => String(s.groupId) === currentGroup)
        : base);

    // Cascade groups: sessions matching FY + search + tag (not group)
    refreshGroupDropdown(currentTag
        ? base.filter(s => (s.metadata || []).some(t => t.termGuid === currentTag))
        : base);

    if (currentTag) {
        filtered = base.filter(s => (s.metadata || []).some(t => t.termGuid === currentTag));
    }
    if (currentGroup) {
        filtered = filtered.filter(s => String(s.groupId) === currentGroup);
    }

    countDiv.textContent = filtered.length;
    renderSessionList(contentDiv, filtered, {
        checkboxMode: advancedOpen,
        checkedIds: selectedSessions,
        onCheckChange: (id, checked) => {
            if (checked) selectedSessions.add(id);
            else selectedSessions.delete(id);
            updateSelectAllLink();
            updateBulkTagButton();
        }
    });
}

document.getElementById('searchBox').addEventListener('input', function() {
    currentSearch = this.value.trim();
    persistFilters();
    displaySessions(allSessions);
});

async function loadSessions() {
    const contentDiv = document.getElementById('content');
    const countDiv = document.getElementById('sessionCount');
    tagTaxonomy = null; // always re-fetch taxonomy on next dropdown open

    try {
        const response = await fetch('/api/sessions');
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch sessions');
        }

        allSessions = data.data;
        buildDropdown();
        buildFilterDropdowns();
        filterSessions(getStoredFY());

    } catch (error) {
        console.error('Error loading sessions:', error);
        countDiv.textContent = '?';
        showError(contentDiv, 'Error Loading Sessions', error.message);
    }
}

async function loadGroups() {
    try {
        const response = await fetch('/api/groups');
        if (!response.ok) return;
        const data = await response.json();
        if (!data.success) return;
        allGroups = data.data;
    } catch (e) {
        console.error('Error loading groups:', e);
    }
}

function openNewSessionModal() {
    const select = document.getElementById('newGroup');
    select.innerHTML = '<option value="">Select a group...</option>' +
        allGroups.map(g => `<option value="${g.id}">${escapeHtml(g.displayName || g.key)}</option>`).join('');
    document.getElementById('newDate').value = '';
    document.getElementById('newName').value = '';
    document.getElementById('newDescription').value = '';
    document.getElementById('newSessionModal').classList.add('visible');
    select.focus();
}

function closeNewSessionModal() {
    document.getElementById('newSessionModal').classList.remove('visible');
}

async function saveNewSession() {
    const groupId = document.getElementById('newGroup').value;
    const date = document.getElementById('newDate').value;
    const name = document.getElementById('newName').value.trim();
    const description = document.getElementById('newDescription').value.trim();

    if (!groupId) {
        document.getElementById('newGroup').focus();
        return;
    }
    if (!date) {
        document.getElementById('newDate').focus();
        return;
    }

    const btn = document.getElementById('confirmNewBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
        const res = await apiFetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: Number(groupId), date, name: name || undefined, description: description || undefined })
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

initSessionTags({
    groupKey: null,
    sessionDate: null,
    getSession: () => null,
    onUpdate: () => {},
    onConfirm: handleBulkTagConfirm
});

applyURLParams();
loadSessions();
loadGroups();
