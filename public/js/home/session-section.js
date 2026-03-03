let allSessions = [];
let currentSelectedKey = null;

function getGlobalNextKey() {
    const todayKey = new Date().toISOString().substring(0, 10);
    let best = null;
    for (const s of allSessions) {
        if (!s.date) continue;
        const key = s.date.substring(0, 10);
        if (key >= todayKey && (!best || key < best)) best = key;
    }
    return best;
}

function getGlobalLastKey() {
    const todayKey = new Date().toISOString().substring(0, 10);
    let best = null;
    for (const s of allSessions) {
        if (!s.date) continue;
        const key = s.date.substring(0, 10);
        if (key < todayKey && (!best || key > best)) best = key;
    }
    return best;
}

function updateCalToolbar(selectedKey) {
    const calVisible = document.getElementById('sessionCalendar').style.display !== 'none';
    document.getElementById('btnNext').classList.toggle('active', selectedKey === getGlobalNextKey());
    document.getElementById('btnLast').classList.toggle('active', selectedKey === getGlobalLastKey());
    document.getElementById('btnShowCal').classList.toggle('active', calVisible);
    document.getElementById('btnShowCal').textContent = calVisible ? 'Hide Calendar' : 'Show Calendar';
}

function jumpToNext() {
    const key = getGlobalNextKey();
    if (key) calendarSelectDate(key);
}

function jumpToLast() {
    const key = getGlobalLastKey();
    if (key) calendarSelectDate(key);
}

function toggleCalendar() {
    const cal = document.getElementById('sessionCalendar');
    cal.style.display = cal.style.display === 'none' ? 'block' : 'none';
    updateCalToolbar(currentSelectedKey);
}

function onCalendarDaySelect(sessions) {
    const card = document.getElementById('nextDigCard');
    renderSessionList(card, sessions, { allSessions });
    card.style.display = 'block';
    currentSelectedKey = sessions && sessions[0] ? sessions[0].date.substring(0, 10) : null;
    updateCalToolbar(currentSelectedKey);
}

async function loadNextDig() {
    try {
        const response = await fetch('/api/sessions');
        if (!response.ok) return;
        const result = await response.json();
        if (!result.success) return;

        allSessions = result.data;
        initCalendar(document.getElementById('sessionCalendar'), allSessions, onCalendarDaySelect);
    } catch (e) {
        // Silently fail — session cards stay hidden
    }
}

function initSessionSection() {
    document.getElementById('sessionSection').innerHTML = `
        <div class="session-section">
            <div class="cal-card">
                <div class="cal-toolbar" id="calToolbar">
                    <button class="cal-tb-btn" id="btnShowCal" onclick="toggleCalendar()">Show Calendar</button>
                    <div class="cal-tb-right">
                        <button class="cal-tb-btn" id="btnNext" onclick="jumpToNext()">Next</button>
                        <button class="cal-tb-btn" id="btnLast" onclick="jumpToLast()">Last</button>
                    </div>
                </div>
                <div id="sessionCalendar" style="display:none;"></div>
            </div>
            <div id="nextDigCard"></div>
            <div id="lastDigCard"></div>
        </div>
    `;
    loadNextDig();
}
