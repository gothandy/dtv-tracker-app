# Technical Debt & Future Optimizations

This document tracks known technical debt, optimization opportunities, and code quality items. Items are prioritised by impact and effort.

## Status Summary

| # | Item | Priority | Status |
|---|------|----------|--------|
| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Caching | - | ✅ Implemented (5-min TTL) |
| 2 | SharePoint-side filtering | - | ✅ Implemented (hybrid) |
| 3 | Power Automate migration | - | ✅ Migrated to Node.js (2026-02-16) |
| 4 | Modal HTML duplication | Medium | Open |
| 5 | FY calculation duplication | Low | Open |
| 6 | Automated tests | Medium | Open |
| 7 | Tag icons duplication | Low | Open |
| 8 | Graph API retry logic | Low | Open |
| 9 | Sync logging | Low | Open |

---

## Resolved Items

### 1. SharePoint Data Caching
**Status**: ✅ Implemented (2026-02-09)

Server-side caching with 5-minute TTL via `node-cache` in `services/sharepoint-client.ts`. Repositories use cache keys and invalidate on writes. Cache stats available at `GET /api/cache/stats`.

### 2. SharePoint-Side Filtering
**Status**: ✅ Implemented (2026-02-08)

Hybrid approach: Sessions filtered at SharePoint by FY field where possible, Entries fetched in full and filtered in Node.js (complex OData OR filters were slower than fetching all). Current approach is simple and performant with the caching layer.

### 3. Power Automate Migration
**Status**: ✅ Migrated (2026-02-16)

All 8 Power Automate Eventbrite sync flows replaced by 4 Node.js API endpoints in `routes/eventbrite.ts`. Scheduled sync via Azure Logic App (Consumption plan) calling `POST /api/eventbrite/event-and-attendee-update` with API key auth. See [docs/power-automate-flows.md](power-automate-flows.md) for full details.

---

## Open Items

### 4. Modal HTML Duplication
**Priority**: Medium
**Effort**: Medium

Modal markup (edit group, edit session, create session, edit profile, set hours) is duplicated across pages. Each page has its own inline `<style>` for modal styling.

**Options**:
- Extract shared modal CSS to `styles.css` (quick win, reduces style duplication)
- Create a `modal.js` helper in `common.js` that generates modal HTML from a config object (reduces HTML duplication too)

**Affected files**: `group-detail.html`, `groups.html`, `sessions.html`, `session-detail.html`, `profile-detail.html`

---

### 5. FY Calculation Duplication
**Priority**: Low
**Effort**: Low

Financial year logic is implemented in two places:
- Server: `data-layer.ts` → `calculateCurrentFY()`, `calculateFinancialYear()`
- Client: `common.js` → `getFYKey()`

Both implement the same April-March rule. Currently works fine, but a change to FY boundaries would need updating in both places.

**Note**: The duplication is somewhat intentional — the client needs FY logic for display without a round-trip to the server. Not worth solving unless the FY rule changes.

---

### 6. Automated Tests
**Priority**: Medium
**Effort**: High

The `test/` directory contains manual verification scripts (`.js` files that hit the live API). There are no automated unit or integration tests.

**What would benefit most from tests**:
- `data-layer.ts` — FY calculations, session enrichment, validation functions
- `routes/api.ts` — endpoint logic with mocked repositories
- `common.js` — `getFYKey()`, `getCountdown()`, `formatDate()`

**Blockers**: Would need a test framework (Jest/Vitest), mock layer for SharePoint client, and test data fixtures.

---

### 7. Tag Icons Duplication
**Priority**: Low
**Effort**: Low

`TAG_ICONS` array defined in `common.js` maps hashtags (#New, #Child, etc.) to emoji icons. The server doesn't validate these — any text is accepted in the Notes field.

Not a real problem since the client controls which tags can be set via the tag buttons. Only relevant if a future API consumer bypasses the UI.

---

### 8. Graph API Retry Logic
**Priority**: Low
**Effort**: Medium

`services/sharepoint-client.ts` has no retry logic for transient Graph API failures (429 rate limits, 503 service unavailable). Currently relies on the 5-minute cache to reduce request volume.

**When to address**: If users report intermittent errors in production, especially during high-usage periods.

---

### 9. Sync Logging
**Priority**: Low
**Effort**: Medium

The Eventbrite sync endpoints return structured results (event counts, new sessions, new profiles, etc.) but there's no persistent log. The Azure Logic App run history provides some visibility, but a SharePoint "Logs" list would allow viewing sync history from within the app.

**Options**:
- SharePoint Logs list with fields: Title (timestamp), Summary (text), Source (Manual/Scheduled)
- Write to Logs list at the end of `event-and-attendee-update` endpoint
- Display on admin page with last sync timestamp

**When to address**: Once the scheduled sync is running reliably and there's a need to audit sync history.

---

## Historical Items (Tested & Rejected)

### Title-Based Entry Filtering
**Status**: ❌ No benefit (tested 2026-02-08)

Investigated using the Title field for date-based filtering of Entries at SharePoint. Performance was 2.7s vs 2.6s baseline (worse). Title field isn't indexed. Current approach (fetch all, filter in Node.js) remains best.

### Add FY Column to Entries List
**Status**: Superseded by caching

Originally proposed adding a `FinancialYearFlow` column to the Entries list for efficient SharePoint-side filtering. With server-side caching now implemented, the fetch-all-and-filter approach is fast enough. The goal is to retire Power Automate flows, not add new ones.

---

## Notes

- Prioritise based on actual pain points, not theoretical concerns
- The codebase is in good shape overall — most items here are polish, not architecture problems
- "Calculated fields over stored fields" principle means legacy SharePoint columns (`HoursLastFY`, `HoursThisFY` on Profiles) should not be relied upon

---

*Last Updated: 2026-02-16*
