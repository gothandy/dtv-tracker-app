let historyData = [];
let selectedFY = null;
let wordCloudController = null;
let fullCloudItems = [];   // Full tag-hours data from last fetch

const CLOUD_DEFAULT_LIMIT = 7;  // Items shown when history is collapsed

function isHistoryExpanded() {
    const chart = document.querySelector('.fy-chart');
    return chart && !chart.classList.contains('history-collapsed');
}

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
    updateWordCloudDisplay();
}

function updateWordCloudDisplay() {
    if (!wordCloudController || !fullCloudItems.length) return;
    const expanded = isHistoryExpanded();
    const items = expanded ? fullCloudItems : fullCloudItems.slice(0, CLOUD_DEFAULT_LIMIT);
    wordCloudController.update(items, { maxSize: expanded ? 2.4 : 1.4 });
    wordCloudController.setCsvVisible(expanded);
}

function fyToCookieKey(fy) { return 'FY' + fy.split('-')[0]; }
function cookieKeyToFY(key) { const y = parseInt(key.replace('FY', '')); return `${y}-${y + 1}`; }

function selectFY(fy) {
    const prevFY = selectedFY;
    selectedFY = fy;
    persistFY(fyToCookieKey(fy));
    const chart = document.querySelector('.fy-chart');
    if (chart && chart.classList.contains('history-collapsed')) toggleHistory();
    else if (chart && fy === prevFY) { toggleHistory(); return; }
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
                embedded: true,
                getLinkUrl(item) {
                    if (!item.termGuid) return null;
                    const p = new URLSearchParams({ tag: item.termGuid });
                    if (selectedFY) p.set('fy', selectedFY);
                    return `/sessions.html?${p}`;
                }
            });
        }
        // Store sorted by hours desc so slice(0, N) always gives the top N
        fullCloudItems = [...result.data].sort((a, b) => b.hours - a.hours);
        updateWordCloudDisplay();
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
                        <img src="/svg/refresh.svg" style="width:1.2em;height:1.2em;filter:brightness(0) invert(1);vertical-align:middle;" alt="Refresh">
                    </button>
                    <a class="btn-action admin-only" href="/admin.html" title="Admin">
                        <img src="/svg/settings.svg" style="width:1.2em;height:1.2em;filter:brightness(0) invert(1);vertical-align:middle;" alt="Admin">
                    </a>
                </div>
            </div>
            <div id="fyAllRows"></div>
            <div id="wordCloudSection"></div>
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
            <a href="/volunteers.html" class="nav-card auth-link" id="navVolunteers">
                <div class="label">Volunteers</div>
                <div class="number" id="volunteersFY">-</div>
                <div class="sublabel" id="fyLabel3">-</div>
            </a>
        </div>

        <div class="refresh-message" id="refreshMessage"></div>
    `;
    loadHistory();
}
