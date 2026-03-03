async function loadRecentSignups() {
    const since = document.getElementById('signupsSince')?.value || '24h';
    const list = document.getElementById('recentSignupsList');
    try {
        const res = await apiFetch(`/api/entries/recent?since=${encodeURIComponent(since)}`);
        if (!res.ok) { console.error('Recent signups fetch failed:', res.status); return; }
        const result = await res.json();
        if (!result.success) { console.error('Recent signups error:', result.error); return; }

        if (!result.data.length) {
            list.innerHTML = `<div class="signups-empty">No sign-ups in this period</div>`;
        } else {
            list.innerHTML = result.data.map(e => {
                const date = formatDate(e.date);
                const icons = notesToIcons(e.notes || '');
                const href = `/entries/${encodeURIComponent(e.groupKey)}/${e.date}/${encodeURIComponent(e.volunteerSlug)}/edit.html`;
                return `<a class="signup-row" href="${escapeHtml(href)}">
                    <div class="signup-name">
                        ${escapeHtml(e.volunteerName)}
                        ${icons ? `<span class="entry-tags">${icons}</span>` : ''}
                    </div>
                    <div class="signup-meta">${escapeHtml(date)} &middot; ${escapeHtml(e.groupName)}</div>
                </a>`;
            }).join('');
        }
        document.getElementById('recentSignupsCard').style.display = '';
    } catch (e) {
        console.error('Error loading recent signups:', e);
    }
}

function initSignupsSection() {
    document.getElementById('signupsSection').innerHTML = `
        <div class="signups-card" id="recentSignupsCard" style="display:none">
            <div class="signups-header">
                <h3>Recent Sign-ups</h3>
                <select class="signups-select" id="signupsSince" onchange="loadRecentSignups()">
                    <option value="24h">Last 24h</option>
                    <option value="48h">Last 48h</option>
                    <option value="7d">Last 7 days</option>
                </select>
            </div>
            <div id="recentSignupsList"></div>
        </div>
    `;
    loadRecentSignups();
}
