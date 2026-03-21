# Development Progress

## Session: 2026-03-21 (Performance — Stats cache full implementation)

### Completed Tasks

#### Session Stats field — Phase A ✓

Added `Stats` multi-line text field to Sessions SharePoint list. Pre-computes `{ count, hours, media, new, child, regular, eventbrite }` JSON per session.

- **`services/session-stats.ts`** — `computeAndSaveSessionStats()` helper: fetches entries for the session + media count via `getSessionMediaCount()`, computes and writes Stats JSON to SharePoint.
- **`services/sharepoint-client.ts`** — `getSessionMediaCount()`: single lightweight Graph call to get `folder.childCount` for a session's media folder.
- **`routes/sessions.ts`** — `POST /api/sessions/refresh-stats`: bulk nightly refresh, batched in groups of 10, API key auth, returns `{ updated: N, errors: [] }`. Sessions listing (`GET /api/sessions`) reads from Stats field — no `entriesRepository.getAll()` or media count calls.
- **`public/admin.html`** — "Refresh Session Stats" button.
- **`routes/entries.ts`** — targeted `computeAndSaveSessionStats()` call after every entry write/delete, media upload, session refresh, and remove no-shows.

#### Profile Stats field — Phase B ✓

Added `Stats` multi-line text field to Profiles SharePoint list. Pre-computes `{ hoursByFY, sessionsByFY, isMember, cardStatus }` JSON per profile.

- **`services/profile-stats.ts`** — `computeAndSaveProfileStats(profileId)`: fetches entries by profile (indexed Graph call) + records from cache; writes Stats JSON. `runProfileStatsRefresh()`: bulk nightly refresh.
- **`routes/profiles.ts`** — `POST /api/profiles/refresh-stats`: bulk nightly refresh, API key auth. Fire-and-forget `computeAndSaveProfileStats()` after every entry write, record write (consent, membership, card), and profile transfer. Note: volunteers listing (`GET /api/profiles`) was later reverted to always compute live from entries (see 2026-03-21 fix below).
- **`public/admin.html`** — "Refresh Profile Stats" button.
- **`routes/stats.ts`** — `GET /api/stats` and `GET /api/stats/history` now read hours/sessions/activeGroups from session Stats field; volunteer counts from profile Stats field. No entries fetch needed.
- **`routes/eventbrite.ts`** — nightly sync chain extended: Eventbrite sessions → attendees → session stats refresh → profile stats refresh.

#### Recent signups filtered query — Phase C ✓

`GET /api/entries/recent` replaced the full ~5,000-entry scan with a Graph OData filtered query using the `Created` index. Returns only entries created in the last 7 days.

- **`services/repositories/entries-repository.ts`** — `getRecent(cutoff)`: `$filter=fields/Created ge '...'` (requires `Created` index on the Entries list).

#### SharePoint indexes ✓

All critical filtered-query indexes added via List Settings → Indexed Columns:
- Entries `ProfileLookupId` — for `getByProfileId()` (profile detail, targeted stats updates)
- Entries `Created` — for `getRecent()` (recent signups)
- Records `ProfileLookupId` — for `getByProfile()` (consent, targeted stats updates)
- Entries `SessionLookupId` and Entries `Modified` were already in place.

#### Tech-debt resolved ✓

- **Profile Detail Fetches All Lists** — `GET /api/profiles/:slug` now uses `getByProfileId()` (indexed) and `recordsRepository.getByProfile()` instead of `getAll()` on both lists.
- **Filter Logic Duplication** (2026-03-01) — `volunteers.js` filter pipeline extracted into `applyCommonFilters()` and `applyVolunteerFilters()` helpers. Sessions page inline JS (~485 lines) extracted to `public/js/sessions.js`.
- **Silent Failure — `getColumnChoices`** (2026-03-01) — try/catch removed in `services/sharepoint-client.ts`; errors now propagate to route handler. `loadRecordOptions` in `volunteers.js` now logs on `!res.ok`.
- **Silent Failure — `getTermSetIdForColumn`** (2026-03-02) — removed; tag route now reads term set ID directly from `TAXONOMY_TERM_SET_ID` env var.

---

## Session: 2026-03-21 (Volunteers listing group filter fix)

### Completed Tasks

#### Volunteers listing — reverted to live entry computation ✓

- **`routes/profiles.ts`** — `GET /api/profiles` now always fetches entries, sessions, and groups to compute hours. The Stats-based fast path was removed because group + FY filter combinations were inconsistent (particularly FY=all + group returned wrong results). Accuracy over performance for this endpoint.
- **`public/js/volunteers.js`** — Fixed pre-existing bug: when FY filter is "All" and a group is selected, profiles with no participation in that group were not being filtered out. Added `else if (currentGroup)` branch to filter by `hoursAll > 0 || sessionsAll > 0`.

---

## Session: 2026-03-20 (Consent button on entry detail + self-service consent access)

### Completed Tasks

#### Consent button on entry detail ✓

- **`routes/entries.ts`** — `GET /entries/:id` now fetches the volunteer's records and sets `hasPrivacyConsent: true` if there is an Accepted Privacy Consent record. Uses the already-imported `recordsRepository`.
- **`types/api-responses.ts`** — Added `hasPrivacyConsent?: boolean` to `EntryDetailResponse`.
- **`public/entry-detail.html`** — Renders a "Consent" button (checkboxes SVG icon) next to the Upload button in the entry header when `hasPrivacyConsent` is false. Clicking navigates to `/profiles/:slug/consent.html`. Button hidden once consent is signed.
- **`public/css/styles.css`** — Added `.checkin-or-selfservice` CSS class: shown for admin, check-in, and self-service; hidden for read-only and public. Used by the consent button.

#### Self-service consent submission ✓

- **`middleware/require-admin.ts`** — Added `POST /api/profiles/:id/consent` to `SELFSERVICE_ALLOWED_PATTERNS`.
- **`routes/profiles.ts`** — Added ownership check to `POST /profiles/:id/consent`: self-service users can only submit consent for their own profile; returns 403 otherwise.

This enables self-service volunteers to sign their own consent form directly from their entry detail page, paving the way for email-based consent collection.

---

## Session: 2026-03-18 (Homepage personalisation — steps 1 & 2)

### Completed Tasks

#### Personalised homepage calendar ✓

- **`public/js/home/session-section.js`** — after `authReady`, fetches the user's profile (self-service, check-in, admin-with-profile only); builds `myEntryMap` (keyed `date|groupKey`) and `regularGroupIds`; Next/Last buttons prefer the user's own sessions with global fallback; passes personalData to calendar and myEntryMap to session cards. Backup `authReady` listener handles the rare case where auth resolves after sessions load.
- **`public/js/calendar.js`** — accepts optional `personalData` 4th argument (`myDates`, `regularDates` Sets); auto-selects user's next session on init; adds `cal-my-session` (filled dot) and `cal-regular-session` (outline dot) CSS classes to cells.
- **`public/js/session-cards.js`** — accepts `myEntryMap` option; renders "Attended · Nh" (filled pill) or "Registered" (outline pill) below the session title when matched.
- **`public/css/styles.css`** — dot and pill styles; dots switch to white on the selected (green) cell.

Public and read-only users see no change — personalisation is additive and role-gated.

#### Word cloud Show History integration ✓

- **`public/js/home/stats-section.js`** — `fullCloudItems` stores the full sorted set after each fetch; `updateWordCloudDisplay()` slices to top 5 when history is collapsed, passes all items when expanded; `toggleHistory()` calls `updateWordCloudDisplay()` in sync.

Remaining homepage personalisation steps (3–5) added to `docs/todo.md`.

---

## Session: 2026-03-17 (Auth refactor — split routes/auth.ts into per-provider files)

### Completed Tasks

#### Auth route refactor ✓

`routes/auth.ts` (270-line monolith) split into focused per-provider files:

- **`routes/auth/dtv.ts`** — DTV Account (Entra ID / Microsoft) login and callback
- **`routes/auth/google.ts`** — Google OAuth login and callback
- **`routes/auth/facebook.ts`** — Facebook OAuth login and callback
- **`routes/auth/index.ts`** — shared routes: `/logout`, `/providers`, `/me`; mounts the three provider sub-routers
- **`services/personal-auth.ts`** — extracted shared personal account resolution logic (`resolvePersonalSession`): matches OAuth email against Profile.Email, computes `selfservice` role, detects linked DTV Account for `trustedRole`. Used by both Google and Facebook callbacks.

No functional changes; all existing OAuth flows, session structure, and endpoint paths are identical.

**Note — CSRF state regression**: The 2026-03-16 Facebook fix replaced session-based OAuth CSRF state with HMAC-signed stateless tokens (to fix Azure multi-instance failures). The refactor inadvertently reverted this: `routes/auth/facebook.ts` and `routes/auth/google.ts` both use session-based `req.session.oauthState` again. This is tracked in technical-debt.md.

---

## Session: 2026-03-17 (Eventbrite date timezone bug, session date correction, sync concurrency lock)

### Completed Tasks

#### Eventbrite session date timezone bug — investigated and fixed ✓

Root cause: when the Eventbrite sync created sessions, it posted plain date strings (e.g. `"2026-04-22"`) to SharePoint's Date field. SharePoint interpreted these as midnight in the site's London timezone (BST = UTC+1), converting them to UTC the previous day (e.g. `"2026-04-21T23:00:00Z"`). The Title field (plain text) was unaffected and always stored the correct date.

This affected all sessions created on **2026-02-15** (the initial data migration) when the SharePoint timezone was configured as UTC+1. Sessions created later in GMT (Feb 22, Feb 24, Mar 1) were correct because London timezone = UTC in winter. Sessions created during BST going forward would also be affected without the code fix.

**`services/eventbrite-client.ts`** — changed Eventbrite event date source from `e.start?.utc` to `e.start?.local || e.start?.utc`. Uses the event's local calendar date rather than UTC, so events near midnight don't shift.

**`routes/eventbrite.ts`** — `runSyncSessions()`: Date field now stored as `"${dateStr}T12:00:00Z"` (noon UTC) instead of a plain date string. Noon UTC cannot be shifted across a date boundary by any timezone offset, making storage robust regardless of SharePoint's timezone setting.

**`routes/sessions.ts`** — PATCH endpoint: same noon UTC format applied when date is changed via session edit. Also auto-updates the Title field when date changes if the current Title starts with the old date string (e.g. `"2026-04-22 Wed"` → `"2026-04-23 Wed"`).

**`routes/entries.ts`** — Recent Sign-ups (`GET /api/entries/recent`): changed `date: session.Date.substring(0, 10)` to `date: session.Date`. Passing the full ISO datetime string to the browser lets `toLocaleDateString('en-GB')` handle BST conversion correctly, so shifted legacy dates (stored as `"2026-04-21T23:00:00Z"`) display as April 22 in a UK browser.

#### Diagnostic and correction scripts ✓

**`scripts/check-session-dates.js`** — read-only diagnostic: reports sessions where the Title date doesn't match the Date field (in Europe/London timezone), and verifies Wed/Sat/etc sessions fall on the correct day of the week. Confirmed all 56 mismatches were from the 2026-02-15 migration.

**`scripts/fix-session-dates.js`** — one-off correction: updates Date fields to `"${titleDate}T12:00:00Z"` for all sessions where Title date doesn't match stored date. Dry-run by default (`--apply` to commit). Applied to 53 sessions (3 timesheet outliers with deliberately end-of-month dates had already been corrected manually).

#### Eventbrite sync concurrency lock ✓

Added `syncInProgress` boolean flag in `routes/eventbrite.ts`. All three sync endpoints (`event-and-attendee-update`, `sync-sessions`, `sync-attendees`) check the flag on entry and return 409 if a sync is already running. Flag is cleared in `finally` block. Prevents duplicate entries caused by the Azure Logic App retrying a timed-out HTTP request while the first run was still processing.

---

## Session: 2026-03-16 (Security audit — self-service privacy hardening, Facebook PWA login, login redirects)

### Completed Tasks

#### Self-service volunteer data privacy — backend hardening ✓
- `GET /api/profiles/:slug` — added ownership check: self-service users get 403 if the profile ID is not in `req.session.user.profileIds`. Strips `duplicates` and `linkedProfiles` from response for self-service users.
- `GET /api/groups`, `GET /api/groups/:key` — regulars list returned as empty array for self-service/public; `isCurrentUserRegular` flag added to response so the frontend can show "You are a regular" without exposing other volunteers' names.
- `GET /api/tags/hours-by-taxonomy?profile=` — requires authentication; returns 401 without session (prevents enumerating individual volunteer activity via public endpoint).
- `GET /api/media/*` — `name` and `webUrl` fields stripped from unauthenticated responses (these fields embed the uploader's name in the generated filename).
- `middleware/require-admin.ts` — profile slug regex tightened from `/^\/profiles\/[^/]+$/` to `/^\/profiles\/[^/]+-\d+$/` (prevents `/profiles/export` from matching self-service GET allowlist); sessions pattern updated to `/^\/sessions(?!\/export)/` (blocks self-service access to sessions CSV export).

#### Self-service volunteer data privacy — frontend hardening ✓
- Sessions page: CSV download button and session checkboxes are now `.trusted-only` — hidden from Self-Service and Public. Advanced section (tag filter etc.) remains accessible.
- Sessions page JS: checkbox rendering gated on `isTrusted` role check in `sessions.js`.
- Group detail: regulars list hidden for non-trusted; shows "You are a regular volunteer for this group" if `group.isCurrentUserRegular === true`.
- Groups listing: "0 regulars" suppressed (zero count hidden for non-trusted).
- Profile detail: graceful 403 handling with "You don't have permission" message and back link (instead of empty/broken page).
- Added `.trusted-only` CSS class to `styles.css`.

#### Facebook login on Android — full fix (Chrome + PWA standalone) ✓
Root cause: Android's intent filter for the Facebook native app claims `www.facebook.com`, intercepting the OAuth navigation. The callback then lands in the Facebook app's own WebView (a different cookie context), so the session is never visible to Chrome or the PWA.

**`services/facebook-auth.ts`** — changed OAuth base URL from `https://www.facebook.com/v19.0/dialog/oauth` to `https://m.facebook.com/v19.0/dialog/oauth`. The Facebook app's intent filter does not claim `m.facebook.com`, so the OAuth opens in Chrome instead.

**`routes/auth.ts`** — replaced session-based CSRF state (broke on Azure multi-instance and across browser contexts) with HMAC-signed stateless tokens (`SESSION_SECRET` env var). Added `fbcomplete=1` redirect so the callback page can notify the waiting tab via BroadcastChannel before navigating to the destination.

**`public/login.html`** — two-path Facebook click handler:
- *Chrome (non-standalone)*: `window.open()` opens OAuth in a new tab; original login.html stays alive running BroadcastChannel listener + `/auth/me` polling.
- *PWA standalone*: `target="_blank"` on the button forces it into a Chrome Custom Tab (standalone PWAs have no tab concept so `_blank` always opens externally). OAuth completes in Chrome CCT (which shares cookies with the PWA). BroadcastChannel + polling detects session.

Supporting mechanisms: `fbcomplete=1` handler broadcasts auth completion; `pendingFacebookAuth` localStorage item provides a fallback if the page reloads mid-flow; `visibilitychange` listener restarts polling if the page resumes from background without a reload; `reason` param check calls `/auth/me` before showing an error (guards against stale error URLs).

#### Login redirect standardisation ✓
- All login redirects now go to `/login.html` (unified sign-in page):
  - `middleware/require-auth.ts` — page redirect changed from `/auth/login` to `/login.html`
  - `public/session-detail.html` — static `href` and dynamic JS href both updated
  - `public/js/common.js` — `apiFetch` 401 redirect updated

#### `types/api-responses.ts` ✓
- Added `isCurrentUserRegular?: boolean` to `GroupResponse` and `GroupDetailResponse`.

## Session: 2026-03-10 (Sessions CSV download, Eventbrite session name fix)

### Completed Tasks

#### Sessions listing — CSV download of selected sessions ✓
- "Download CSV" button added to the Advanced section alongside "Add Tags"
- Button is disabled until sessions are selected (checkbox mode); enables/disables in sync with Add Tags
- Exports only the selected sessions; columns: Date, Group, Name, Registrations, Hours, New, Children, Regulars, Financial Year
- No authentication required (public-accessible)
- `public/sessions.html` — button added to advanced-row
- `public/js/sessions.js` — `downloadSessionsCSV()` function; `updateBulkTagButton` updated to sync CSV button state

#### Eventbrite session sync — blank Name for group-matched sessions ✓
- New sessions created by `sync-sessions` are no longer given the Eventbrite event name as their display title
- Sessions matched to a group fall back to group name + date, consistent with manually-created sessions
- `routes/eventbrite.ts` — removed `fields.Name = event.name` from `runSyncSessions()`

---

## Session: 2026-03-10 (Profile slug disambiguation, entry detail email, profile page UX)

### Completed Tasks

#### Profile slug now includes SharePoint ID ✓
- Profile URLs changed from `/profiles/gary-downs/` to `/profiles/gary-downs-42/` to prevent name collisions (e.g. two "Gary Downs" profiles)
- `services/data-layer.ts` — added `profileSlug(name, id)` and `profileIdFromSlug(slug)` helpers
- `routes/profiles.ts` — all slug generation uses `profileSlug`; all lookups extract ID from slug and find by `p.ID` (with legacy name-only fallback for old bookmarks)
- `routes/auth.ts` — session `profileSlug` updated to include ID (used for header link and check-in self-edit permission)
- `routes/entries.ts` — `volunteerSlug` generation and entry lookup both use ID-based slug; legacy fallback retained
- `routes/sessions.ts` — `volunteerSlug` generation updated
- `services/data-layer.ts` `groupRegularsByCrewId` — regulars slugs on group detail page updated

#### Entry detail — volunteer email ✓
- Email shown as a `mailto:` link on the entry detail page
- Visible to any authenticated user (`auth-only`); hidden from public visitors
- `types/api-responses.ts` — `volunteerEmail?` added to `EntryDetailResponse`
- `routes/entries.ts` — `volunteerEmail: profile?.Email` populated in response
- `public/entry-detail.html` — email field rendered above Checked In if present

#### Profile detail — bar chart toggle selection ✓
- Chart now loads with no year selected (all entries shown by default)
- Clicking a bar selects that FY; clicking the selected bar again deselects back to all
- `persistFY`/`getStoredFY` no longer used on profile detail (state not persisted across page loads)

#### Profile detail — groups card always visible ✓
- Groups card previously disappeared when a FY was selected and the volunteer had no hours in that year
- Now always shows all groups the volunteer belongs to; hours figure updates for the selected FY (shows 0 if none that year)

#### Profile detail — Transfer / Delete Profile button logic ✓
- Transfer button hidden when profile has no entries (nothing to transfer)
- Delete Profile button shown only when profile has no entries
- Previously both could appear simultaneously

---

## Session: 2026-03-09 (Eventbrite name-clash detection & safer profile matching)

### Completed Tasks

#### Eventbrite sync — name-clash detection ✓
- Two attendees with the same name but different emails now create separate profiles rather than being merged onto one. A `#Duplicate` (red warning) badge is added to the new entry so admins can spot and resolve it using the existing profile transfer function.
- `services/eventbrite-sync.ts` — `findOrCreateProfile()` updated: name match with differing emails creates new profile and returns `clash: true`; name match with no email on the stored profile backfills the email; email is never matched alone (name always required)
- `routes/eventbrite.ts` — destructures `clash`, adds `#Duplicate` to `noteTags`, tracks `duplicateWarnings` count, includes in sync summary string
- `routes/entries.ts` — same `#Duplicate` tag handling for per-session refresh endpoint
- `public/js/tag-icons.js` — `#Duplicate` registered as red `warning.svg` badge ("Duplicate Warning")

---

## Session: 2026-03-09 (Media upload improvements, video support)

### Completed Tasks

#### Upload page — session link on completion ✓
- After successful upload, authenticated users see a "View session gallery" link back to the session detail page
- Public/unauthenticated users do not see the link (photos are `IsPublic: false` until reviewed, so the gallery would appear empty)
- `routes/upload.ts` — `sessionId` and `isAuthenticated` added to `UploadContextResponse`; `resolveCode` returns `sessionId`
- `types/api-responses.ts` — `sessionId` and `isAuthenticated` added to `UploadContextResponse`

#### Upload page — thank-you message copy ✓
- "Thank you for sharing your photos!" → "Thanks for sharing your media! It'll be reviewed by a volunteer coordinator and may be used in our gallery."

#### Media upload — video support ✓
- Upload page now accepts MP4, MOV, M4V in addition to images; 10 MB limit retained (suitable for short-form video)
- `routes/upload.ts` — `video/mp4`, `video/quicktime`, `video/x-m4v` added to `ALLOWED_MIME_TYPES`
- `public/upload.html` — `accept` attribute, hint text, button text, titles updated to reflect media (not photos only)
- `services/media-upload.ts` — `exifDate()` extended to try `CreationDate`/`CreateDate` tags for MP4/MOV container metadata; falls back to upload time if not found

#### Session gallery — native inline video player ✓
- Videos in the session photo strip and cover now open in the lightbox instead of linking out to SharePoint
- `public/js/lightbox.js` — lightbox now renders `<video controls autoplay playsinline>` for video MIME types; pauses video on close/prev/next to prevent audio bleed
- `public/js/session-detail.js` — video carousel items and video cover now call `openLightbox()` like images
- `services/sharepoint-client.ts` — new `getMediaItemDownloadUrl()` method: fetches item metadata (for `IsPublic`) then uses Graph API `/content` endpoint (which returns a 302 redirect to a pre-authenticated stream URL)
- `routes/media.ts` — new `GET /api/media/:itemId/stream` endpoint: validates public access for unauthenticated users, then redirects to the pre-auth stream URL; lightbox uses `/api/media/{id}/stream` as video `src`

---

## Session: 2026-03-06 (Bug fixes, partial public access)

### Completed Tasks

#### Sessions page FY querystring fix ✓
- `sessions.js` was reading `?fy=` directly from `URLSearchParams`, bypassing `getStoredFY()` in `common.js`
- Raw value `2024-2025` was passed to `filterSessions()` which expects `FY2024` format — filter silently did nothing
- Fix: replaced duplicate URL param read with `getStoredFY()`, which already handles format conversion, cookie fallback, and default FY

#### Word cloud randomised order ✓
- `word-cloud.js` `render()` now shuffles items with Fisher-Yates (`.sort(() => Math.random() - 0.5)`) before rendering
- Font size still scales with hours; CSV export order is unaffected (uses `lastItems` pre-shuffle)

#### Homepage heading rename ✓
- "About This System" → "About the DTV Tracker App" in `public/index.html`

#### Partial public access ✓
- Homepage, sessions listing, groups listing, group detail, and session detail pages are now accessible without login
- `middleware/require-auth.ts` — added `PUBLIC_GET_PATHS` whitelist (`/api/stats`, `/api/sessions`, `/api/groups`, `/api/tags`, `/api/media`) before the session check; whitelisted handlers still receive `req.session.user` for conditional data stripping
- `app.js` — added public HTML page routes before `app.use(requireAuth)` for the five public pages; all other pages (volunteers, profiles, entries, admin, add-entry) remain behind auth
- `routes/groups.ts` — both GET handlers check `isAuthenticated`; unauthenticated requests receive `regulars: []` and `regularsCount: 0`
- `routes/sessions.ts` — GET `/:group/:date` strips `entries: []` for unauthenticated requests (registrations/hours totals still returned)
- `public/css/styles.css` — added `.auth-only` / `body[data-role] .auth-only` rule (mirrors existing `.admin-only` pattern)
- `public/js/common.js` — unauthenticated `/auth/me` response now renders a "Log in" button in the header
- `public/js/home/stats-section.js` — volunteers nav card gets `auth-only` class; admin gear button gets `admin-only` class
- `public/js/home/signups-section.js` — changed `apiFetch` → plain `fetch` so a 401 silently hides the section without redirecting to login
- `public/js/session-detail.js` — free parking card and entries section wrapped in `<div class="auth-only">` so they hide for unauthenticated visitors; group detail regulars already hidden when `regulars.length === 0` (no change needed)

---

## Session: 2026-03-01 (Search, bulk tagging, volunteer selection, documentation)

### Completed Tasks

#### Sessions listing — search, advanced filters, cascading dropdowns ✓
- Text search (min 3 chars) across session title and description
- Advanced filter section (toggle) with group and tag dropdowns
- Tag dropdown is a tree-picker widget matching the Add Tag modal style (reuses `session-tags.js` CSS/JS)
- Cascading: group dropdown shows only groups with sessions matching FY + search + active tag; tag dropdown shows only tags in sessions matching FY + search + active group
- Both dropdowns auto-clear their active filter if it becomes unavailable after the other changes
- Tag label format: `"DH > Sheepskull > Top"` displayed as `"DH: Sheepskull: Top"` in the filter button
- URL params persist all filters across page reloads (`?search=`, `?group=`, `?tag=`)

#### Bulk session tagging ✓
- Checkboxes appear on session cards when Advanced is open
- "Select all / Deselect all" link respects current filter results
- "Add Tags (N)" button enabled when ≥1 session selected; label shows count
- Reuses the shared `session-tags.js` tag picker modal; `initSessionTags` extended with `onConfirm` callback for non-session-detail contexts
- `POST /api/sessions/bulk-tag` endpoint: merges tags into each session's existing metadata, deduplicates by `termGuid`
- Sessions reload after bulk tag; selection cleared

#### Volunteer checkbox selection ✓
- Checkboxes appear on volunteer cards when Advanced is open
- "Select all / Deselect all" link respects all active filters (type, hours, records, search)
- "Add Records (N)" and "Download CSV" buttons enabled only when ≥1 selected; both show count
- `openBulkRecords()` applies to selected volunteers (or all filtered if none selected)
- `downloadCSV()` exports `?profileIds=...` for selected volunteers; `/api/profiles/export` extended with `profileIds` query param
- Closing Advanced clears selection

#### Frontend taxonomy cache removed ✓
- `_cachedTaxonomy` removed from `session-tags.js`; taxonomy now fetched fresh on every modal open
- `tagTaxonomy` in `sessions.html` reset on every `loadSessions()` call
- Server-side cache (NodeCache, 5-min TTL) provides the performance; homepage Refresh button now correctly clears the full taxonomy cache end-to-end

#### CSS / style fixes ✓
- `#groupSelect` padding and font-size aligned with `.advanced-row select` (was 0.85rem/0.4rem; now 0.9rem/0.5rem matching all other advanced dropdowns)
- `.select-all-link` font-size raised from 0.85rem to 0.9rem
- Consistent up-arrow character (`&#9652;`) across both sessions and volunteers Advanced toggles

#### Documentation ✓
- CLAUDE.md: updated page and file descriptions; added bulk tagging, volunteer selection, cascading filters, and CSV export to Implemented Features
- technical-debt.md: added filter logic duplication item (volunteers.js ×3, sessions.html ×2) and noted sessions.html inline JS still outstanding
- test-script.md: updated H23 (bulk records now mentions checkbox path), added H30 (bulk tag sessions), updated L2 (volunteer checkboxes), added L3 sessions search, added L19 (sessions advanced filters), updated M5 (sessions listing)
- progress.md: this entry

---

## Session: 2026-02-27 (JS extraction)

### Completed Tasks

#### Extract inline JS/CSS from HTML pages ✓

Resolved the "Inline JavaScript in HTML pages" technical debt item. All four large pages now load their logic from separate `.js` files:

- `profile-detail.html` (839 → 120 lines) → `public/js/profile-detail.js`
- `volunteers.html` (672 → 115 lines) → `public/js/volunteers.js`
- `session-detail.html` (554 → 75 lines) → `public/js/session-detail.js`
- `group-detail.html` (391 → 80 lines) → `public/js/group-detail.js`

Page-specific CSS moved to `styles.css` under named section comments. FY bar chart CSS merged from both `profile-detail` and `group-detail` into a shared `/* === FY Bar Chart === */` section. Scripts loaded at bottom of `<body>` (no `defer`) so global functions remain accessible to inline `onclick` attributes.

---

## Session: 2026-02-27 (Codebase review)

### Completed Tasks

#### Full codebase review — technical debt, architecture, CSS ✓
Comprehensive review of all files now the taxonomy tags, calendar, bar charts, and photo upload features are in place.

**Key findings** (full detail in [technical-debt.md](technical-debt.md)):

- **Inline JS in HTML pages** is the main growing risk: `profile-detail.html`, `volunteers.html`, and `session-detail.html` each have 400–600 lines of inline JS mixing rendering, state, API calls, and business rules. Recently added features (calendar, tags, lightbox) were correctly extracted as separate JS files — the original page logic should follow the same pattern.
- **`profiles.ts`** (836 lines) handles profiles + records + regulars. Could be split when next touched.
- **CSS button duplication**: `.btn-action` and `.dropdown-btn` are near-identical — could share a base.
- **CSS green variables**: Five variants including two nearly identical light-tint backgrounds (`--green-light` / `--green-tint`). Audit and consolidate.
- **Session tags CSS naming** at bottom of `styles.css` uses a different convention from the rest.
- **`common.js` Eventbrite helpers**: `buildEventbriteLink()` / `initEventbriteButtons()` are specific to two pages but live in shared common.js.

**Architecture in good shape**:
- Backend route → repository → sharepoint-client chain is clean and consistent
- `data-layer.ts`, `sharepoint-client.ts`, `field-names.ts`, type system all holding up well
- Cache invalidation strategy (write → clearCache) is correct
- New JS modules (calendar, session-tags, session-cards, lightbox) correctly separated

**New items added to technical-debt.md**:
- Inline JavaScript in HTML pages (highest priority new item)
- `profiles.ts` route over-responsibility
- CSS button class duplication
- CSS green variable proliferation
- CSS session tags naming inconsistency
- `common.js` Eventbrite helpers misplacement

---

#### Persist upload codes to SharePoint ✓
- Added `Code` column to the Entries SharePoint list (single line of text)
- `services/upload-tokens.ts` (in-memory store) removed — no longer needed
- `entries-repository.ts`: `Code` added to `selectFields`; new `getByCode(code)` method queries SP directly (bypasses cache); new `updateCode(entryId, code)` persists to SharePoint
- `POST /entries/:id/upload-code`: reuses existing code if already set; generates and persists a new one otherwise
- `resolveCode` in `upload.ts`: replaced in-memory lookup with `entriesRepository.getByCode()`; expiry now checks session date is within last 7 days (same logic, simpler query scope)
- Codes survive server restarts; volunteers can reuse the same link within the 7-day window

---

## Session: 2026-02-17

### Completed Tasks

#### Role-Based Permissions ✓
- Added Admin and Check In Only roles
- Admin users configured via `ADMIN_USERS` env var (comma-separated emails)
- Role computed at login, stored in session, exposed via `/auth/me`
- Backend: `requireAdmin` middleware blocks writes for non-admin (except allowed Check In Only operations)
- Check In Only allowed: check-in/hours, edit session title/description, edit profiles, manage regulars, add entries, create profiles
- Export endpoints (`/sessions/export`, `/records/export`) blocked for non-admin (GDPR)
- Session edit modal: Group, Date, Eventbrite ID, Delete hidden for non-admin; Title and Description editable by all
- Frontend: CSS-based hiding with `admin-only` class and `body[data-role]` attribute
- Applied across all pages: session-detail, group-detail, profile-detail, entry-detail, volunteers, admin, add-entry
- Designed for future Entra ID app roles migration

---

## Session: 2026-02-06

### Completed Tasks

#### 1. Project Documentation ✓
- Created [claude.md](../claude.md) with comprehensive project context
- Documented all SharePoint lists, relationships, and workflows
- Added development guidelines and security considerations

#### 2. Environment Setup ✓
- Created `.env` file with SharePoint credentials (git-ignored)
- Installed dependencies:
  - `dotenv` for environment variable management
  - `axios` for HTTP requests
  - `express` already installed

#### 3. SharePoint Integration Service ✓
- Created [services/sharepoint.js](../services/sharepoint.js) with:
  - OAuth authentication with Microsoft Entra ID
  - Access token caching with expiry management
  - Generic methods for SharePoint REST API calls
  - Convenience methods for all 5 lists (Groups, Sessions, Profiles, Entries, Regulars)

#### 4. API Endpoints ✓
- Updated [app.js](../app.js) with REST API endpoints:
  - `GET /api/health` - Health check
  - `GET /api/groups` - Fetch all groups/crews
  - `GET /api/sessions` - Fetch all sessions/events
  - `GET /api/profiles` - Fetch all volunteer profiles

#### 5. Testing Infrastructure ✓
- Created [test-auth.js](../test-auth.js) for debugging authentication

### Current Status: BLOCKED

**Issue**: "Unsupported app only token" error when accessing SharePoint

**Root Cause**: The Entra ID app has permissions granted, but the specific SharePoint site doesn't allow app-only access yet.

**What Works**:
- ✓ OAuth token acquisition from Microsoft Entra ID
- ✓ Express server and API endpoints
- ✓ Code structure and service layer

**What Doesn't Work**:
- ✗ Actual SharePoint data retrieval (blocked by site permissions)

### Next Steps

Choose one of these options to proceed:

#### Option A: Grant Site-Level Access (Recommended)
1. Visit: `https://dtvolunteers.sharepoint.com/sites/members/_layouts/15/appinv.aspx`
2. Enter App Id: `267fb092-69c0-48ea-b197-67b79dd4bc92`
3. Click "Lookup"
4. Paste this permission XML:
   ```xml
   <AppPermissionRequests AllowAppOnlyPolicy="true">
     <AppPermissionRequest Scope="http://sharepoint/content/sitecollection" Right="FullControl" />
   </AppPermissionRequests>
   ```
5. Click "Create" then "Trust It"
6. Run `node test-auth.js` to verify it works

#### Option B: Switch to Microsoft Graph API
- Refactor [services/sharepoint.js](services/sharepoint.js) to use Graph API instead
- Graph API handles app-only permissions better
- Would need to use different endpoints and JSON structure

### Configuration Details

**SharePoint Site**: `https://dtvolunteers.sharepoint.com/sites/members`

**Entra ID App Registration**:
- Client ID: `267fb092-69c0-48ea-b197-67b79dd4bc92`
- Tenant ID: `0799305d-07e3-47b2-a19a-62d9931217f6`
- Permissions Granted: `Sites.ReadWrite.All` (Application, Admin Consented ✓)

**SharePoint Lists** (all GUIDs configured in `.env`):
- Groups: `68f9eb4a-1eea-4c1f-88e5-9211cf56e002`
- Sessions: `857fc298-6eba-49ab-99bf-9712ef6b8448`
- Entries: `8a362810-15ea-4210-9ad0-a98196747866`
- Profiles: `f3d3c40c-35cb-4167-8c83-c566edef6f29`
- Regulars: `34b535f1-34ec-4fe6-a887-3b8523e492e1`

### Files Modified/Created

**New Files**:
- `.env` - SharePoint credentials and list GUIDs
- `claude.md` - Project context documentation
- `docs/progress.md` - This file
- `docs/sharepoint-schema.md` - SharePoint list schema documentation
- `services/sharepoint.js` - SharePoint API service
- `test-auth.js` - Authentication test script

**Modified Files**:
- `app.js` - Added API endpoints and SharePoint integration
- `package.json` - Added axios and dotenv dependencies

### Testing Commands

```bash
# Test authentication and API call
node test-auth.js

# Start the server
node app.js

# Test endpoints (once authentication is working)
curl http://localhost:3000/api/health
curl http://localhost:3000/api/groups
curl http://localhost:3000/api/sessions
curl http://localhost:3000/api/profiles
```

### Notes for Next Session

1. **Priority**: Fix the "Unsupported app only token" error by choosing Option A or B above
2. Once SharePoint access works, verify all 5 list endpoints return data
3. Then can start building the frontend UI to display groups/sessions
4. Consider adding error logging and retry logic to the SharePoint service
5. May want to add caching layer for frequently accessed data

---

*Last Updated: 2026-02-06 - End of Session*

---

## Session: 2026-02-08

### Completed Tasks

#### 1. Microsoft Graph API Migration ✓

**Objective**: Resolve "Unsupported app only token" error by migrating from SharePoint REST API to Microsoft Graph API (Option B from previous session).

**Root Cause Identified**:
- The original error was caused by missing Microsoft Graph API permissions
- The app had SharePoint API permissions but not Microsoft Graph API permissions
- Access tokens had no roles/scopes assigned

**Migration Changes**:
- Updated authentication scope from `https://dtvolunteers.sharepoint.com/.default` to `https://graph.microsoft.com/.default`
- Added site ID discovery and caching mechanism (`getSiteId()` method)
- Refactored base `get()` method to use Graph API endpoints
- Implemented `transformGraphResponse()` for backward compatibility with existing response format
- Updated `getListItems()` to use Graph API query patterns (expand fields, filter, orderby)
- Enhanced lookup field selection to include both display values and IDs:
  - Sessions: Added `CrewLookupId`
  - Entries: Added `EventLookupId` and `VolunteerLookupId`
  - Regulars: Added `VolunteerLookupId` and `CrewLookupId`
- Updated [test-auth.js](../test-auth.js) with token inspection and better diagnostics
- Cleaned up debug logging for production code

**Azure Portal Configuration**:
- Removed old SharePoint API permissions (no longer needed)
- Added Microsoft Graph API permission: `Sites.ReadWrite.All` (Application type)
- Granted admin consent for the permission
- Verified permission appears in access token

**Files Modified**:
- [services/sharepoint.js](../services/sharepoint.js) - Complete API migration (~150 lines changed)
- [test-auth.js](../test-auth.js) - Enhanced testing and diagnostics

### Current Status: ✅ WORKING

**What Works**:
- ✓ OAuth token acquisition for Microsoft Graph API
- ✓ Access token includes correct permission: `Sites.ReadWrite.All`
- ✓ Site ID discovery from SharePoint URL
- ✓ All 5 SharePoint list queries (Groups, Sessions, Entries, Profiles, Regulars)
- ✓ Response format transformation (backward compatible with app.js)
- ✓ Lookup field data retrieval (both display value and lookup ID)
- ✓ Query parameters ($filter, $orderby, $select via expand)

**Test Results**:
```
✓ Access token obtained with Sites.ReadWrite.All permission
✓ Site ID: dtvolunteers.sharepoint.com,5d19359b-9b75-484a-adaa-ffe4d4ea12f5,8773ff53-f0bb-4791-8b86-81531dbdfe2d
✓ Retrieved 25 groups
✓ Retrieved 200 sessions with lookup fields working
```

### API Architecture

**Authentication Flow**:
1. Request access token from Microsoft Entra ID
2. Scope: `https://graph.microsoft.com/.default`
3. Token cached with 5-minute expiry buffer

**Site Discovery**:
1. Parse SharePoint site URL
2. Call Graph API: `GET /sites/{hostname}:/{sitePath}`
3. Cache site ID for subsequent requests
4. Fallback to root site if subsite path fails

**List Access Pattern**:
```
GET /sites/{siteId}/lists/{listGuid}/items?expand=fields(select=...)
```

**Response Transformation**:
- Graph format: `{ value: [ { id: "1", fields: { Title: "..." } } ] }`
- Transformed to: `[ { ID: 1, Title: "..." } ]`
- Maintains backward compatibility with Express endpoints

### Next Steps

1. **Test Express API Endpoints**:
   - Start server: `node app.js`
   - Test all endpoints: `/api/health`, `/api/groups`, `/api/sessions`, `/api/profiles`

2. **Add Missing Endpoints**:
   - `GET /api/entries` - Registration/check-in data
   - `GET /api/regulars` - Regular volunteer assignments

3. **Frontend Development**:
   - Build UI to display groups and sessions
   - Create volunteer registration workflow
   - Implement check-in interface

4. **Future Enhancements**:
   - Batch requests for multiple lists
   - Delta queries for change tracking
   - Client-side joins for expanded lookup data
   - Create/Update/Delete operations via Graph API

### Security Notes

**SharePoint List GUIDs**:
- GUIDs are identifiers, not secrets (similar to database table names)
- Security comes from OAuth authentication and permissions, not obscurity
- However, keeping them in `.env` is good practice for:
  - Separation of config from code
  - Easier environment-specific changes
  - Preventing accidental exposure if repo becomes public

**Current Security Posture**:
- ✓ Client credentials stored in `.env` (git-ignored)
- ✓ Access tokens cached in memory only
- ✓ Microsoft Graph API with tenant-level permissions
- ✓ No secrets committed to repository

### Testing Commands

```bash
# Test Microsoft Graph API authentication and data retrieval
node test-auth.js

# Start the Express server
node app.js

# Test Express API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/groups
curl http://localhost:3000/api/sessions
curl http://localhost:3000/api/profiles
```

---

*Last Updated: 2026-02-08 - Microsoft Graph API Migration Complete*

---

#### 2. Groups List Page ✓

**Objective**: Build the first frontend UI page to display volunteer groups (crews).

**Implementation**:
- Created [public/groups.html](../public/groups.html) - Groups list page
  - Responsive card grid layout displaying all 25 groups
  - Shows: Title, Name, Description, Eventbrite Series links
  - Loading states and error handling
  - Clean, professional styling
  - XSS protection with HTML escaping
- Updated [public/index.html](../public/index.html) - Home page
  - Navigation cards for Groups, Sessions, Volunteers
  - About section
  - Professional landing page layout
- Fixed [app.js](../app.js) environment loading order
  - Moved `require('dotenv').config()` before service imports
  - Resolved 401 authentication errors in Express server
  - Removed temporary debug endpoint
- Simplified error logging in [services/sharepoint.js](../services/sharepoint.js)

**Results**:
- ✓ Groups page successfully displays all 25 volunteer crews
- ✓ Express server correctly loads environment variables
- ✓ API endpoint `/api/groups` working reliably
- ✓ Clean, maintainable code ready for extension

**Files Modified**:
- [public/groups.html](../public/groups.html) - New file (250 lines)
- [public/index.html](../public/index.html) - Redesigned (150 lines)
- [app.js](../app.js) - Fixed environment loading order
- [services/sharepoint.js](../services/sharepoint.js) - Simplified error logging

**Testing**:
```bash
# View pages
http://localhost:3000/
http://localhost:3000/groups.html
```

### Current Status: ✅ GROUPS PAGE COMPLETE

**What's Working**:
- ✓ Microsoft Graph API integration (all 5 lists accessible)
- ✓ Groups list page with 25 crews displayed
- ✓ Home page with navigation
- ✓ Express server with reliable API endpoints

**Pushed to GitHub**: 3 commits (Graph API migration + Groups page)

---

*Last Updated: 2026-02-08 - Groups Page Complete*

---

#### 3. Mobile-First Requirements & Reporting Features ✓

**Objective**: Implement mobile-first design principles and build public reporting features (Options 2 + 4).

**Requirements Captured**:
- **Mobile & Field Usage** - Documented in [docs/requirements.md](../docs/requirements.md)
  - Primary use case: On-site outdoor work with limited bandwidth
  - Big simple buttons (minimum 44px touch targets)
  - Server-side processing for aggregations
  - Progressive disclosure pattern (list → detail)
  - High contrast for outdoor visibility

**Implementation**:

**A. Terminology Cleanup (Option 4)**
- Updated all UI references: "Crew" → "Group"
- [public/index.html](../public/index.html) - Navigation and about section
- [public/groups.html](../public/groups.html) - Header and card display
- Removed Name shorthand display (e.g., "Sat" is internal only)
- Added code comments: SharePoint field names (Crew, CrewLookupId) remain unchanged
- Note: Title field displays full name like "Saturday Dig" instead of shorthand

**B. Group Details Page**
- Created [public/group-detail.html](../public/group-detail.html)
- Mobile-first design with large touch targets (52px Eventbrite button)
- Big back button (44px minimum) for easy navigation
- Click through from Groups list via ?id={groupId}
- Displays Title (not internal Name shorthand)
- Prominent Eventbrite link when available

**C. Dashboard Stats (Option 2 - Part 1)**
- Added `/api/stats` endpoint in [app.js](../app.js)
  - Server-side Financial Year calculation (April 1 to March 31)
  - Aggregates: totalGroups, sessionsFY, hoursFY
  - Filters sessions by current FY (FinancialYearFlow field)
  - Returns minimal data (3 numbers + FY label)
- Updated [public/index.html](../public/index.html)
  - Dashboard stats with big numbers (3rem font size)
  - Three stat cards: Groups, Sessions This FY, Hours This FY
  - Mobile-optimized grid layout
  - Fetches data from /api/stats on page load

**D. Sessions Page (Option 2 - Part 2)**
- Created [public/sessions.html](../public/sessions.html)
  - Mobile-first list view with 200 sessions
  - Big filter buttons: "All" vs "This FY" (44px touch targets)
  - Displays: Date, Title, Group name, Hours, Registrations
  - Server-sorted by Date desc (from API)
  - Progressive disclosure - list view only (detail page future)
  - Responsive layout optimized for mobile devices
- Updated home page navigation to link to Sessions

**Files Modified**:
- [docs/requirements.md](../docs/requirements.md) - Added mobile & field usage requirements (NEW)
- [app.js](../app.js) - Added /api/stats endpoint with FY calculation
- [public/index.html](../public/index.html) - Dashboard stats + terminology cleanup
- [public/groups.html](../public/groups.html) - Terminology + clickable cards
- [public/group-detail.html](../public/group-detail.html) - NEW mobile-first detail page
- [public/sessions.html](../public/sessions.html) - NEW mobile-first Sessions list

**Testing**:
```bash
# View all pages
http://localhost:3000/                    # Dashboard with stats
http://localhost:3000/groups.html         # Groups list
http://localhost:3000/group-detail.html?id=1  # Group detail
http://localhost:3000/sessions.html       # Sessions list

# Test API endpoints
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/groups
curl http://localhost:3000/api/sessions
```

### Current Status: ✅ MOBILE-FIRST REPORTING COMPLETE

**What's Working**:
- ✓ Mobile-first requirements documented
- ✓ Terminology cleanup: "Crew" → "Group" throughout UI
- ✓ Group Details page with big buttons and touch targets
- ✓ Dashboard stats with big numbers (Groups, Sessions FY, Hours FY)
- ✓ Sessions page with filter toggle (All vs This FY)
- ✓ Server-side FY calculation and aggregation
- ✓ Progressive disclosure pattern (list → detail)
- ✓ All pages optimized for mobile devices

**Key Technical Decisions**:
- Financial Year calculation: `currentMonth >= 3 ? currentYear : currentYear - 1`
- Uses SharePoint's `FinancialYearFlow` field (auto-populated by Power Automate)
- Server-side filtering/aggregation to minimize bandwidth usage
- Big buttons (44px minimum) for outdoor use with gloves
- High contrast colors (#2c5f2d green) for visibility in bright sunlight

**Pushed to GitHub**: 2 commits
1. Mobile-first requirements + terminology cleanup + Group Details
2. Dashboard stats + Sessions page

---

*Last Updated: 2026-02-08 - Mobile-First Reporting Complete*

---

## Session: 2026-02-08 (Afternoon)

### Completed Tasks

#### 1. Fixed Critical Pagination Bug ✓

**Objective**: Resolve hours calculation discrepancy (67.5 hours vs expected 2826.5 hours)

**Root Cause**: Microsoft Graph API only returns 200 items by default; pagination wasn't implemented

**Solution**:
- Updated [services/sharepoint.js](../services/sharepoint.js) `getListItems()` method to handle pagination
- Added `$top=999` parameter to increase page size
- Implemented loop to follow `@odata.nextLink` until all items retrieved
- Now fetches all items from large lists automatically

**Results**:
- **Before**: 200 sessions, 200 entries, 67.5 hours
- **After**: 517 sessions, 3,242 entries, 2,628.5 hours ✓
- Dashboard now matches SharePoint pivot table perfectly

**Files Modified**:
- [services/sharepoint.js](../services/sharepoint.js) lines 176-230 - Added pagination loop

#### 2. Implemented Hybrid Financial Year Filtering ✓

**Objective**: Use Sessions.FinancialYearFlow field as authoritative source for FY filtering

**Background**:
- `FinancialYearFlow` field is auto-populated by Power Automate (column names ending in "Flow")
- Only recent sessions have this field populated (7 of 517 sessions)
- Older sessions need date-based filtering fallback

**Implementation**:
- Filter entries by joining to Sessions via EventLookupId
- Use Sessions.FinancialYearFlow when populated (preferred)
- Fall back to date-based filtering (April 1 - March 31) when FinancialYearFlow is null
- Entries.FinancialYearFlow field marked for deletion (not maintained)

**Files Modified**:
- [app.js](../app.js) lines 79-126 - Hybrid FY filtering logic
- [docs/sharepoint-refactoring.md](sharepoint-refactoring.md) - Documented FY field usage

#### 3. Added Active Groups Stat to Dashboard ✓

**Objective**: Show count of groups with active sessions in current FY (more meaningful than total groups)

**Implementation**:
- Calculate unique CrewLookupId values from sessions in current FY
- Replace "Total Groups" stat with "Active Groups This FY"
- Shows 14 active groups out of 25 total for FY 2025-2026

**Dashboard Stats**:
- Active Groups: 14 (This FY)
- Sessions: 103 (This FY)
- Hours: 2,628.5 (This FY)

**Files Modified**:
- [app.js](../app.js) lines 133-145 - Active groups calculation
- [public/index.html](../public/index.html) - Updated dashboard UI

#### 4. Documentation & Refactoring ✓

**Documentation Created**:
- [docs/sharepoint-refactoring.md](sharepoint-refactoring.md) - Tracks legacy columns, naming issues, and cleanup tasks

**Schema Updates**:
- [docs/sharepoint-schema.md](sharepoint-schema.md) - Clarified Title vs Name field usage in Groups list
- Added notes about "Flow" suffix convention (Power Automate fields)
- Added pagination requirements and implementation notes

**Code Cleanup**:
- Moved 7 test files to [test/](../test/) folder
- Deleted accidental NUL file
- Updated comments to reflect actual field usage

### Key Learnings Documented

1. **Pagination is Critical**: Always implement pagination when using Microsoft Graph API
   - Default limit: 200-1000 items depending on endpoint
   - Follow `@odata.nextLink` to get all pages
   - Use `$top=999` to reduce number of requests

2. **Power Automate Naming Convention**: Column names ending in "Flow" are auto-populated by Power Automate flows
   - Example: `FinancialYearFlow` in Sessions list

3. **Financial Year Data Model**:
   - Sessions.FinancialYearFlow = Authoritative source (maintained by Power Automate)
   - Entries.FinancialYearFlow = Deprecated (not maintained, delete column)
   - Always join Entries → Sessions to get FY data

4. **Hybrid Filtering Pattern**: When a field isn't fully populated, use a hybrid approach:
   - Prefer the dedicated field when available
   - Fall back to calculated/derived values when null
   - Ensures both new and legacy data are included

5. **Field Name Confusion - Groups List**:
   - `Title` = Shorthand (e.g., "Sat") - used in lookups
   - `Name` = Full name (e.g., "Saturday Dig") - use for UI display
   - Schema documentation was backwards from actual usage

### Current Status: ✅ DASHBOARD STATS WORKING

**What's Working**:
- ✓ Pagination retrieves all 3,242 entries and 517 sessions
- ✓ Dashboard shows accurate FY stats: 14 active groups, 103 sessions, 2,628.5 hours
- ✓ Numbers match SharePoint pivot table exactly
- ✓ Hybrid FY filtering handles both new and legacy data
- ✓ All three dashboard stats are FY-specific and consistent

**Files in This Session**:
- [services/sharepoint.js](../services/sharepoint.js) - Pagination + hybrid filtering
- [app.js](../app.js) - Active groups stat + FY filtering
- [public/index.html](../public/index.html) - Dashboard UI updates
- [docs/sharepoint-schema.md](sharepoint-schema.md) - Field clarifications
- [docs/sharepoint-refactoring.md](sharepoint-refactoring.md) - Cleanup tracking (NEW)

### Next Steps

1. **SharePoint Cleanup**:
   - [ ] Delete FinancialYearFlow column from Entries list
   - [ ] Backfill FinancialYearFlow for all Sessions (or rely on date-based fallback)
   - [ ] Review and update Power Automate flows

2. **Future Enhancements**:
   - [ ] Add volunteers page (currently "Coming soon")
   - [ ] Implement check-in workflow
   - [ ] Add filtering/sorting to Sessions page
   - [ ] Build volunteer hours reports

---

*Last Updated: 2026-02-08 - Dashboard Stats Fixed with Pagination*

---

## Session: 2026-02-09

### Completed Tasks

#### 1. Comment and Documentation Cleanup ✓

Applied three documentation principles across the codebase:
1. Readable code over comments - good naming conventions
2. Comments explain what developers need to know, not what the code does
3. Keep readmes updated on commits

**Changes**:
- Removed redundant JSDoc from all 5 repository files (getAll methods are self-explanatory)
- Fixed stale "Temporarily disabled orderby" comment in sessions-repository.ts to a proper TODO
- Trimmed verbose JSDoc in entries-repository.ts
- Removed redundant CSS comment in index.html
- Added documentation philosophy to CLAUDE.md

#### 2. API TypeScript Conversion ✓

**Objective**: Convert `routes/api.js` to TypeScript with clean domain naming, preventing SharePoint field names from leaking into the HTTP API.

**Architecture Decision**: Thin API layer (HTTP plumbing only), heavy domain/data layer (all business logic, conversions, aggregation). Neither layer handles UI concerns like fallbacks.

**New Files**:
- [types/api-responses.ts](../types/api-responses.ts) - API contract types (GroupResponse, SessionResponse, ProfileResponse, StatsResponse)
- [routes/api.ts](../routes/api.ts) - TypeScript API routes using domain types

**Deleted Files**:
- `routes/api.js` - Replaced by TypeScript version

**Key Changes**:
- All API responses use clean camelCase field names (`displayName`, `groupId`, `financialYear`) instead of SharePoint names (`Name`, `CrewLookupId`, `FinancialYearFlow`)
- No fallback logic in API (e.g., removed `|| 'Untitled Session'`) - UI decides what to show for null values
- Stats calculation (`calculateCurrentFY`, `calculateFYStats`) moved from API route to data-layer.ts
- `app.js` imports from `./dist/routes/api` (compiled TypeScript)
- nodemon config updated to watch `dist/` and `.ts` files

**Field Name Mapping (old → new)**:
| SharePoint | API Response |
|---|---|
| `.ID` | `.id` |
| `.Name` | `.displayName` |
| `.Description` | `.description` |
| `.Date` | `.date` |
| `.CrewLookupId` | `.groupId` |
| `.GroupName` | `.groupName` |
| `.Hours` | `.hours` |
| `.Registrations` | `.registrations` |
| `.FinancialYearFlow` | `.financialYear` |
| `.EventbriteSeriesID` | `.eventbriteSeriesId` |
| `.EventbriteEventID` | `.eventbriteEventId` |

**Frontend Updated**:
- [public/groups.html](../public/groups.html) - Updated all field references
- [public/group-detail.html](../public/group-detail.html) - Updated all field references
- [public/sessions.html](../public/sessions.html) - Updated all field references

#### 3. Documentation Updates ✓

- Updated readme.md: file structure (`api.js` → `api.ts`, added `api-responses.ts`), code style description
- Updated CLAUDE.md: current state, file structure, code style description
- Updated docs/progress.md: this session entry

### Current Status: ✅ API TYPESCRIPT CONVERSION COMPLETE

**Architecture**:
```
SharePoint → Repository → Data Layer (convert/enrich/validate) → API (map to response types) → Frontend
                          (heavy: business logic)                  (thin: HTTP plumbing)
```

**What's Working**:
- ✓ TypeScript API routes with compiler-enforced domain types
- ✓ No SharePoint field names leak into HTTP responses
- ✓ Clean separation: data layer owns business logic, API is thin HTTP adapter
- ✓ All frontend pages updated and working with new field names
- ✓ Dashboard, Groups, Group Detail, and Sessions pages all functional

---

*Last Updated: 2026-02-09 - API TypeScript Conversion Complete*

---

## Session: 2026-02-11

### Completed Tasks

#### 1. Homepage Next Session Card ✓
- Replaced custom `.next-dig-card` with shared `renderSessionList()` from common.js
- Homepage "next session" block now matches the session card style on the sessions page

#### 2. Session Details Check-in Checkboxes ✓
- Added check-in checkboxes to entry cards on the session detail page
- Checkbox sits outside the `<a>` card as a sibling in a `.entry-row` wrapper, so both work independently
- Uses existing `PATCH /api/entries/:id` endpoint with `{ checkedIn: boolean }`
- Checkboxes only shown for the next upcoming session (when countdown is active)
- Past sessions still show check-in state via the green left border but without checkboxes

#### 3. Entry Card UI Refinements ✓
- Hours meta hidden when value is 0
- Tag icons (Child, Regular, New, etc.) now display inline to the right of volunteer name, wrapping only when space is tight

#### 4. Delete Entry ✓
- Added `deleteListItem()` to SharePoint client (Graph API DELETE)
- Added `delete()` to entries repository with cache invalidation
- Added `DELETE /api/entries/:id` endpoint with ID validation
- Added "Delete Entry" button on entry detail page with confirm dialog
- Redirects back to session detail page on success

#### 5. Terminology: "Entry" Over "Registration" ✓
- Updated CLAUDE.md to document that "Entry" is the preferred UI term
- An entry starts as a registration and becomes an attendance record after check-in
- Avoids "registration" or "attendee" labels since the same record serves both purposes

---

*Last Updated: 2026-02-11*

---

## Session: 2026-02-12 to 2026-02-14

### Completed Tasks

#### 1. Profile Detail Page ✓
- Created [public/profile-detail.html](../public/profile-detail.html) with FY filtering
- Shows volunteer stats: sessions attended, hours, per-group breakdown
- Regulars toggle: add/remove volunteer as regular for any group
- Edit profile modal (name, email)
- Delete profile (only if no entries exist)
- Entries list with tag icons, linked to entry edit page
- FY filter (This FY / Last FY / All) changes all displayed stats

#### 2. Session Detail Page Redesign ✓
- Replaced absolute-positioned edit button with title-row button pattern
- Added "Add Regulars" button: bulk-creates entries for all group regulars with `#Regular` tag
- Added "Set Hours" button: applies default hours to all checked-in entries
- Moved entry-action buttons (Regulars, Set Hours, Add) to entries section header
- Added `POST /api/sessions/:group/:date/add-regulars` endpoint
- All actions available regardless of session timing (removed countdown gating)

#### 3. Volunteers Page Redesign ✓
- Replaced filter buttons with dropdown menus (filter + sort)
- Filter dropdown: This FY (default), Last FY, All
- Sort dropdown: A-Z (default), Hours (descending)
- Cards show Sessions and Hours for the selected FY filter
- Added `sessionsLastFY` and `sessionsThisFY` to `ProfileResponse` type
- Updated `GET /api/profiles` to count unique sessions per FY using `Set<number>`

#### 4. Group Filter on Volunteers Page ✓
- Added group dropdown to filter-row (left of search box)
- Added optional `?group=<key>` query param to `GET /api/profiles`
- When group selected, only counts entries for sessions belonging to that group
- Sessions/hours scoped to the selected group
- Groups loaded from `/api/groups` and populated into select

#### 5. Mobile Responsiveness Fixes ✓
- Homepage: `flex-direction: column-reverse` on hours-progress-header so buttons appear above stats
- Groups page: changed grid `minmax(350px, 1fr)` to `minmax(min(350px, 100%), 1fr)`
- Compact header: reduced font sizes for mobile in global styles.css
- Homepage header: `column-reverse` on `.header-top` so user info sits above title
- Group detail: added `.group-title-row` CSS class with `flex-wrap: wrap` on mobile
- Session detail: added `flex-wrap: wrap` on `.entries-header` for mobile
- Global mobile overrides added to [public/css/styles.css](../public/css/styles.css)

#### 6. Entry Detail & Add Entry Pages ✓
- Created [public/entry-detail.html](../public/entry-detail.html) with tag buttons, auto-save fields
- Created [public/add-entry.html](../public/add-entry.html) with volunteer search and create-new modal
- Tag buttons for notes: #New, #Child, #DofE, #DigLead, #FirstAider, #Regular
- Entry edit supports: checked-in toggle, count, hours, notes with hashtags
- Delete entry with confirmation

#### 7. Member Badges & Highlighting ✓
- MEMBER badge on volunteer cards (based on overall member status across both FYs)
- Green card highlighting changes with FY filter (only highlights if 15h met in selected FY)
- At-risk members visible: badge but no highlight = hasn't reached 15h this FY yet

#### 8. Authentication System ✓
- Microsoft Entra ID OAuth flow ([routes/auth.ts](../routes/auth.ts))
- Session-based auth with express-session
- Auth middleware ([middleware/require-auth.ts](../middleware/require-auth.ts)) protects all routes
- User display in header (name + logout link)
- `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/me` endpoints

#### 9. Eventbrite Integration Updates ✓
- Updated Eventbrite logo to official SVG
- Eventbrite links on groups and sessions pages

#### 10. Documentation Review ✓
- Updated CLAUDE.md: current state, implemented features, file structure
- Updated progress.md: this session entry
- Updated readme.md: API endpoints table
- Updated technical-debt.md: current status

### Files Modified
- `types/api-responses.ts` - Added `sessionsLastFY`, `sessionsThisFY` to ProfileResponse
- `routes/api.ts` - Profiles group filter, add-regulars endpoint, session counting
- `public/volunteers.html` - Full redesign with dropdowns, group filter, search
- `public/session-detail.html` - Button row, add regulars, entries header
- `public/profile-detail.html` - New page
- `public/entry-detail.html` - New page
- `public/add-entry.html` - New page
- `public/group-detail.html` - Title row CSS, mobile wrap
- `public/index.html` - Mobile header/progress fixes
- `public/groups.html` - Grid minmax fix
- `public/css/styles.css` - Mobile overrides, compact header
- `public/js/common.js` - Tag icons, breadcrumbs, shared utilities

---

*Last Updated: 2026-02-14*

---

## Session: 2026-02-15 to 2026-02-16

### Completed Tasks

#### 1. CRUD Gaps — Groups and Sessions Delete ✓
- Added `DELETE /api/groups/:key` endpoint in `routes/groups.ts`
- Added `delete()` to `sessions-repository.ts` and `DELETE /api/sessions/:group/:date` endpoint
- Added delete buttons to group-detail.html and session-detail.html edit modals
- Added date field to session edit modal, with redirect on date change

#### 2. Eventbrite Session Sync (Node.js Migration) ✓
- Added `EventbriteEvent` interface and `getOrgEvents()` to `services/eventbrite-client.ts`
  - Fetches all live events from `GET /organizations/{orgId}/events/?status=live&page_size=100`
  - Handles pagination, maps to clean interface: `id`, `seriesId`, `name`, `startDate`, `description`
  - New env var: `EVENTBRITE_ORGANIZATION_ID`
- Added `POST /api/eventbrite/sync-sessions` — matches Eventbrite events to groups via `EventbriteSeriesID`, creates missing sessions
- Added `POST /api/eventbrite/sync-attendees` — fetches attendees for upcoming sessions, creates profiles/entries/consent records
- Added `POST /api/eventbrite/event-and-attendee-update` — combined endpoint running both syncs, returns human-readable summary string
- Added `GET /api/eventbrite/unmatched-events` — lists events with no matching group series
- Refactored sync logic into reusable `runSyncSessions()` and `runSyncAttendees()` helper functions

#### 3. Admin Page ✓
- Added Eventbrite section to `public/admin.html` with 4 buttons:
  - **Run All** — runs sync-sessions → sync-attendees → unmatched-events sequentially
  - **Refresh Events** — calls sync-sessions, shows event/matched/new counts
  - **Fetch New Attendees** — calls sync-attendees, shows session/profile/entry/record counts
  - **Unmatched Events** — displays list of Eventbrite events with no matching group
- Added Exports section with FE Hours Download and Records Download links

#### 4. Cleaned Up eventbriteUrl References ✓
- Removed `eventbriteUrl` from `SessionResponse` and `SessionDetailResponse` in `types/api-responses.ts`
- Removed `eventbriteUrl` from `Session` interface in `types/session.ts`
- Removed `eventbriteUrl` mappings in `routes/sessions.ts` and `routes/groups.ts`
- Removed `eventbriteUrl` rendering in `public/session-detail.html`
- The Tracker SharePoint site doesn't store this column on Sessions

#### 5. API Key Auth for Scheduled Sync ✓
- Added `API_SYNC_KEY` env var support to `middleware/require-auth.ts`
- Requests with `X-Api-Key` header matching `API_SYNC_KEY` bypass session auth for `/api/eventbrite/` paths
- Enables Azure Logic App to call sync endpoints without browser authentication

#### 6. Scheduled Sync Setup (Azure Logic App) ✓
- Designed Azure Logic App (Consumption plan) for daily scheduled sync
- Single HTTP POST to `/api/eventbrite/event-and-attendee-update` with `X-Api-Key` header
- Response `summary` field suitable for email notifications
- Note: Azure App Service Easy Auth must be set to "Allow unauthenticated requests" for API key auth to work

#### 7. Comprehensive Documentation Update ✓
- Updated `readme.md` — full rewrite with all 40+ endpoints, deployment section, env vars, pages table, project structure
- Updated `CLAUDE.md` — current state, file structure, features list, Eventbrite integration details
- Updated `docs/progress.md` — this session entry
- Updated `docs/power-automate-flows.md` — Node.js migration status
- Updated `docs/sharepoint-schema.md` — removed EventbriteUrl, added Records list
- Updated `docs/technical-debt.md` — current status

### Key Technical Decisions
- Homepage refresh button stays as cache clear only — Eventbrite sync is admin/scheduled only
- No group auto-creation from Eventbrite — groups are rare and created manually
- Combined `event-and-attendee-update` endpoint for scheduled use; individual endpoints for admin UI
- Azure Logic App (Consumption) chosen over Power Automate Premium (HTTP connector licensing)
- API key auth chosen for simplicity over Entra ID service-to-service tokens

### Files Modified
- `services/eventbrite-client.ts` — added `EventbriteEvent`, `getOrgEvents()`
- `services/repositories/sessions-repository.ts` — added `delete()`
- `routes/eventbrite.ts` — added 4 new endpoints, refactored to helper functions
- `routes/groups.ts` — added DELETE endpoint, removed eventbriteUrl
- `routes/sessions.ts` — added DELETE endpoint, date to PATCH, removed eventbriteUrl
- `middleware/require-auth.ts` — added API key bypass
- `types/api-responses.ts` — removed eventbriteUrl from session types
- `types/session.ts` — removed eventbriteUrl from Session
- `public/admin.html` — Eventbrite sync buttons, exports, Run All
- `public/group-detail.html` — delete button in edit modal
- `public/session-detail.html` — delete button, date field, removed eventbriteUrl
- `public/index.html` — reverted to cache-clear-only refresh

---

*Last Updated: 2026-02-16*

---

## Session: 2026-02-17

### Completed Tasks

#### 1. SVG Badge & Tag Icons ✓
- Replaced text-based badge pills (MEMBER, CARD, GROUP) with SVG icon images across all pages
- Replaced emoji-based entry tag icons (#Child, #Regular, etc.) with SVG images from `public/svg/`
- Added CSS filter-based coloring: green (default), orange (card invited), red (FirstAider, NoPhoto)
- Icons are hot-swappable — replace the SVG file in `/public/svg/` and the change appears everywhere

#### 2. Tag Icons Configuration File ✓
- Extracted `TAG_ICONS` array, `notesToIcons()`, `renderTagButtons()`, and `tagIconImg()` into `public/js/tag-icons.js`
- Unified config format: `{ icon, alt, tag?, type: "badge"|"tag", color? }`
- Covers both profile badges (member, card, group) and entry tags (child, regular, new, etc.)
- Loaded after `common.js` on all pages that use icons

#### 3. Icon Legend on Admin Page ✓
- Added "Icon Legend" section to admin.html showing all 12 icons with labels
- Dynamically rendered from `TAG_ICONS` array
- Respects color classes (orange for Card Invited, red for FirstAider/NoPhoto)

#### 4. Bulk Add/Update Records ✓
- Added `POST /api/records/bulk` endpoint in `routes/profiles.ts`
- Accepts `{ profileIds, type, status, date }`, performs upsert (update existing record of same type, or create new)
- Added "Add Records" button in volunteers advanced filters section
- Modal with type/status/date dropdowns, filtered volunteer count, confirmation dialog
- Groups excluded from bulk operations

#### 5. Move Session Between Groups ✓
- Added Group dropdown to session edit modal in `session-detail.html`
- Updated `PATCH /api/sessions/:group/:date` to accept `groupId` parameter
- Confirmation warning: "Move this session to [group]? All existing entries will remain attached."
- Smart redirect to new group/date URL after move

#### 6. Comprehensive Manual Test Script ✓
- Created `docs/test-script.md` covering all app functionality
- 26 HIGH priority items (SharePoint write operations)
- 13 MEDIUM priority items (API read operations)
- 15 LOW priority items (UI-only client-side features)

#### 7. Documentation & Development Workflow Update ✓
- Updated CLAUDE.md with strict documentation review rules: always plan first, review all docs after every change, archive outdated docs to `docs/legacy/`
- Updated file structure to include `tag-icons.js`, `svg/`, `test-script.md`, `todo.md`, `legacy/`
- Updated features list with SVG icons, bulk records, session move, test script
- Updated `technical-debt.md` — marked tag icons duplication as resolved
- Updated `todo.md` — marked bulk records as done, annotated tag and group items

### Files Modified
- `public/js/tag-icons.js` — New file (icon config + rendering functions)
- `public/js/common.js` — Removed tag icon code (moved to tag-icons.js)
- `public/css/styles.css` — SVG badge styles, icon color filter classes
- `public/volunteers.html` — SVG badges, bulk records modal + JS
- `public/session-detail.html` — SVG badges, group dropdown in edit modal
- `public/profile-detail.html` — SVG badges, tag-icons.js script
- `public/entry-detail.html` — SVG badges, tag-icons.js script
- `public/add-entry.html` — tag-icons.js script
- `public/admin.html` — Icon legend section, tag-icons.js script
- `routes/profiles.ts` — `POST /api/records/bulk` endpoint
- `routes/sessions.ts` — Group change support in PATCH
- `docs/test-script.md` — New comprehensive test script
- `CLAUDE.md` — Documentation workflow, file structure, features
- `docs/technical-debt.md` — Tag icons resolved
- `docs/todo.md` — Bulk records done, annotations

---

*Last Updated: 2026-02-17*

---

## Session: 2026-02-18

### Completed Tasks

#### 1. Brand Refresh — Website Visual Identity ✓

Applied the visual identity from the new DTV website (deantrailvolunteers.org.uk) to the tracker app in three stages.

**Stage 1: Brand Colours**
- Updated CSS variables to match website palette
- Primary green: `#2c5f2d` → `#4FAF4A` (brighter, vibrant)
- Added `--dark: #0f0e17` (near-black for header/footer)
- Added `--accent: #f00069` (pink, for destructive actions)
- Derived light/tint/bg shades updated to match new green

**Stage 2: Header with Logo**
- Downloaded DTV logo from website → `public/img/logo.png`
- Header background changed from green to dark near-black (`--dark`)
- Logo displayed inline with title (48px on desktop, 36px on mobile, smaller on compact)
- Added Google Fonts import for "Rubik Dirt" display font on header title
- Compact header (detail pages) scales logo and title appropriately

**Stage 3: Design Refinements**
- Border radius reduced from 8px to 6px for tighter look
- Breadcrumb nav bar darkened slightly (#f8f8f8 → #eee)
- Footer styled with dark background matching header (visual bookend)
- Delete button uses brand accent colour (#f00069) instead of generic red

### Files Modified
- `public/css/styles.css` — colour variables, Google Font import, header/footer/nav/delete styles
- `public/js/common.js` — header template with logo image and brand wrapper
- `public/img/logo.png` — New file (downloaded from website)

#### 2. Profile Page Tidy-Up ✓

**Entry card redesign:**
- Single-row layout: Group name (Rubik Dirt font) | Date (green) | Icons | Hours (right)
- On mobile (≤600px), group name wraps to its own line via `flex-basis: 100%`
- Hours moved outside the `<a>` card into an inline `<input type="number">` or plain text

**Inline hours editing:**
- Admin users see editable hours inputs on all profiles
- Check In users see inputs only on their own profile (`/auth/me` profileSlug match)
- Read Only users always see plain text hours
- `onchange` fires `PATCH /api/entries/:id` with `{ hours }`, reverts on failure
- Auth check via `apiFetch('/auth/me')` at page load, awaited before rendering

**Group filter on entries:**
- `<select>` dropdown in the entries filter bar, right-aligned opposite "Entries" heading
- Populated dynamically from the FY-filtered entries
- Options update when FY filter changes; selection preserved across re-renders

**Transfer button restyled:**
- Changed from `btn-action` to `btn-delete` class (red danger styling)

**Favicon links:**
- Added `<link rel="icon">` tags (SVG + ICO fallback) to all 10 HTML pages
- Files already existed (`public/img/favicon.svg`, `public/favicon.ico`) but were never referenced

#### 3. Favicon Fix ✓
- Discovered `favicon.svg`, `favicon.ico`, and `apple-touch-icon.png` were all WordPress 404 HTML pages saved as binary files (fetched from the website and got a 404 response)
- Switched favicon to use `logo.png` (existing 500×500 PNG) as a stopgap
- Updated `common.js` to reference `/img/logo.png` with `type="image/png"` — single source of truth
- Removed redundant static `<link rel="icon">` tags from all 10 HTML pages (they duplicate what common.js injects)
- Added tech debt item to get a proper SVG favicon

### Files Modified
- `public/profile-detail.html` — entry card redesign, inline hours, group filter, transfer button, favicon
- All 10 `public/*.html` files — added favicon link tags

---

*Last Updated: 2026-02-18*

---

## Session: 2026-02-18 (evening)

### Completed Tasks

#### 1. PWA Web Manifest & Add to Home Screen ✓

- Created `public/site.webmanifest` with app name, theme colour (`#4FAF4A`), and icon references
- Generated `public/img/icon-192.png` and `public/img/icon-512.png` from `logo-930.jpg` using PowerShell + System.Drawing (high-quality bicubic scaling, white background, centred)
- Updated `common.js` to inject `<link rel="manifest" href="/site.webmanifest">` alongside the existing favicon link — all pages pick it up automatically
- Chrome on Android will now offer "Add to Home Screen" with the DTV logo

#### 2. Favicon Fixed ✓

- Replaced bogus `favicon.ico` (which was WordPress HTML accidentally saved as a binary) with a real ICO file
- Generated 32x32 PNG from `logo-930.jpg` (PowerShell), then wrapped in ICO container format (Node.js) — modern ICO with embedded PNG, works in all browsers
- Source image for all icons is `public/img/logo-930.jpg` (930x924px) — use this for any future icon sizes

#### 3. Static Assets Served Before Auth ✓

- `public/site.webmanifest`, `/img`, `/css`, `/js`, `/svg`, and `/favicon.ico` are now served **before** `requireAuth` in `app.js`
- Fixes 302 redirect Chrome was getting when fetching the manifest for an unauthenticated "Add to Home Screen" request
- HTML pages still require auth; only assets are public

### Files Modified
- `app.js` — public static asset routes before `requireAuth`
- `public/site.webmanifest` — New file
- `public/favicon.ico` — Replaced with real 32x32 ICO
- `public/img/logo-930.jpg` — New file (source for icon generation)
- `public/img/icon-192.png` — New file (generated)
- `public/img/icon-512.png` — New file (generated)
- `public/js/common.js` — Added manifest link injection

---

## Session: 2026-02-19

### Completed Tasks

#### 1. Eventbrite Consent Record Matching Fix ✓

**Problem**: Consent records were not being created for attendees on Saturday and Tablesale events after forms were added to those events. Wednesday digs had been working fine as the original events with consent forms.

**Root Cause**: The consent question mapping in `routes/eventbrite.ts` used hardcoded Eventbrite question IDs (`315115173`, `315115803`) specific to the Wednesday dig forms. When forms were added to other events, Eventbrite assigned new question IDs (`320634006`, `320634007`), so attendee answers never matched the map and no records were created.

**Secondary Finding**: Attendees who registered before the form was added to an event receive empty answer stubs from the Eventbrite API (answer object present but no `answer` field). The old code would have incorrectly created `Declined` records for these attendees — now guarded with `if (!ans.answer) continue`.

**Fix**: Replaced hardcoded question ID lookup with question text matching:
- `"Personal Data Consent"` → `Privacy Consent`
- `"Photo and Video Consent"` → `Photo Consent`

This works across all events regardless of what question IDs Eventbrite assigns.

**Investigation**: Added `test/test-event-questions.js` to inspect questions and attendee answers for a specific event ID. Confirmed Paul and Joseph Kelly (registered after forms were set up) have `"answer":"accepted"` on both questions; earlier attendees have no answer field.

### Files Modified
- `routes/eventbrite.ts` — question text matching, skip absent answers
- `test/test-event-questions.js` — new diagnostic test script

---

*Last Updated: 2026-02-19*

---

## Session: 2026-02-23

### Completed Tasks

#### 1. Volunteer Photo Upload — Method 3 (Upload Code) ✓

Admins can generate a short 4-letter code from the entry detail page and share it with a volunteer. The volunteer visits `tracker.dtv.org.uk/upload`, enters the code, and uploads photos without needing an account.

**Flow:**
1. Admin opens entry detail page → clicks cloud **link** button (top-right, admin-only)
2. A 4-letter code (e.g. `MXKP`) and shareable URL appear on screen
3. Admin shares via WhatsApp (`/upload/MXKP` pre-fills the code) or reads it aloud
4. Volunteer visits the page, code is validated, volunteer name and session are confirmed
5. Volunteer selects photos and uploads — files land in `{groupKey}/{date}/` in the SharePoint Media Library

**Technical design:**
- Codes are 4 random uppercase letters — 26⁴ = 456,976 combinations
- Held in a module-level `Map<string, number>` (code → entryId) in `services/upload-tokens.ts`
- Expiry computed at validation time: session date + 7 days (not stored)
- Resending a code replaces the previous code for that entry
- Known limitation: codes are lost on server restart — migrate to `UploadCode`/`UploadExpiry` columns on Entries list if this proves problematic
- Express 5 note: optional route params (`/upload/:code?`) not supported — two explicit routes used instead

**New files:**
- `services/upload-tokens.ts` — `generateCode`, `storeCode`, `lookupCode`
- `routes/upload.ts` — `POST /api/upload/validate`, `POST /api/upload/files` (both public, mounted before `requireAuth`)
- `public/upload.html` — standalone public upload page (three-step: code entry → upload → done)

**Modified files:**
- `routes/entries.ts` — added `POST /api/entries/:id/upload-code` (admin only)
- `types/api-responses.ts` — added `UploadCodeResponse`, `UploadContextResponse`
- `app.js` — serves `/upload` and `/upload/:code`; mounts upload API routes before `requireAuth`
- `public/entry-detail.html` — cloud "link" button top-right (admin-only), code panel with copy button
- `docs/media-upload.md` — added Method 3 section
- `CLAUDE.md`, `readme.md`, `docs/permissions.md`, `docs/test-script.md` — updated for this feature

---

*Last Updated: 2026-02-23*

---

## Session: 2026-02-22

### Completed Tasks

#### 1. Media Count Moved to API ✓

**Problem**: Session cards showed "Media: N" by calling a separate `/api/photos/counts` endpoint client-side after the initial render. This caused a two-pass render (cards appear, then counts appear), and — critically — the dashboard (`index.html`) was missing the `attachPhotoCounts` call entirely so media counts never appeared there. On the sessions listing page, all sessions (hundreds) were being sent as one giant comma-separated URL, which was wasteful and close to URL length limits.

**Fix**: Moved photo count fetching into the sessions and group detail API endpoints server-side.
- `GET /api/sessions` and `GET /api/groups/:key` now call `listGroupDateCounts` for each unique group and attach `mediaCount` to each `SessionResponse`
- Added `mediaCount?: number` to `SessionResponse` in `types/api-responses.ts`
- Removed `attachPhotoCounts()` function from `session-cards.js` entirely
- Removed two-pass render calls from `sessions.html`, `group-detail.html`
- `index.html` gets counts automatically (no code change needed)
- `listGroupDateCounts` in `sharepoint-client.ts` is now cached with `media-counts-${groupKey}` key

#### 2. Consistent Cache Invalidation on All Writes ✓

**Problem**: Repository write methods only cleared their own specific cache key (e.g. `entriesRepository` cleared `'entries'` but not `'sessions_FY*'` derived keys). Several write operations had no cache clearing at all: Eventbrite sync endpoints, the session `refresh` endpoint, all record endpoints in `routes/profiles.ts`.

**Fix**: Replaced all targeted `cache.del('key')` calls in repository write methods with `clearCache()` (full flush). Any write now clears all cached data immediately.

- All 6 repositories updated: `sessions`, `entries`, `groups`, `profiles`, `records`, `regulars`
- `routes/profiles.ts` transfer endpoint: consolidated three separate `cache.del` calls into one `clearCache()`
- `routes/photos.ts` upload: added `clearCache()` so media count updates are visible immediately after upload

**Effect**: No more "wait 5 minutes" stale data after any create/update/delete operation.

### Files Modified
- `types/api-responses.ts` — added `mediaCount?: number` to `SessionResponse`
- `services/sharepoint-client.ts` — `listGroupDateCounts` now cached (`media-counts-${groupKey}`)
- `routes/sessions.ts` — attaches `mediaCount` to session responses; imports `sharePointClient`
- `routes/groups.ts` — attaches `mediaCount` to group detail session responses; imports `sharePointClient`
- `public/js/session-cards.js` — renamed `photoCount` → `mediaCount`, removed `attachPhotoCounts` function
- `public/sessions.html` — removed two-pass render
- `public/group-detail.html` — removed two-pass render
- `services/repositories/sessions-repository.ts` — `clearCache()` on writes
- `services/repositories/entries-repository.ts` — `clearCache()` on writes
- `services/repositories/groups-repository.ts` — `clearCache()` on writes
- `services/repositories/profiles-repository.ts` — `clearCache()` on writes
- `services/repositories/records-repository.ts` — `clearCache()` on writes
- `services/repositories/regulars-repository.ts` — `clearCache()` on writes
- `routes/profiles.ts` — consolidated cache clearing in transfer endpoint
- `routes/photos.ts` — added `clearCache()` after successful upload

---

*Last Updated: 2026-02-22*
