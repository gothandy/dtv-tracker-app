// Calendar widget for the dashboard homepage.
// Always has one selected date (defaults to the next upcoming session).
// Only session days are clickable. Navigating months never clears the selection.

let _sessionIndex = new Map();
let _year = 0;
let _month = 0;  // 0-indexed
let _selectedKey = null;
let _container = null;
let _onDaySelect = null;
let _myDates = null;        // Set<dateKey> — dates where the user has an entry
let _regularDates = null;   // Set<dateKey> — regular-group sessions the user hasn't joined

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function toDateKey(dateString) {
    return dateString ? dateString.substring(0, 10) : null;
}

function buildSessionIndex(sessions) {
    const index = new Map();
    for (const s of sessions) {
        const key = toDateKey(s.date);
        if (!key) continue;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(s);
    }
    return index;
}

// Returns the date key of the next upcoming session, or the most recent past one as fallback.
function findDefaultKey() {
    const todayKey = toDateKey(new Date().toISOString());
    let nextKey = null;
    let lastKey = null;

    // Prefer the user's own next session if personalised
    if (_myDates && _myDates.size > 0) {
        for (const key of _myDates) {
            if (!_sessionIndex.has(key)) continue;
            if (key >= todayKey) {
                if (!nextKey || key < nextKey) nextKey = key;
            } else {
                if (!lastKey || key > lastKey) lastKey = key;
            }
        }
        if (nextKey) return nextKey;
    }

    // Fall back to global next/last
    for (const key of _sessionIndex.keys()) {
        if (key >= todayKey) {
            if (!nextKey || key < nextKey) nextKey = key;
        } else {
            if (!lastKey || key > lastKey) lastKey = key;
        }
    }
    return nextKey || lastKey || null;
}

function renderCalendar() {
    const todayKey = toDateKey(new Date().toISOString());
    const firstDay = new Date(_year, _month, 1);
    const daysInMonth = new Date(_year, _month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;  // Monday-start

    const pad = n => String(n).padStart(2, '0');

    let html = `
        <div class="cal-widget">
            <div class="cal-header">
                <button class="cal-nav" data-dir="-1">&#8592;</button>
                <span class="cal-title">${MONTH_NAMES[_month]} ${_year}</span>
                <button class="cal-nav" data-dir="1">&#8594;</button>
            </div>
            <div class="cal-grid">`;

    for (const name of DAY_NAMES) {
        html += `<div class="cal-day-name">${name}</div>`;
    }
    for (let i = 0; i < offset; i++) {
        html += `<div class="cal-blank"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${_year}-${pad(_month + 1)}-${pad(d)}`;
        let classes = 'cal-cell';
        if (dateKey === todayKey) classes += ' cal-today';
        if (_sessionIndex.has(dateKey)) classes += ' cal-has-session';
        if (_myDates && _myDates.has(dateKey)) classes += ' cal-my-session';
        else if (_regularDates && _regularDates.has(dateKey)) classes += ' cal-regular-session';
        if (dateKey === _selectedKey) classes += ' cal-selected';
        html += `<div class="${classes}" data-date="${dateKey}">${d}</div>`;
    }

    html += `</div></div>`;
    _container.innerHTML = html;

    _container.querySelector('.cal-nav[data-dir="-1"]')
        .addEventListener('click', () => navigateMonth(-1));
    _container.querySelector('.cal-nav[data-dir="1"]')
        .addEventListener('click', () => navigateMonth(1));

    _container.querySelector('.cal-grid')
        .addEventListener('click', function(e) {
            const cell = e.target.closest('.cal-cell.cal-has-session[data-date]');
            if (!cell) return;
            selectDate(cell.dataset.date);
        });
}

function selectDate(dateKey) {
    if (!_sessionIndex.has(dateKey)) return;
    _selectedKey = dateKey;
    // Navigate to the month containing the selected date if needed
    const [y, m] = dateKey.split('-').map(Number);
    _year = y;
    _month = m - 1;
    renderCalendar();
    _onDaySelect(_sessionIndex.get(dateKey));
}

function navigateMonth(delta) {
    _month += delta;
    if (_month < 0) { _month = 11; _year--; }
    if (_month > 11) { _month = 0; _year++; }
    renderCalendar();
    // Selection and card below are unchanged when navigating
}

// Public: select a date from outside (e.g. toolbar buttons)
function calendarSelectDate(dateKey) {
    selectDate(dateKey);
}

// personalData: optional { myDates: Set<dateKey>, regularDates: Set<dateKey> }
function initCalendar(container, sessions, onDaySelect, personalData) {
    _container = container;
    _onDaySelect = onDaySelect;
    _sessionIndex = buildSessionIndex(sessions);
    _myDates = personalData ? personalData.myDates : null;
    _regularDates = personalData ? personalData.regularDates : null;

    const today = new Date();
    _year = today.getFullYear();
    _month = today.getMonth();

    // Auto-select the next upcoming session (personal if available, else global)
    _selectedKey = findDefaultKey();

    renderCalendar();

    // Fire callback immediately so the card renders on load
    if (_selectedKey) {
        _onDaySelect(_sessionIndex.get(_selectedKey));
    }
}
