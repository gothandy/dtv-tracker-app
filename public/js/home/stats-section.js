let historyData = [];
let selectedFY = null;
let wordCloudController = null;

function renderChart() {
    const container = document.getElementById('fyAllRows');
    if (!historyData.length) { container.innerHTML = ''; return; }

    const maxHours = Math.max(...historyData.map(d => d.predictedHours ?? d.hours), 1);
    container.innerHTML = '';

    for (const d of historyData) {
        const isSelected = d.financialYear === selectedFY;
        const solidHours = d.completedHours ?? d.hours;
        const actualPct = Math.round((solidHours / maxHours) * 100);
        let predictedAdditionalPct = 0;

        if (d.predictedHours !== undefined && d.predictedHours > solidHours) {
            const predictedPct = Math.min(100, Math.round((d.predictedHours / maxHours) * 100));
            if (predictedPct > actualPct) predictedAdditionalPct = predictedPct - actualPct;
        }

        const [sy, ey] = d.financialYear.split('-');
        const barLabel = `${sy.slice(2)}/${ey.slice(2)}`;
        const hoursText = `${Math.round(solidHours).toLocaleString()}h`;

        const btn = document.createElement('button');
        btn.className = 'fy-bar-row' + (isSelected ? ' selected' : '');
        btn.innerHTML = `
            <span class="fy-bar-label">${barLabel}</span>
            <div class="fy-bar-track">
                <div class="fy-bar-actual" style="width:${actualPct}%"></div>
                ${predictedAdditionalPct > 0 ? `<div class="fy-bar-predicted" style="width:${predictedAdditionalPct}%"></div>` : ''}
            </div>
            <span class="fy-bar-hours">${hoursText}</span>`;
        btn.addEventListener('click', () => selectFY(d.financialYear));
        container.appendChild(btn);
    }
}

function toggleHistory() {
    const chart = document.querySelector('.fy-chart');
    const btn = document.getElementById('btnShowHistory');
    const isCollapsed = chart.classList.toggle('history-collapsed');
    btn.textContent = isCollapsed ? 'Show History' : 'Hide History';
    btn.classList.toggle('active', !isCollapsed);
}

function fyToCookieKey(fy) { return 'FY' + fy.split('-')[0]; }
function cookieKeyToFY(key) { const y = parseInt(key.replace('FY', '')); return `${y}-${y + 1}`; }

function selectFY(fy) {
    selectedFY = fy;
    persistFY(fyToCookieKey(fy));
    renderChart();
    const stats = historyData.find(d => d.financialYear === fy);
    if (stats) displayStats(stats);
    refreshWordCloud();
}

async function refreshWordCloud() {
    const fy = selectedFY ? fyToCookieKey(selectedFY) : null;  // e.g. "FY2024"
    const url = '/api/tags/hours-by-taxonomy' + (fy ? `?fy=${encodeURIComponent(fy)}` : '');
    try {
        const res = await fetch(url);
        if (!res.ok) { console.error('[WordCloud] fetch failed', res.status, url); return; }
        const result = await res.json();
        if (!result.success) { console.error('[WordCloud] API error', result.error); return; }
        if (!wordCloudController) {
            wordCloudController = createWordCloud(document.getElementById('wordCloudSection'), {
                title: 'Hours by Area',
                getLinkUrl(item) {
                    if (!item.termGuid) return null;
                    const p = new URLSearchParams({ tag: item.termGuid });
                    if (selectedFY) p.set('fy', fyToCookieKey(selectedFY));
                    return `/sessions.html?${p}`;
                }
            });
        }
        wordCloudController.update(result.data);
    } catch (err) {
        console.error('[WordCloud] error', err);
    }
}

function displayStats(stats) {
    document.getElementById('activeGroupsFY').textContent = stats.activeGroups;
    document.getElementById('sessionsFY').textContent = stats.sessions;
    document.getElementById('volunteersFY').textContent = stats.volunteers;
    const [sy, ey] = stats.financialYear.split('-');
    const fyText = `FY ${sy.slice(2)}/${ey.slice(2)}`;
    document.getElementById('fyLabel').textContent = fyText;
    document.getElementById('fyLabel2').textContent = fyText;
    document.getElementById('fyLabel3').textContent = fyText;
    const fyParam = `fy=${stats.financialYear}`;
    document.getElementById('navGroups').href = `/groups.html?${fyParam}`;
    document.getElementById('navSessions').href = `/sessions.html?${fyParam}`;
    document.getElementById('navVolunteers').href = `/volunteers.html?${fyParam}`;
}

async function loadHistory() {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    try {
        const response = await fetch('/api/stats/history');
        if (!response.ok) throw new Error('Failed to fetch history');
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch history');

        historyData = result.data;

        const storedKey = getStoredFY();
        const thisFY = historyData.find(d => d.label === 'This FY') ?? historyData[historyData.length - 1];
        const storedFY = storedKey !== 'all' ? historyData.find(d => d.financialYear === cookieKeyToFY(storedKey)) : null;
        const initial = storedFY ?? thisFY;
        if (initial) {
            selectedFY = initial.financialYear;
            displayStats(initial);
        }
        renderChart();
        refreshWordCloud();
    } catch (error) {
        console.error('Error loading history:', error);
    } finally {
        btn.classList.remove('spinning');
    }
}

async function refreshData() {
    const btn = document.getElementById('refreshBtn');
    const msg = document.getElementById('refreshMessage');

    try {
        btn.disabled = true;
        btn.classList.add('spinning');
        msg.textContent = 'Clearing cache...';

        const clearResponse = await apiFetch('/api/cache/clear', { method: 'POST' });
        if (!clearResponse.ok) throw new Error('Failed to clear cache');

        msg.textContent = 'Loading fresh data...';
        await loadHistory();

        msg.textContent = 'Data refreshed';
        setTimeout(() => { msg.textContent = ''; }, 3000);
    } catch (error) {
        console.error('Error refreshing data:', error);
        msg.textContent = 'Failed to refresh data';
        msg.style.color = 'var(--error)';
        setTimeout(() => { msg.textContent = ''; msg.style.color = ''; }, 3000);
    } finally {
        btn.disabled = false;
        btn.classList.remove('spinning');
    }
}

function initStatsSection() {
    document.getElementById('statsSection').innerHTML = `
        <div class="fy-chart history-collapsed">
            <div class="cal-toolbar">
                <button class="cal-tb-btn" id="btnShowHistory" onclick="toggleHistory()">Show History</button>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-action" id="refreshBtn" onclick="refreshData()" title="Refresh data">
                        <svg viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0 1 10.3-4.2L11 5h4V1l-1.7 1.7A8 8 0 0 0 0 8h2zm12 0a6 6 0 0 1-10.3 4.2L5 11H1v4l1.7-1.7A8 8 0 0 0 16 8h-2z" fill="currentColor"/></svg>
                    </button>
                    <a class="btn-action" href="/admin.html" title="Admin">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.279 2.152C13.909 2 13.439 2 12.5 2s-1.409 0-1.779.152a2.008 2.008 0 0 0-1.09 1.083c-.094.223-.13.484-.144.863a1.615 1.615 0 0 1-.796 1.353 1.614 1.614 0 0 1-1.579-.008c-.338-.178-.583-.276-.825-.308a2.026 2.026 0 0 0-1.49.396c-.318.242-.553.646-1.022 1.453-.47.807-.704 1.21-.757 1.605-.066.526.078 1.058.403 1.479.149.192.357.353.681.555a1.615 1.615 0 0 1 .001 2.722c-.324.202-.533.363-.681.555a2.02 2.02 0 0 0-.404 1.479c.053.394.287.798.757 1.605.47.807.704 1.21 1.022 1.453a2.026 2.026 0 0 0 1.49.396c.242-.032.487-.13.825-.308a1.615 1.615 0 0 1 1.58-.008c.486.28.774.795.795 1.353.015.38.051.64.144.863.205.49.597.879 1.091 1.083.37.152.84.152 1.779.152s1.409 0 1.779-.152a2.008 2.008 0 0 0 1.09-1.083c.094-.224.13-.484.144-.863a1.615 1.615 0 0 1 .797-1.353 1.614 1.614 0 0 1 1.578.008c.338.178.584.276.826.308a2.026 2.026 0 0 0 1.49-.396c.318-.242.553-.646 1.022-1.453.47-.807.704-1.21.757-1.605a2.02 2.02 0 0 0-.404-1.479 2.2 2.2 0 0 0-.68-.555 1.615 1.615 0 0 1-.001-2.722c.324-.202.532-.363.681-.555a2.02 2.02 0 0 0 .403-1.479c-.052-.394-.287-.798-.757-1.605-.469-.807-.704-1.21-1.022-1.453a2.026 2.026 0 0 0-1.49-.396c-.242.032-.487.13-.825.309a1.614 1.614 0 0 1-1.579.007 1.615 1.615 0 0 1-.796-1.353c-.015-.38-.051-.64-.144-.863a2.007 2.007 0 0 0-1.09-1.083ZM12.5 15c1.67 0 3.023-1.343 3.023-3S14.169 9 12.5 9 9.477 10.343 9.477 12s1.354 3 3.023 3Z"/></svg>
                    </a>
                </div>
            </div>
            <div id="fyAllRows"></div>
        </div>

        <div class="nav-grid">
            <a href="/groups.html" class="nav-card" id="navGroups">
                <div class="label">Groups</div>
                <div class="number" id="activeGroupsFY">-</div>
                <div class="sublabel" id="fyLabel">-</div>
            </a>
            <a href="/sessions.html" class="nav-card" id="navSessions">
                <div class="label">Sessions</div>
                <div class="number" id="sessionsFY">-</div>
                <div class="sublabel" id="fyLabel2">-</div>
            </a>
            <a href="/volunteers.html" class="nav-card" id="navVolunteers">
                <div class="label">Volunteers</div>
                <div class="number" id="volunteersFY">-</div>
                <div class="sublabel" id="fyLabel3">-</div>
            </a>
        </div>

        <div class="refresh-message" id="refreshMessage"></div>
    `;
    loadHistory();
}
