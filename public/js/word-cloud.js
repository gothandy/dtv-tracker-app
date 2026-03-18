/**
 * Word Cloud Component
 *
 * Renders a word cloud from tag-hours data returned by GET /api/tags/hours-by-taxonomy.
 * Font size scales linearly with hours. Tags with 0 hours are excluded.
 * Ancestor nodes (depth 0) appear largest/darkest; children progressively smaller.
 *
 * Usage:
 *   const wc = createWordCloud(containerEl, { title: 'Hours by Area' });
 *   wc.update(items);  // items: Array<{ label, hours, depth, termGuid? }>
 *
 * Options:
 *   getLinkUrl(item) — optional; return a URL string to make the word a clickable link,
 *                      or null/undefined to leave it non-clickable.
 */
function createWordCloud(container, options = {}) {
    const title = options.title || 'Hours by Area';
    const minItems = options.minItems ?? 2;
    const getLinkUrl = options.getLinkUrl || null;
    const embedded = options.embedded || false;
    const BASE_SIZE = 0.85;   // rem
    const MAX_SIZE  = 2.4;    // rem

    let card = null;
    let bodyEl = null;
    let csvBtn = null;
    let lastItems = [];

    function shortLabel(label) {
        const parts = label.split(':');
        return parts[parts.length - 1].trim();
    }

    function buildCard() {
        card = document.createElement('div');

        if (embedded) {
            card.className = 'word-cloud-embedded';
            bodyEl = document.createElement('div');
            bodyEl.className = 'word-cloud-body';
            csvBtn = document.createElement('button');
            csvBtn.className = 'word-cloud-csv-btn admin-only';
            csvBtn.textContent = 'Download CSV';
            csvBtn.style.display = 'none';
            csvBtn.addEventListener('click', () => downloadCsv(lastItems, title));
            card.appendChild(bodyEl);
            card.appendChild(csvBtn);
        } else {
            card.className = 'word-cloud-card';
            card.innerHTML = `
                <div class="word-cloud-header">
                    <h2>${escapeHtml(title)}</h2>
                    <button class="word-cloud-csv-btn trusted-only" title="Download CSV">Download CSV</button>
                </div>
                <div class="word-cloud-body"></div>`;
            csvBtn = card.querySelector('.word-cloud-csv-btn');
            csvBtn.addEventListener('click', () => downloadCsv(lastItems, title));
            bodyEl = card.querySelector('.word-cloud-body');
        }

        container.appendChild(card);
    }

    function render(items) {
        if (!card) buildCard();

        const visibleItems = (items || []).filter(i => i.hours > 0);

        if (visibleItems.length < minItems) {
            card.style.display = 'none';
            return;
        }

        const maxHours = Math.max(...visibleItems.map(i => i.hours), 1);

        bodyEl.innerHTML = '';
        const shuffled = [...visibleItems].sort(() => Math.random() - 0.5);
        for (const item of shuffled) {
            const size = BASE_SIZE + (MAX_SIZE - BASE_SIZE) * (item.hours / maxHours);
            const short = shortLabel(item.label);
            const url = getLinkUrl ? getLinkUrl(item) : null;
            const el = document.createElement(url ? 'a' : 'span');
            el.className = 'wc-word';
            el.dataset.depth = String(item.depth);
            el.style.fontSize = size.toFixed(2) + 'rem';
            el.title = item.label + ' — ' + item.hours + 'h';
            el.textContent = short;
            if (url) {
                el.href = url;
                el.style.cursor = 'pointer';
                el.style.textDecoration = 'none';
            }
            bodyEl.appendChild(el);
        }

        card.style.display = '';
    }

    function downloadCsv(items, cloudTitle) {
        if (!items || items.length === 0) return;
        const rows = ['"Tag","Hours"', ...items.map(i => `"${i.label.replace(/"/g, '""')}",${i.hours}`)];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (cloudTitle || 'tag-hours').toLowerCase().replace(/\s+/g, '-') + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    return {
        update(items) {
            lastItems = items || [];
            render(lastItems);
        },
        hide() {
            if (card) card.style.display = 'none';
        },
        show() {
            if (card && lastItems.length >= minItems) card.style.display = '';
        },
        setCsvVisible(visible) {
            if (csvBtn && embedded) csvBtn.style.display = visible ? '' : 'none';
        }
    };
}
