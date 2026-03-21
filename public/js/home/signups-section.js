let signupsSince = '24h';

function setSignupsSince(value, label) {
    signupsSince = value;
    const el = document.getElementById('signupsFilterLabel');
    if (el) el.textContent = label;
    // Close the dropdown
    const menu = document.getElementById('signupsFilterMenu');
    if (menu) menu.classList.remove('open');
    // Update active state
    document.querySelectorAll('#signupsFilterMenu button').forEach(b => {
        b.classList.toggle('active', b.dataset.value === value);
    });
    loadRecentSignups();
}

async function refreshSignups() {
    const btn = document.getElementById('refreshSignupsBtn');
    if (btn) { btn.disabled = true; btn.classList.add('spinning'); }
    try {
        const role = window.currentUser?.role;
        if (role === 'admin' || role === 'checkin') {
            // Fire-and-forget — don't block the UI on the Eventbrite API call
            fetch(`/api/eventbrite/quick-sync?since=${encodeURIComponent(signupsSince)}`, { method: 'POST' })
                .catch(err => console.error('[quick-sync]', err));
        }
        await loadRecentSignups();
    } finally {
        if (btn) { btn.disabled = false; btn.classList.remove('spinning'); }
    }
}

async function loadRecentSignups() {
    const since = signupsSince;
    const list = document.getElementById('recentSignupsList');
    try {
        const res = await fetch(`/api/entries/recent?since=${encodeURIComponent(since)}`);
        if (!res.ok) { console.error('Recent signups fetch failed:', res.status); return; }
        const result = await res.json();
        if (!result.success) { console.error('Recent signups error:', result.error); return; }

        if (!result.data.length) {
            list.innerHTML = `<div class="signups-empty">No sign-ups in this period</div>`;
        } else {
            list.innerHTML = result.data.map(e => {
                const date = formatDate(e.date);
                const icons = notesToIcons(e.notes || '');
                const href = `/entries/${e.id}/edit.html`;
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
            <div class="title-row">
                <div class="title-left">
                    <h2>Recent Sign-ups</h2>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <div class="dropdown">
                        <button class="dropdown-btn" onclick="toggleDropdown('signupsFilterMenu')">
                            <img src="/svg/filter.svg" width="16" height="16" alt="">
                            <span id="signupsFilterLabel">Last 24h</span>
                        </button>
                        <div class="dropdown-menu" id="signupsFilterMenu">
                            <button class="active" data-value="24h" onclick="setSignupsSince('24h', 'Last 24h')">Last 24h</button>
                            <button data-value="48h" onclick="setSignupsSince('48h', 'Last 48h')">Last 48h</button>
                            <button data-value="7d" onclick="setSignupsSince('7d', 'Last 7 days')">Last 7 days</button>
                        </div>
                    </div>
                    <button id="refreshSignupsBtn" class="btn-action" title="Refresh" onclick="refreshSignups()">
                        <img src="/svg/refresh.svg" alt="Refresh" width="16" height="16">
                    </button>
                </div>
            </div>
            <div id="recentSignupsList"></div>
        </div>
    `;
    loadRecentSignups();
}
