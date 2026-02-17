const TAG_ICONS = [
    // Badges (profile-level indicators)
    { icon: "member.svg", alt: "Member", type: "badge" },
    { icon: "card.svg", alt: "Benefits Card", type: "badge" },
    { icon: "card.svg", alt: "Card Invited", type: "badge", color: "orange" },
    { icon: "group.svg", alt: "Group / Company", type: "badge" },

    // Entry tags (matched from notes)
    { icon: "child.svg", alt: "Child", tag: "#Child", type: "tag" },
    { icon: "regular.svg", alt: "Regular", tag: "#Regular", type: "tag" },
    { icon: "new.svg", alt: "New", tag: "#New", type: "tag" },
    { icon: "diglead.svg", alt: "Digital Leader", tag: "#DigLead", type: "tag" },
    { icon: "firstaider.svg", alt: "First Aider", tag: "#FirstAider", type: "tag", color: "red" },
    { icon: "csr.svg", alt: "CSR", tag: "#CSR", type: "tag" },
    { icon: "late.svg", alt: "Late", tag: "#Late", type: "tag" },
    { icon: "nophoto.svg", alt: "No Photo", tag: "#NoPhoto", type: "tag", color: "red" }
];

function tagIconImg(entry) {
    return `<img src="/svg/${entry.icon}" alt="${entry.alt}">`;
}

function notesToIcons(notes) {
    if (!notes) return '';
    return TAG_ICONS
        .filter(t => t.tag && new RegExp(t.tag.replace('#', '#'), 'i').test(notes))
        .map(t => `<span class="entry-tag${t.color ? ' icon-' + t.color : ''}" title="${escapeHtml(t.alt)}">${tagIconImg(t)}</span>`)
        .join('');
}

function renderTagButtons(textareaId, containerId, onToggle) {
    const textarea = document.getElementById(textareaId);
    const container = document.getElementById(containerId);
    if (!textarea || !container) return;

    function hasTag(text, tag) {
        return new RegExp(tag.replace('#', '#'), 'i').test(text);
    }

    function refresh() {
        const text = textarea.value;
        container.querySelectorAll('.tag-btn').forEach(btn => {
            const tag = btn.dataset.tag;
            btn.classList.toggle('active', hasTag(text, tag));
        });
    }

    container.innerHTML = TAG_ICONS.filter(t => t.tag).map(t =>
        `<button type="button" class="tag-btn${t.color ? ' icon-' + t.color : ''}" data-tag="${escapeHtml(t.tag)}" title="${escapeHtml(t.alt)}">${tagIconImg(t)}</button>`
    ).join('');

    container.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            let text = textarea.value;
            if (hasTag(text, tag)) {
                text = text.replace(new RegExp('\\s*' + tag.replace('#', '#'), 'gi'), '').trim();
            } else {
                text = text ? text.trimEnd() + ' ' + tag : tag;
            }
            textarea.value = text;
            refresh();
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            if (onToggle) onToggle(text);
        });
    });

    textarea.addEventListener('input', refresh);
    refresh();
}
