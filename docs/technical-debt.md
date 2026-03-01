# Technical Debt & Code Quality

Code and architecture items only. Functionality lives in [todo.md](todo.md). Resolved items tracked in [progress.md](progress.md).

---

## ~~Inline JavaScript in HTML pages~~ ✓ Resolved 2026-02-27

Extracted all inline `<script>` and `<style>` blocks from the four large HTML pages:
- `profile-detail.html` (~600 lines JS) → `public/js/profile-detail.js`
- `volunteers.html` (~500 lines JS) → `public/js/volunteers.js`
- `session-detail.html` (~400 lines JS) → `public/js/session-detail.js`
- `group-detail.html` (~275 lines JS) → `public/js/group-detail.js`

All page-specific CSS moved to `styles.css` under named section comments. FY bar chart CSS merged into a single shared section. `volunteers.html` body given `class="detail-page"` (removing duplicated body/container overrides). HTML files reduced to ~120 lines each.

---

## Silent Failure Pattern
**Priority**: High | **Effort**: Medium

Errors are routinely swallowed at multiple layers, making bugs invisible to both users and developers. The records filter bug (March 2026) is a clear example: a broken Graph API call returned nothing to the user and logged only to the server console — invisible during browser testing.

**Where it happens:**

*Service layer* — `getColumnChoices` catches all exceptions and returns `[]`. A bad query parameter, a permissions error, or a network failure all produce the same silent empty result. Other service methods follow the same pattern.

*API layer* — endpoints return `{ success: true, data: [] }` when the underlying fetch fails, so the HTTP status is 200 but the data is wrong. The frontend cannot distinguish "no data exists" from "fetch failed".

*Frontend layer* — `if (!res.ok) return;` without logging appears in several fetch handlers. When an API call fails, nothing is shown to the user and nothing is logged to the browser console. The feature simply doesn't work, with no indication why.

**The risk** — this pattern means:
- Bugs can exist undetected for weeks (the records filter broke in the Taxonomy tags commit and was only noticed much later)
- A single change to a shared utility (e.g. adding a Graph API parameter) can silently break an unrelated feature
- Integration tests are the only reliable safety net, but only if they assert on actual data, not just structure

**What to do:**

- Service methods should let errors propagate by default. Catch-and-return-empty should be a deliberate, documented choice for genuinely optional features — not the default.
- API endpoints should return a non-2xx status when a required data fetch fails, so the frontend can distinguish error from empty.
- Frontend fetch handlers should log to console on `!res.ok` at minimum, even if no UI error is shown. Prefer calling `showError()` for user-facing failures.
- When adding `try/catch` to a service method, ask: *does swallowing this error hide a misconfiguration or a broken API call?* If yes, re-throw or log prominently.

**Affected files** (current examples): `services/sharepoint-client.ts` → `getColumnChoices`, `services/taxonomy-client.ts` → `getTermSetIdForColumn`, `routes/profiles.ts` → `/records/options`, `public/js/volunteers.js` → `loadRecordOptions`

---

## Modal HTML Duplication
**Priority**: Medium | **Effort**: Medium

Modal markup (edit group, edit session, create session, edit profile, set hours, bulk records) is duplicated across pages. This is partially addressed by shared modal CSS now in `styles.css`, but the HTML structure is still repeated.

**Options**:
- Create a `modal.js` helper that generates modal HTML from a config object (reduces HTML duplication)

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
**Priority**: Medium | **Effort**: Medium

The `test/` directory contains verification scripts that hit the live SharePoint API directly (no mocks). Run with `npm run test:live` — these require live credentials and are not part of the deployment pipeline.

**Why no mocks** — the records filter bug was introduced by a query parameter change (`?$expand=termColumn`) that mocks would have missed entirely. Integration tests against real SharePoint catch this class of error; unit tests with mocked responses do not.

**What's covered so far**:
- Auth + site connectivity (`test-auth.js`)
- Records list: column choices (Type, Status) and list access (`test-records.js`)

**What still needs coverage** (in priority order):
- `getColumnChoices` for any future lists added to the filter (same failure mode as records)
- Key data contracts: profiles endpoint returns `records[]`, sessions endpoint returns expected fields
- FY calculation correctness in `data-layer.ts` — pure functions, no SharePoint needed, good candidate for unit tests without a framework (just `assert`)

**Guidance**: Every new SharePoint API call added to the service layer should have a corresponding test that asserts on actual returned data, not just structure. Empty arrays passing a `Array.isArray()` check is not a passing test.

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

## `profiles.ts` Route — Too Many Responsibilities
**Priority**: Low | **Effort**: Low

At 836 lines, `profiles.ts` is the largest route file and handles three distinct domains:
- Profile CRUD (create, read, update, delete, transfer/merge)
- Consent records (GET/POST/PATCH/DELETE on `/profiles/:slug/records`)
- Regulars management (GET/POST/DELETE on `/profiles/:slug/regulars`)

Records and regulars each already have their own repository files. Their route logic could be extracted to `records.ts` and folded into the existing `regulars.ts`, making each file smaller and more focused.

**When to address**: When next touching profiles, records, or regulars logic — do the split as part of that work.

---

## CSS: Button Class Duplication
**Priority**: Low | **Effort**: Low

`.btn-action` and `.dropdown-btn` share nearly identical CSS — both are green, `inline-flex`, `min-height: 44px`, same border-radius and font-weight. The only meaningful differences are `dropdown-btn` has `white-space: nowrap` and `btn-action` has `transition: all 0.2s; justify-content: center`.

These could share a base class, reducing the risk of the two diverging over time.

**Affected files**: `public/css/styles.css`

---

## CSS: Green Variable Proliferation
**Priority**: Low | **Effort**: Low

Five green variants exist in `:root`:
```
--green: #4FAF4A
--green-dark: #3d9a3d
--green-light: #eef8ee   (light tinted background)
--green-tint: #e8f5e8    (slightly darker light background)
--green-bg: #f2faf2      (lightest background)
```

`--green-light` and `--green-tint` are visually nearly identical (8 hex steps apart) and both serve as "tinted green background". Worth auditing which elements use each — likely collapsible to two: one for hover/available states, one for selected/active fills.

**Affected files**: `public/css/styles.css`

---

## CSS: Session Tags Naming Inconsistency
**Priority**: Low | **Effort**: Low

The session tags styles (added at the bottom of `styles.css`) use a different naming convention from the rest of the file: `.section-card`, `.tags-header`, `.tag-pills`, `.tag-tree`. The rest of the stylesheet uses patterns like `.session-card`, `.filter-bar`, `.filter-btn`, `.entry-card`.

`.section-card` is a generic container class that overlaps with the card patterns used by `.session-card` and `.cal-card`. No immediate action needed, but if a third component needs a similar card wrapper it would be worth deciding whether there should be a shared `.card` base.

**Affected files**: `public/css/styles.css`

---

## `common.js` Contains Eventbrite-Specific Helpers
**Priority**: Low | **Effort**: Low

`buildEventbriteLink()` and `initEventbriteButtons()` are Eventbrite-specific UI helpers that live in `common.js`. They're only used on `admin.html` and `session-detail.html`. Common.js already covers ~10 distinct concerns (auth, breadcrumbs, FY logic, cookies, error display, DOM helpers). These functions would sit more naturally alongside the Eventbrite sync UI, e.g. in a small `eventbrite-ui.js`.

**Affected files**: `public/js/common.js`

---

## Tag/Metadata Naming Inconsistency
**Priority**: Low | **Effort**: Low

The tagging system uses inconsistent terminology across layers:
- **UI / JS**: "tags" (`session-tags.js`, `renderTagsSection`, `removeTag`, `openAddTagModal`)
- **API response**: `session.metadata` — leaks the SharePoint column name into the public contract
- **Internal / SharePoint**: "Metadata" — the actual SharePoint column name (`SESSION_METADATA`, `updateManagedMetadataField`)
- **Term store**: "taxonomy" / "terms" (`TaxonomyClient`, `getTermSetTree`, `termGuid`)

**Agreed vocabulary** (for future cleanup):
- **Tags** — session/photo taxonomy terms from the Managed Metadata Term Store (`session.metadata` → should be `session.tags`)
- **Hashtags** — entry flags stored as `#New`, `#Child`, `#DofE` etc. in the Entry `Notes` field and rendered as icons (`tag-icons.js`, `.entry-tag` CSS)

The immediate inconsistency is `session.metadata` in `SessionDetailResponse` — the API contract exposes the SharePoint column name. Renaming to `session.tags` would touch `sessions.ts`, `api-responses.ts`, `session-tags.js`, `session-detail.js`/`html`, and the SharePoint schema docs.

**When to address**: When the API contract is being reviewed, or if a second page needs to consume session tags.

---

## Notes

- Prioritise based on actual pain points, not theoretical concerns
- The codebase is in good shape overall — most items here are polish, not architecture problems

---

*Last Updated: 2026-03-01*
