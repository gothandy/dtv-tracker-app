# Technical Debt & Code Quality

Code and architecture items only. Functionality lives in [todo.md](todo.md). Resolved items tracked in [progress.md](progress.md).

---

## Modal HTML Duplication
**Priority**: Medium | **Effort**: Medium

Modal markup (edit group, edit session, create session, edit profile, set hours, bulk records) is duplicated across pages. Each page has its own inline `<style>` for modal styling.

**Options**:
- Extract shared modal CSS to `styles.css` (quick win, reduces style duplication)
- Create a `modal.js` helper that generates modal HTML from a config object (reduces HTML duplication too)

**Affected files**: `group-detail.html`, `groups.html`, `sessions.html`, `session-detail.html`, `profile-detail.html`, `volunteers.html`

---

## FY Calculation Duplication
**Priority**: Low | **Effort**: Low

Financial year logic is implemented in two places:
- Server: `data-layer.ts` → `calculateCurrentFY()`, `calculateFinancialYear()`
- Client: `common.js` → `getFYKey()`

Both implement the same April-March rule. Currently works fine, but a change to FY boundaries would need updating in both places.

**Note**: The duplication is somewhat intentional — the client needs FY logic for display without a round-trip to the server. Not worth solving unless the FY rule changes.

---

## Automated Tests
**Priority**: Medium | **Effort**: High

The `test/` directory contains manual verification scripts (`.js` files that hit the live API). There are no automated unit or integration tests.

**What would benefit most from tests**:
- `data-layer.ts` — FY calculations, session enrichment, validation functions
- `routes/api.ts` — endpoint logic with mocked repositories
- `common.js` — `getFYKey()`, `getCountdown()`, `formatDate()`

**Blockers**: Would need a test framework (Jest/Vitest), mock layer for SharePoint client, and test data fixtures.

---

## Graph API Retry Logic
**Priority**: Low | **Effort**: Medium

`services/sharepoint-client.ts` has no retry logic for transient Graph API failures (429 rate limits, 503 service unavailable). Currently relies on the 5-minute cache to reduce request volume.

**When to address**: If users report intermittent errors in production, especially during high-usage periods.

---

## Permissions Mechanism
**Priority**: Low | **Effort**: Medium?

1. Use Azure Custom Roles. This is the most robust option, all managed in Entra ID with the other roles. However this requires an upgrade to our licence.

2. Use Teams Permissions. If user has Owner access to the Tracker team they are admin, Members have standard access.

3. Use our Profile entries to hold a "Role".

---

## Favicon — Proper SVG Needed
**Priority**: Low | **Effort**: Low

The favicon is currently using `logo.png` (a 500×500 PNG) as a stopgap.

**What to do**:
- Obtain the actual SVG favicon from the DTV website (`/wp-content/themes/dtv-hybrid/assets/images/favicon/favicon.svg`) or create a simple one using the DTV green (`#4FAF4A`)
- Replace `public/img/logo.png` reference in `common.js` with the real `favicon.svg`
- Optionally add `favicon.ico` and `apple-touch-icon.png` for broader browser support

**Affected files**: `public/js/common.js`, `public/img/logo.png`

---

## Eventbrite Sync Logic
**Priority**: Medium | **Effort**: Medium

The Eventbrite sync logic is duplicated and fragile:

1. **Duplicated sync logic**: Attendee processing (profile matching, entry creation, consent record upsert) is implemented in two separate places — `routes/eventbrite.ts` (`runSyncAttendees`) and `routes/entries.ts` (the session Refresh endpoint). Any change or fix needs applying to both, as demonstrated when the consent question ID fix was missed in the refresh path.

2. **Consent question matching is a brittle integration point**: The mapping from Eventbrite question text to SharePoint record types is hardcoded. If Eventbrite changes the question wording on any form, consent records silently stop being created. There is no error or warning when an answer doesn't match.

3. **No sync logging**: Sync runs (scheduled or manual) produce console output only. There's no persistent record of what was created/updated/skipped, making it hard to diagnose issues after the fact. (Also tracked in [todo.md](todo.md) as a planned feature.) Logging should include unmatched Eventbrite questions — i.e. questions that came back in attendee answers but didn't match any entry in the consent map — so that if Eventbrite changes question wording it surfaces immediately rather than silently dropping records.

4. **No error recovery**: If an attendee sync fails partway through (e.g. SharePoint rate limit), there's no retry or partial-success handling. The whole sync attempt fails silently from the caller's perspective.

**Recommended approach**: Extract a shared `syncAttendeeForSession()` function used by both the scheduled sync and the refresh endpoint, so consent mapping and entry creation logic live in one place.

---

## Notes

- Prioritise based on actual pain points, not theoretical concerns
- The codebase is in good shape overall — most items here are polish, not architecture problems

---

*Last Updated: 2026-02-19*
