let allSessions = [];
let currentSelectedKey = null;

// Personal data — populated after auth for self-service, check-in, and admin (with profile)
let myEntryMap = new Map();      // "YYYY-MM-DD|groupKey" → { checked, hours, id }
let myDates = new Set();         // "YYYY-MM-DD" keys where user has an entry (for calendar)
let regularGroupIds = new Set(); // groupId numbers where user isRegular
let personalised = false;

function shouldPersonalise() {
    const role = window.currentUser && window.currentUser.role;
    const hasProfile = !!(window.currentUser && window.currentUser.profileSlug);
    return role === 'selfservice' || role === 'checkin' || (role === 'admin' && hasProfile);
}

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

function getMyNextKey() {
    if (!personalised || myDates.size === 0) return getGlobalNextKey();
    const todayKey = new Date().toISOString().substring(0, 10);
    let best = null;
    for (const key of myDates) {
        if (key >= todayKey && (!best || key < best)) best = key;
    }
    return best || getGlobalNextKey();
}

function getMyLastKey() {
    if (!personalised || myDates.size === 0) return getGlobalLastKey();
    const todayKey = new Date().toISOString().substring(0, 10);
    let best = null;
    for (const key of myDates) {
        if (key < todayKey && (!best || key > best)) best = key;
    }
    return best || getGlobalLastKey();
}

function updateCalToolbar(selectedKey) {
    const calVisible = document.getElementById('sessionCalendar').style.display !== 'none';
    document.getElementById('btnNext').classList.toggle('active', selectedKey === getMyNextKey());
    document.getElementById('btnLast').classList.toggle('active', selectedKey === getMyLastKey());
    document.getElementById('btnShowCal').classList.toggle('active', calVisible);
    document.getElementById('btnShowCal').textContent = calVisible ? 'Hide Calendar' : 'Show Calendar';
}

function jumpToNext() {
    const key = getMyNextKey();
    if (key) calendarSelectDate(key);
}

function jumpToLast() {
    const key = getMyLastKey();
    if (key) calendarSelectDate(key);
}

function toggleCalendar() {
    const cal = document.getElementById('sessionCalendar');
    cal.style.display = cal.style.display === 'none' ? 'block' : 'none';
    updateCalToolbar(currentSelectedKey);
}

function onCalendarDaySelect(sessions) {
    const card = document.getElementById('nextDigCard');
    renderSessionList(card, sessions, {
        allSessions,
        myEntryMap: personalised ? myEntryMap : null,
        regularGroupIds: personalised ? regularGroupIds : null,
    });
    card.style.display = 'block';
    currentSelectedKey = sessions && sessions[0] ? sessions[0].date.substring(0, 10) : null;
    updateCalToolbar(currentSelectedKey);
}

async function loadPersonalData() {
    if (!shouldPersonalise()) return;
    const slug = window.currentUser && window.currentUser.profileSlug;
    if (!slug) return;
    try {
        const res = await fetch(`/api/profiles/${encodeURIComponent(slug)}`);
        if (!res.ok) { console.error('[Personalise] profile fetch failed', res.status); return; }
        const result = await res.json();
        if (!result.success) return;
        const profile = result.data;

        // Build entry map keyed by "date|groupKey" for card-level matching,
        // and a date-only set for calendar dot rendering
        for (const entry of (profile.entries || [])) {
            const dateKey = entry.date.substring(0, 10);
            const mapKey = `${dateKey}|${entry.groupKey || ''}`;
            myEntryMap.set(mapKey, { checked: entry.checkedIn, hours: entry.hours, id: entry.id });
            myDates.add(dateKey);
        }

        for (const g of (profile.groupHours || [])) {
            if (g.isRegular) regularGroupIds.add(g.groupId);
        }

        personalised = true;
    } catch (e) {
        // Personalisation unavailable — calendar falls back to global view
        console.error('[Personalise] error loading personal data', e);
    }
}

function buildCalendarPersonalData() {
    if (!personalised) return null;
    const regularDates = new Set();
    for (const s of allSessions) {
        if (!s.date || !s.groupId) continue;
        const key = s.date.substring(0, 10);
        if (regularGroupIds.has(s.groupId) && !myDates.has(key)) {
            regularDates.add(key);
        }
    }
    return { myDates, regularDates };
}

function applyPersonalisation() {
    if (!allSessions.length || personalised) return;
    loadPersonalData().then(() => {
        if (!personalised) return;
        initCalendar(
            document.getElementById('sessionCalendar'),
            allSessions,
            onCalendarDaySelect,
            buildCalendarPersonalData()
        );
        // Re-render the currently selected card with personal context
        if (currentSelectedKey) {
            const selectedSessions = allSessions.filter(
                s => s.date && s.date.substring(0, 10) === currentSelectedKey
            );
            if (selectedSessions.length) onCalendarDaySelect(selectedSessions);
        }
    });
}

async function loadNextDig() {
    try {
        const response = await fetch('/api/sessions');
        if (!response.ok) return;
        const result = await response.json();
        if (!result.success) return;

        allSessions = result.data;

        // By the time sessions resolve, auth/me has typically already completed.
        // Load personal data now if currentUser is already available.
        await loadPersonalData();

        initCalendar(
            document.getElementById('sessionCalendar'),
            allSessions,
            onCalendarDaySelect,
            buildCalendarPersonalData()
        );
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
    // Backup: if authReady fires after sessions load (auth slower than sessions), re-apply personalisation
    document.addEventListener('authReady', applyPersonalisation, { once: true });
}
