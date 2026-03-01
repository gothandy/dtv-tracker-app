/**
 * Session Tags Module
 *
 * Manages taxonomy tag selection, display, and persistence for a session.
 * Call initSessionTags({ groupKey, sessionDate, getSession, onUpdate }) once on page load.
 *
 * Exposes globals: initSessionTags, openAddTagModal, closeAddTagModal,
 *   confirmTagSelection, selectTagFromTree, toggleTagNode, removeTag, renderTagsSection
 */
(function () {
    let _groupKey = null;
    let _sessionDate = null;
    let _getSession = null;
    let _onUpdate = null;
    let _onConfirm = null;

    let _treeIdCounter = 0;
    let _selectedTag = null;
    let _termGuidMap = {};

    function initSessionTags(opts) {
        _groupKey = opts.groupKey;
        _sessionDate = opts.sessionDate;
        _getSession = opts.getSession;
        _onUpdate = opts.onUpdate;
        _onConfirm = opts.onConfirm || null;

        // Inject the Add Tag modal into the DOM if not already present
        if (!document.getElementById('addTagModal')) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.id = 'addTagModal';
            modal.innerHTML =
                '<div class="modal modal-wide">' +
                    '<h3>Add Tag</h3>' +
                    '<ul id="tagTreeRoot" class="tag-tree"></ul>' +
                    '<div class="modal-buttons">' +
                        '<button class="modal-btn modal-btn-cancel" onclick="closeAddTagModal()">Cancel</button>' +
                        '<button class="modal-btn modal-btn-confirm" id="addTagOkBtn" onclick="confirmTagSelection()" disabled>OK</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(modal);
        }
    }

    async function loadTaxonomy() {
        const res = await apiFetch('/api/tags/taxonomy');
        const data = await res.json();
        _termGuidMap = buildTermGuidMap((data.success && data.data) ? data.data : []);
        return (data.success && data.data) ? data.data : [];
    }

    function buildTermGuidMap(nodes, pathParts) {
        pathParts = pathParts || [];
        const map = {};
        for (const node of nodes) {
            const path = pathParts.concat([node.label]).join(' > ');
            if (node.id) map[path] = node.id;
            if (node.children && node.children.length) {
                Object.assign(map, buildTermGuidMap(node.children, pathParts.concat([node.label])));
            }
        }
        return map;
    }

    function buildTagTree(nodes, path, depth) {
        const currentSession = _getSession();
        depth = depth || 0;
        return nodes.map(function (node) {
            const nodePath = (path || []).concat([node.label]);
            const pathStr = nodePath.join(' > ');
            const hasChildren = node.children && node.children.length;
            const nodeId = 'tnode-' + (++_treeIdCounter);
            const indent = Array(depth).fill('<span class="tag-tree-indent"></span>').join('');
            const toggle = hasChildren
                ? '<button class="tag-tree-toggle" onclick="toggleTagNode(\'' + nodeId + '\',event)">−</button>'
                : '<span class="tag-tree-indent"></span>';
            const children = hasChildren
                ? '<ul class="tag-tree-children open" id="' + nodeId + '">' + buildTagTree(node.children, nodePath, depth + 1) + '</ul>'
                : '';
            const alreadyAdded = currentSession && currentSession.metadata &&
                currentSession.metadata.some(function(t) {
                    return (t.termGuid && t.termGuid === node.id) || t.label === pathStr;
                });
            const rowStyle = alreadyAdded ? ' style="opacity:0.4;pointer-events:none;"' : '';
            const escapedPath = pathStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return '<li>' +
                '<div class="tag-tree-row"' + rowStyle + ' onclick="selectTagFromTree(\'' + escapedPath + '\')">' +
                    indent + toggle + '<span class="tag-tree-label">' + escapeHtml(node.label) + '</span>' +
                '</div>' +
                children +
                '</li>';
        }).join('');
    }

    function toggleTagNode(nodeId, event) {
        event.stopPropagation();
        const el = document.getElementById(nodeId);
        if (!el) return;
        const open = el.classList.toggle('open');
        event.currentTarget.innerHTML = open ? '−' : '+';
    }

    async function openAddTagModal() {
        _selectedTag = null;
        document.getElementById('addTagOkBtn').disabled = true;
        const treeRoot = document.getElementById('tagTreeRoot');
        treeRoot.innerHTML = '<li style="padding:0.75rem;color:var(--text-mid);font-size:0.9rem;">Loading...</li>';
        document.getElementById('addTagModal').classList.add('visible');
        _treeIdCounter = 0;
        const taxonomy = await loadTaxonomy();
        treeRoot.innerHTML = taxonomy.length
            ? buildTagTree(taxonomy)
            : '<li style="padding:0.75rem;color:var(--text-mid);font-size:0.9rem;">No options available</li>';
    }

    function closeAddTagModal() {
        _selectedTag = null;
        document.getElementById('addTagModal').classList.remove('visible');
    }

    function selectTagFromTree(pathStr) {
        _selectedTag = { label: pathStr, termGuid: _termGuidMap[pathStr] || '' };
        document.querySelectorAll('.tag-tree-row.selected').forEach(el => el.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
        document.getElementById('addTagOkBtn').disabled = false;
    }

    async function confirmTagSelection() {
        if (!_selectedTag) return;
        const okBtn = document.getElementById('addTagOkBtn');
        if (okBtn) okBtn.disabled = true;
        if (_onConfirm) {
            try {
                await _onConfirm(_selectedTag);
                closeAddTagModal();
            } catch (error) {
                alert(error.message || 'Failed to add tag.');
                if (okBtn) okBtn.disabled = false;
            }
            return;
        }
        try {
            const existing = _getSession().metadata || [];
            await patchSessionMetadata([...existing, _selectedTag]);
            closeAddTagModal();
        } catch (error) {
            alert(error.message || 'Failed to add tag.');
            if (okBtn) okBtn.disabled = false;
        }
    }

    async function removeTag(tag) {
        const remaining = (_getSession().metadata || []).filter(t => t.label !== tag);
        await patchSessionMetadata(remaining);
    }

    async function patchSessionMetadata(tags) {
        const res = await apiFetch('/api/sessions/' + encodeURIComponent(_groupKey) + '/' + encodeURIComponent(_sessionDate), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata: tags })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || data.error || 'Failed to update tags');
        }
        _onUpdate();
    }

    function renderTagsSection(session) {
        const pills = (session.metadata || []).map(function (t) {
            const label = t.label || t;
            const ep = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return '<span class="tag-pill">' + escapeHtml(label) +
                '<button class="tag-pill-delete admin-only" onclick="removeTag(\'' + ep + '\')" title="Remove tag">&times;</button>' +
                '</span>';
        }).join('');
        const empty = !session.metadata || !session.metadata.length;
        return '<div class="section-card' + (empty ? ' admin-only' : '') + '">' +
            '<div class="tags-header">' +
                '<h2>Tags</h2>' +
                '<button class="btn-add-tag admin-only" onclick="openAddTagModal()">+ Add</button>' +
            '</div>' +
            '<div class="tag-pills" id="tagPills">' +
                pills +
                (empty ? '<span style="color:var(--text-faint,#bbb);font-size:0.85rem;">No tags</span>' : '') +
            '</div>' +
            '</div>';
    }

    window.initSessionTags = initSessionTags;
    window.openAddTagModal = openAddTagModal;
    window.closeAddTagModal = closeAddTagModal;
    window.confirmTagSelection = confirmTagSelection;
    window.selectTagFromTree = selectTagFromTree;
    window.toggleTagNode = toggleTagNode;
    window.removeTag = removeTag;
    window.renderTagsSection = renderTagsSection;
})();
