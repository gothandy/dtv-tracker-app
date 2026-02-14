# Technical Debt & Future Optimizations

This document tracks known technical debt, optimization opportunities, and code quality items. Items are prioritised by impact and effort.

## Status Summary

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Caching | - | ✅ Implemented (5-min TTL) |
| 2 | SharePoint-side filtering | - | ✅ Implemented (hybrid) |
| 3 | Modal HTML duplication | Medium | Open |
| 4 | FY calculation duplication | Low | Open |
| 5 | Automated tests | Medium | Open |
| 6 | Tag icons duplication | Low | Open |
| 7 | Graph API retry logic | Low | Open |

---

## Resolved Items

### 1. SharePoint Data Caching
**Status**: ✅ Implemented (2026-02-09)

Server-side caching with 5-minute TTL via `node-cache` in `services/sharepoint-client.ts`. Repositories use cache keys and invalidate on writes. Cache stats available at `GET /api/cache/stats`.

### 2. SharePoint-Side Filtering
**Status**: ✅ Implemented (2026-02-08)

Hybrid approach: Sessions filtered at SharePoint by FY field where possible, Entries fetched in full and filtered in Node.js (complex OData OR filters were slower than fetching all). Current approach is simple and performant with the caching layer.

---

## Open Items

### 3. Modal HTML Duplication
**Priority**: Medium
**Effort**: Medium

Modal markup (edit group, edit session, create session, edit profile, set hours) is duplicated across pages. Each page has its own inline `<style>` for modal styling.

**Options**:
- Extract shared modal CSS to `styles.css` (quick win, reduces style duplication)
- Create a `modal.js` helper in `common.js` that generates modal HTML from a config object (reduces HTML duplication too)

**Affected files**: `group-detail.html`, `groups.html`, `sessions.html`, `session-detail.html`, `profile-detail.html`

---

### 4. FY Calculation Duplication
**Priority**: Low
**Effort**: Low

Financial year logic is implemented in two places:
- Server: `data-layer.ts` → `calculateCurrentFY()`, `calculateFinancialYear()`
- Client: `common.js` → `getFYKey()`

Both implement the same April-March rule. Currently works fine, but a change to FY boundaries would need updating in both places.

**Note**: The duplication is somewhat intentional — the client needs FY logic for display without a round-trip to the server. Not worth solving unless the FY rule changes.

---

### 5. Automated Tests
**Priority**: Medium
**Effort**: High

The `test/` directory contains manual verification scripts (`.js` files that hit the live API). There are no automated unit or integration tests.

**What would benefit most from tests**:
- `data-layer.ts` — FY calculations, session enrichment, validation functions
- `routes/api.ts` — endpoint logic with mocked repositories
- `common.js` — `getFYKey()`, `getCountdown()`, `formatDate()`

**Blockers**: Would need a test framework (Jest/Vitest), mock layer for SharePoint client, and test data fixtures.

---

### 6. Tag Icons Duplication
**Priority**: Low
**Effort**: Low

`TAG_ICONS` array defined in `common.js` maps hashtags (#New, #Child, etc.) to emoji icons. The server doesn't validate these — any text is accepted in the Notes field.

Not a real problem since the client controls which tags can be set via the tag buttons. Only relevant if a future API consumer bypasses the UI.

---

### 7. Graph API Retry Logic
**Priority**: Low
**Effort**: Medium

`services/sharepoint-client.ts` has no retry logic for transient Graph API failures (429 rate limits, 503 service unavailable). Currently relies on the 5-minute cache to reduce request volume.

**When to address**: If users report intermittent errors in production, especially during high-usage periods.

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

*Last Updated: 2026-02-14*
