# DTV Tracker — Manual Test Script

Run with `npm run dev` at http://localhost:3000. Log in via Microsoft Entra ID.

**Priority key:**
- **HIGH** — Writes to SharePoint (creates, updates, deletes data)
- **MEDIUM** — Reads from APIs (SharePoint, Eventbrite)
- **LOW** — UI-only (client-side filtering, styling, navigation)

---

## HIGH PRIORITY — Write Operations

### H1. Authentication & Permissions

- [ ] Unauthenticated visit to `/` (homepage) loads without redirect — stats, sessions, groups nav cards visible; volunteers nav card hidden; admin button hidden; header shows "Log in" button
- [ ] Unauthenticated visit to `/sessions.html` loads without redirect
- [ ] Unauthenticated visit to `/groups.html` loads without redirect; regulars count shows 0
- [ ] Unauthenticated visit to `/groups/:key/detail.html` loads without redirect; regulars section hidden
- [ ] Unauthenticated visit to `/sessions/:group/:date/details.html` loads; entries section and free parking card hidden
- [ ] Unauthenticated visit to `/volunteers.html` redirects to `/login.html`
- [ ] Unauthenticated visit to `/profiles/:slug/details.html` redirects to `/login.html`
- [ ] Unauthenticated `GET /api/entries/recent` returns 401
- [ ] Unauthenticated visit to `/` does not trigger a `GET /api/entries/recent` request (check Network tab — recent sign-ups section should not be fetched)
- [ ] Unauthenticated API 401 response (from `apiFetch` in common.js) redirects to `/login.html?returnTo=...` not `/auth/login`
- [ ] `/login.html` shows Volunteer Sign In (magic link) and DTV Teams Account (Microsoft) cards; Volunteer card only shown when `MAIL_SENDER` is configured
- [ ] Enter email, click "Send sign-in link" → both cards hide, sent-confirmation section appears with 15:00 countdown
- [ ] Countdown ticks down to 00:00 then stops
- [ ] Click "Didn't receive the link? Back to Login" → cards restored, countdown stopped, form re-enabled
- [ ] Click magic link in email → signed in, redirected to destination (or `/` if no returnTo)
- [ ] Click expired magic link (wait >15min) → redirected to `/login.html?reason=invalid-state`
- [ ] Email not in Profiles → redirected to `/login.html?reason=not-approved` with warning banner
- [ ] Successful Microsoft login redirects back to `/` (or originally requested page via `returnTo`)
- [ ] Click Logout — session cleared, redirected to Microsoft logout
- [ ] API key auth: `POST /api/eventbrite/nightly-update` with valid `X-Api-Key` succeeds without session
- [ ] Invalid/missing API key returns 401
- [ ] API key only works for `/api/eventbrite/` paths — rejected on other endpoints
- [ ] **Admin user** (in `ADMIN_USERS` env var): all edit/create/delete buttons visible, all API calls succeed
- [ ] **Check In user** (profile has matching `User` field): admin buttons hidden, check-in controls visible
- [ ] Check In: check-in checkbox on session detail works (PATCH `/api/entries/:id`)
- [ ] Check In: Set Hours button on session detail works
- [ ] Check In: session edit modal shows only Display Name and Description (Group, Date, Eventbrite ID, Delete hidden)
- [ ] Check In: saving session edit with title/description works (PATCH succeeds)
- [ ] Check In: regulars checkbox on profile detail works (add/remove)
- [ ] Check In: Refresh button visible on session detail, can refresh session
- [ ] Check In: Add Entry link visible on session detail, can add entry for existing volunteer
- [ ] Check In: can create new profile from add-entry page ("+ Add New" button)
- [ ] Check In: edit profile button visible, can update name/email
- [ ] Check In: Upload button on entry detail visible and functional (navigates to `/upload.html?entryId=:id`)
- [ ] Check In: Add Record, Transfer, Delete still hidden on profile page
- [ ] Check In: `POST /api/profiles/:slug/records` returns 403
- [ ] Check In: `POST /api/groups` returns 403
- [ ] **Read Only user** (no matching profile `User` field, not in `ADMIN_USERS`): all action buttons hidden
- [ ] Read Only: session detail — edit, refresh, set hours, add entry buttons all hidden
- [ ] Read Only: session detail — check-in checkboxes visible but disabled (greyed out, not clickable)
- [ ] Read Only: entry detail — checked in and hours controls visible but disabled
- [ ] Read Only: profile detail — edit button hidden, regular checkboxes disabled
- [ ] Read Only: any POST/PATCH/DELETE API call returns 403 "Read only access"
- [ ] Read Only: `GET /api/sessions/export` returns 403 (GDPR — trusted only)
- [ ] Check In Only: `DELETE /api/sessions/:group/:date` returns 403
- [ ] Check In Only: `GET /api/sessions/export` returns 403 (GDPR)
- [ ] Check In Only: admin page shows only Icon Legend section
- [ ] `/auth/me` returns `role: "admin"` or `role: "checkin"` based on env var
- [ ] **Self-Service user** (profile has matching `Email` field, Google/Facebook login): no admin/check-in/edit controls visible
- [ ] Self-Service: sessions page loads; CSV download button and session checkboxes **not shown** (trusted-only)
- [ ] Self-Service: Advanced section on sessions page still functional (tag filter, group filter work)
- [ ] Self-Service: groups page shows zero regulars count; group detail page shows **no regulars list**
- [ ] Self-Service: group detail shows "You are a regular volunteer for this group" message if applicable
- [ ] Self-Service: visiting own profile detail page loads and shows own data
- [ ] Self-Service: visiting another volunteer's profile — API returns 403; page shows "You don't have permission to view this profile" with back link (not a blank error)
- [ ] Self-Service: volunteers listing page is blocked — API returns 403 (not 200 with empty list)
- [ ] Self-Service: `GET /api/profiles` (volunteers list endpoint) returns 403
- [ ] Self-Service: `GET /api/sessions/export` returns 403
- [ ] Self-Service: `GET /api/records/export` returns 403
- [ ] Self-Service: `GET /api/tags/hours-by-taxonomy?profile=some-name` returns 401 (auth required for profile param)
- [ ] Self-Service: `GET /api/tags/hours-by-taxonomy` (no profile param) returns 200 — tag stats are public
- [ ] Self-Service: own profile response does **not** include `duplicates` or `linkedProfiles` fields
- [ ] Self-Service: can register for a future session (POST to `/api/sessions/:group/:date/entries` with own profileId)
- [ ] Self-Service: registering for a session that already has their entry returns 409 (duplicate prevention)
- [ ] Self-Service: cannot register another volunteer — `POST /api/sessions/.../entries` with a different profileId returns 403
- [ ] Self-Service: can delete own entry; attempting to delete another volunteer's entry returns 403
- [ ] Self-Service: Upload button visible on own entry detail; can upload photos
- [ ] **Public API security — media PII**: `GET /api/media?sessionId=X` response does **not** contain `name` or `webUrl` fields (these embed uploader's name in the filename)
- [ ] **Public API security — media PII**: authenticated `GET /api/media?sessionId=X` response **does** include `name` and `webUrl`
- [ ] **PWA standalone Facebook login** (Android, installed PWA from home screen): tapping "Continue with Facebook" opens a Chrome Custom Tab (not the native Facebook app); after completing Facebook login the PWA navigates to the dashboard without stalling

### H2. Create group
- [ ] Groups page → "+" button → modal with Key (required), Display Name, Description
- [ ] Missing key shows validation error
- [ ] `POST /api/groups` — `{ key, name?, description? }`
- [ ] Redirects to new group detail page

### H3. Edit group
- [ ] Group detail → pencil icon → modal with Display Name, Description, Eventbrite Series ID
- [ ] `PATCH /api/groups/:key` — `{ displayName?, description?, eventbriteSeriesId? }`
- [ ] Page reloads with updated values

### H4. Delete group
- [ ] Group detail → edit modal → Delete button → confirmation dialog
- [ ] `DELETE /api/groups/:key`
- [ ] Redirects to groups listing

### H5. Create session
- [ ] Group detail or sessions page → "New Session" button → modal with Group, Date (required), Name, Description
- [ ] `POST /api/sessions` — `{ groupId, date, name?, description? }`
- [ ] Redirects to session detail / appears in list

### H6. Edit session
- [ ] Session detail → pencil icon → modal with Group dropdown, Date, Display Name, Description, Eventbrite Event ID
- [ ] Group dropdown pre-selects current group
- [ ] `PATCH /api/sessions/:group/:date` — `{ displayName?, description?, eventbriteEventId?, date?, groupId? }`
- [ ] Changing date redirects to new URL
- [ ] Changing date on a session whose Title matches the auto-generated format (`YYYY-MM-DD GroupKey`) — Title is automatically updated to the new date; verify in SharePoint
- [ ] Changing group shows confirmation: "Move this session to [group]? All existing entries will remain attached."
- [ ] Changing group redirects to new group/date URL
- [ ] Changing both group and date redirects correctly

### H7. Delete session
- [ ] Session detail → edit modal → Delete button → confirmation
- [ ] `DELETE /api/sessions/:group/:date`
- [ ] Redirects to sessions listing

### H8. Create entry (register volunteer)
- [ ] Add entry page → search volunteer → select → add notes/tags → "Create Entry"
- [ ] `POST /api/sessions/:group/:date/entries` — `{ profileId, notes? }`
- [ ] Redirects to session detail

### H9. Check-in toggle
- [ ] Session detail → toggle entry checkbox
- [ ] `PATCH /api/entries/:id` — `{ checkedIn: true/false }`
- [ ] Visual checkmark updates immediately

### H9a. Entry card icons
- [ ] Volunteer with an accompanying adult set on their entry → Child icon shown in session entry list
- [ ] Volunteer with no accompanying adult → no Child icon
- [ ] Volunteer whose profile has any computed warnings (e.g. Possible Duplicate, No Consent) → Profile Warning badge shown in session entry list
- [ ] Volunteer with no profile warnings → no Profile Warning badge
- [ ] Profile Warning badge does **not** appear on entries when viewing a profile's session history (filtered out as a badge type)

### H10. Edit entry (live save)
- [ ] Entry detail → change Checked In, Count, Hours, Notes
- [ ] `PATCH /api/entries/:id` — `{ checkedIn?, count?, hours?, notes? }`
- [ ] Green flash on success, red on error
- [ ] Notes debounced 500ms
- [ ] Tag buttons toggle hashtags in notes, trigger auto-save

### H11. Delete entry
- [ ] Entry detail → red Delete button → confirmation
- [ ] `DELETE /api/entries/:id`
- [ ] Redirects to session detail or profile

### H12. Set default hours (bulk)
- [ ] Session detail → "Set Hours" button → modal with hours input (default 3)
- [ ] Applies to checked-in entries where hours = 0
- [ ] Multiple `PATCH /api/entries/:id` calls in parallel
- [ ] Does not overwrite entries with existing hours

### H13. Refresh session (bulk)
- [ ] Session detail → "Refresh" button
- [ ] `POST /api/sessions/:group/:date/refresh`
- [ ] Adds missing regulars, syncs Eventbrite attendees (with `EventbriteAttendeeID`), tags #NoPhoto
- [ ] Shows summary: "Added: X regulars, Y from Eventbrite, Z new profiles, W #NoPhoto"

### H14. Create volunteer
- [ ] Add entry page → "Add New" button → modal with Name (required), Email
- [ ] `POST /api/profiles` — `{ name, email? }`
- [ ] Profile created and selected for entry creation

### H15. Edit profile
- [ ] Profile detail → pencil icon → modal with Name, Email, Match Name, Username (admin-only), Is Group
- [ ] `PATCH /api/profiles/:slug` — `{ name?, email?, matchName?, user?, isGroup? }`
- [ ] Username field hidden for Check In Only users
- [ ] Username value persists after save and reload

### H16. Delete profile
- [ ] Profile detail → Delete button (only shown if profile has no entries)
- [ ] Transfer button hidden when profile has no entries
- [ ] `DELETE /api/profiles/:slug`
- [ ] Redirects to volunteers listing

### H17. Transfer profile
- [ ] Profile detail → "Transfer" button → only visible when profile has entries
- [ ] Search target → select → confirm
- [ ] `POST /api/profiles/:slug/transfer` — `{ targetProfileId, deleteAfter? }`
- [ ] Entries, regulars, records transferred. Duplicates skipped.
- [ ] Redirects to target profile (new ID-appended slug)

### H18. Inline hours editing (profile detail)
- [ ] Admin: hours input shown on all profiles, change value → `PATCH /api/entries/:id` → persists on reload
- [ ] Check In: hours input shown only on own profile (profileSlug match)
- [ ] Check In: hours displayed as plain text on other profiles
- [ ] Read Only: hours always displayed as plain text
- [ ] Invalid value (negative) → reverts to original
- [ ] Clicking the entry card still navigates to entry detail

### H19. Toggle regular
- [ ] Profile detail → group hours section → check/uncheck regular checkbox
- [ ] Check: `POST /api/profiles/:slug/regulars` — `{ groupId }`
- [ ] Uncheck: `DELETE /api/regulars/:id`

### H20. Create record
- [ ] Profile detail → Records → "+ Add" → modal with Type, Status, Date
- [ ] `POST /api/profiles/:id/records` — `{ type, status, date? }`
- [ ] Record appears in pills list

### H21. Edit record
- [ ] Profile detail → click record pill → modal with Status, Date
- [ ] `PATCH /api/records/:id` — `{ status?, date? }`

### H22. Delete record
- [ ] Profile detail → edit record modal → Delete button → confirmation
- [ ] `DELETE /api/records/:id`

### H22b. Collect consent (Check In / Admin / Self-Service)
- [ ] Profile detail → Records → "Collect Consent" button visible (Check In or Admin)
- [ ] "Collect Consent" button **hidden** for Read Only users
- [ ] Click → `/profiles/:slug/consent.html` — shows volunteer name; Submit disabled
- [ ] Tick Privacy only → Submit enabled; submit → Privacy Consent: Accepted, Photo Consent: Declined
- [ ] Tick both → submit → both Accepted
- [ ] Return to profile → record pills show updated status and today's date
- [ ] `POST /api/profiles/:id/consent` — `{ privacyConsent: true, photoConsent: false }` → 200
- [ ] `POST /api/profiles/:id/consent` — `{ privacyConsent: false }` → 400 (privacy required)
- [ ] Read Only: `POST /api/profiles/:id/consent` → 403
- [ ] **Entry detail consent button** (Check In / Admin): visible when volunteer has no Privacy Consent record; hidden once they have an Accepted record
- [ ] Entry detail consent button: hidden for Read Only users
- [ ] Entry detail consent button: clicking navigates to `/profiles/:slug/consent.html`
- [ ] **Self-Service**: consent button visible on own entry detail when no privacy consent signed
- [ ] Self-Service: clicking navigates to `/profiles/:slug/consent.html`; can submit successfully
- [ ] Self-Service: `POST /api/profiles/:id/consent` for own profile → 200
- [ ] Self-Service: `POST /api/profiles/:id/consent` for a different profile ID → 403

### H23. Bulk add records
- [ ] Volunteers page → Advanced → no checkboxes ticked → "Add Records" → modal shows count of filtered individuals (groups excluded)
- [ ] With checkboxes ticked → "Add Records (N)" → modal shows count of selected individuals only
- [ ] Confirmation dialog: "You are about to update N records with Type: Status"
- [ ] `POST /api/records/bulk` — `{ profileIds, type, status, date? }`
- [ ] Shows "Done: X created, Y updated", auto-closes, reloads list
- [ ] Upsert: same type updates existing records, doesn't duplicate

### H24b. Entries page (admin)

- [ ] Admin: "Entries" nav link visible in header; non-admin users (Check In, Read Only, Self-Service, Public) do not see the link
- [ ] Navigate to `/entries` as admin → `GET /api/entries` called; entries list loads with totals ("N entries · H hours")
- [ ] Navigate to `/entries` as non-admin → 403 (API blocked by `require-admin.ts`)
- [ ] Notes search: type 3+ chars → results filter to entries whose notes contain the search term (case-insensitive)
- [ ] AccompanyingAdult filter: "Not empty" → only entries with an accompanying adult shown; "Empty" → only entries without
- [ ] Both filters combined: notes search + accompanying adult filter narrow results together
- [ ] Clearing filters restores full list
- [ ] Select All checkbox: selects all visible entries; Deselect All clears selection; count shown in action bar
- [ ] Clicking an entry row (non-edit mode) navigates to the session detail page
- [ ] "Edit" button on a row opens the `EntryEditModal`
- [ ] Edit modal: "View Profile" button visible and navigates to the profile detail page
- [ ] Edit modal: "View Session" button visible and navigates to the session detail page
- [ ] Edit modal: AccompanyingAdult dropdown shown only when `#Child` is in notes; populated with non-child adults from that session
- [ ] AccompanyingAdult dropdown hidden (FormRow disabled) when `#Child` absent; clearing `#Child` from notes resets `accompanyingAdultId` to null
- [ ] Save: `PATCH /api/entries/:id` called with `{ checkedIn, count, hours, notes, accompanyingAdultId }`; list updates in-place (no full reload)
- [ ] Save with changed notes that no longer match current filter: entry is removed from the visible list immediately
- [ ] Delete: confirmation dialog → `DELETE /api/entries/:id` → entry removed from list
- [ ] Profile filter chip: navigating from a profile warning link (`/entries?profileId=N&profileName=X`) shows a dirt-coloured "X ×" chip in the filter row; only that volunteer's entries are shown
- [ ] Clicking the chip's × button clears the profile filter and re-fetches all entries (per other active filters)
- [ ] `GET /api/entries?profileId=N` returns only entries for that profile

### H30. Bulk tag sessions / CSV download
- [ ] Sessions page → Advanced → check 2–3 session cards → "Add Tags (N)" and "Download CSV" buttons become enabled
- [ ] Click "Add Tags (N)" → tag tree picker opens (same modal as session detail)
- [ ] Modal title reads "Add Tag to N sessions"
- [ ] Select a tag → OK → `POST /api/sessions/bulk-tag` — `{ sessionIds: [...], tags: [{ label, termGuid }] }`
- [ ] Tags are merged with existing (not replaced); duplicate termGuids not added twice
- [ ] Sessions reload after; selected sessions now show the new tag
- [ ] Already-tagged sessions have that tag grayed out in the picker (opacity 0.4, non-clickable)
- [ ] Click "Download CSV" → downloads `sessions.csv` with columns: Date, Group, Name, Registrations, Hours, New, Children, Regulars, Financial Year
- [ ] CSV contains only the selected sessions (not all visible sessions)
- [ ] "Download CSV" button is disabled when no sessions are selected

### H24. Eventbrite sync — sessions
- [ ] Admin → "Refresh Events"
- [ ] `POST /api/eventbrite/sync-sessions`
- [ ] Shows "X events, Y matched, Z new sessions"
- [ ] Newly created sessions matched to a group have a blank Name (display title falls back to group name + date; no Eventbrite event title imported)
- [ ] Newly created session: Date field in SharePoint shows the correct calendar date (not one day early) — verifies noon UTC storage fix

### H25. Eventbrite sync — attendees
- [ ] Admin → "Fetch New Attendees"
- [ ] `POST /api/eventbrite/sync-attendees`
- [ ] Shows "X sessions, Y new profiles, Z new entries, W consent records"
- [ ] Creates profiles, entries, upserts consent records; new entries have `EventbriteAttendeeID` set in SharePoint
- [ ] Newly synced entry shows Eventbrite icon on session detail (driven by `EventbriteAttendeeID`, not Notes tag)
- [ ] Two attendees with same name but different emails → two separate profiles created; profile-level "Possible Duplicate" warning badge appears on entry cards (no `#Duplicate` Notes tag)
- [ ] Attendee name AND email both match an existing profile → same profile reused (email checked against all profile emails, not just the first)
- [ ] Attendee name matches existing profile, email is one of the profile's secondary emails → profile reused, no duplicate
- [ ] Attendee name matches existing profile with no stored email → email is backfilled on the existing profile, no duplicate created
- [ ] Attendee email matches an existing profile's email but name differs → name match used, not email; behaves by name logic
- [ ] Triggering sync while one is already running returns 409 "Sync already in progress" (second request rejected immediately)

### H25b. Eventbrite backfill
- [ ] `POST /api/eventbrite/backfill-attendee-ids` (admin/api-key auth)
- [ ] Returns `{ updated: N, skipped: M }` — entries updated with `EventbriteAttendeeID`
- [ ] After backfill, existing Eventbrite entries show the Eventbrite icon (no manual stats or Notes tag needed)
- [ ] Running a second time: all entries already have ID set → returns `{ updated: 0, skipped: ... }`

### H26. Nightly update (scheduled)
- [ ] `POST /api/eventbrite/nightly-update` with `X-Api-Key` header
- [ ] Returns `{ summary: "..." }` suitable for email notification; includes cache warmup line
- [ ] Azure Logic App calls `/api/eventbrite/nightly-update` daily at 05:30 UTC
- [ ] Concurrent call (second request while first still running) returns 409 — prevents duplicate entries from Logic App retries

### H27b. Profile stats warnings
- [ ] After `POST /api/profiles/refresh-stats`, a profile whose Title matches another profile has `"Possible Duplicate"` in its stored `Stats.warnings` array (verify in SharePoint or via `GET /api/profiles`)
- [ ] After refresh, a profile with an active entry containing `#child` in Notes but no `AccompanyingAdultLookupId` has `"Child No Adult"` in `Stats.warnings`; the warning URL includes `profileId` and `profileName` query params
- [ ] After refresh, a profile with a future booking but no accepted Privacy Consent or Photo Consent has `"No Consent"` in `Stats.warnings`
- [ ] After refresh, a profile with a future booking and both Privacy and Photo Consent accepted does **not** have `"No Consent"`
- [ ] After refresh, a profile with no future bookings does **not** have `"No Consent"` (past sessions only)
- [ ] After refresh, a clean profile (no duplicates, no unassigned child entries, consent present) has `warnings: []`
- [ ] Fixing the condition and re-running refresh removes the warning

### H27. Clear cache
- [ ] Dashboard → Refresh button
- [ ] `POST /api/cache/clear`
- [ ] Forces fresh data on next request

### H28. Upload button (entry detail — check-in/admin)
- [ ] Entry detail → "Upload" button visible for Admin and Check In; hidden for Read Only and Self-Service (`checkin-only` class)
- [ ] Click button → browser navigates directly to `/upload.html?entryId=:id` (no API call, no intermediate step)
- [ ] Self-service user on **session detail** page: "Upload" link rendered next to their own entry (if they have one); navigates to `/upload.html?entryId=:id`
- [ ] Self-service user on **entry detail**: Upload button not visible

### H29. Volunteer photo upload page (`/upload.html`)
- [ ] Visit `/upload.html?entryId=:id` in incognito (no session) → redirected to `/login.html?returnTo=/upload.html?entryId=:id`
- [ ] Visit with no `entryId` param or non-numeric ID → error: "No upload link found. Please use the link from your session page."
- [ ] Visit with valid `entryId` for a different volunteer (self-service wrong account) → error: "This upload link is not for your account."
- [ ] Visit with non-existent `entryId` → error: "Upload link not found. Please check the link and try again."
- [ ] Valid `entryId` → `GET /api/entries/:id/upload-context` → shows volunteer name and session name; no code entry step
- [ ] Self-service: `GET /api/entries/:id/upload-context` for another volunteer's entry → 403
- [ ] Select 2–3 photos → Upload button label updates to "Upload N files"; button enabled
- [ ] Upload → each file shows "✓ Uploaded" status; non-supported file (e.g. PDF) shows "✗ Failed"
- [ ] Files appear in SharePoint Media Library at `{groupKey}/{date}/`
- [ ] Completion step shows file count ("N files uploaded") and "View session gallery" link
- [ ] "View session gallery" link navigates to the correct session detail page
- [ ] `POST /api/entries/:id/photos` — self-service for another volunteer's entry returns 403

### H30b. Session gallery (session detail)
- [ ] Session detail with uploaded photos: cover image appears above the carousel; thumbnail strip below
- [ ] Clicking a thumbnail opens the lightbox
- [ ] Lightbox: left/right navigation works; close button (or Esc) dismisses
- [ ] Video items in the gallery have a play-button overlay on the thumbnail; clicking opens lightbox and video plays inline
- [ ] `GET /api/media/:itemId/stream` redirects to download URL for authenticated users
- [ ] Public (unauthenticated) users: gallery only shows items where `IsPublic = true`; private items not visible
- [ ] Public: `GET /api/media/:itemId/stream` for a non-public item → 403
- [ ] Admin/Check In: lightbox shows "Public gallery" checkbox and title/alt-text input per item
- [ ] Toggling "Public gallery" checkbox calls `PATCH /api/media/:itemId` — `{ isPublic: true/false }`; change persists on reload
- [ ] Admin/Check In: can set cover image via lightbox "Set as cover" control; cover updates above carousel
- [ ] `PATCH /api/media/:itemId` for Read Only or Self-Service → 403
- [ ] **Media cache**: loading session detail twice → second load shows `[Cache] Hit: media_folder_*` in server logs (no repeat Graph call)
- [ ] **Media cache bust**: upload a photo to a session → immediately reload the session gallery → new photo appears (cache was busted by upload)

### H30c. Standalone media gallery (`/media/`)

- [ ] Visit `/media/` without login → redirected to `/login.html`
- [ ] Visit `/media/` logged in → page loads; sessions with photos appear as a horizontal carousel
- [ ] Each carousel slide shows the session cover image, date, and group name as a caption
- [ ] Clicking a session slide navigates to `/media/session.html?groupKey=…&date=…`
- [ ] Sessions with no photos (`mediaCount === 0`) do not appear in the library

**Session gallery (`/media/session.html?groupKey=…&date=…`):**
- [ ] Visit without login → redirected to `/login.html`
- [ ] Valid `groupKey` + `date` → session gallery loads; all photos/videos appear as carousel slides
- [ ] Carousel scrolls freely with momentum (multiple slides per swipe); centred slide is full-brightness
- [ ] Non-selected slides are dimmed; centred slide shows caption overlay (`N / total`)
- [ ] Clicking any slide opens the lightbox at that item
- [ ] Lightbox: left/right navigation, Esc to close, video plays inline
- [ ] Prev/Next nav buttons: disabled at start/end of carousel; enabled when scrollable
- [ ] Arrow-key navigation (left/right) scrolls the carousel
- [ ] Breadcrumb: Home > Media (Home links to `/`, Media links to `/media/`)

### H32. Pre-session email
- [ ] Session detail → "Notify" button → `POST /api/entries/:id/notify` — email sent to volunteer
- [ ] Email renders with correct volunteer name, group name, date, session URL, login URL
- [ ] Description block present when session has notes; absent when no notes
- [ ] Regular block shown for regular volunteers; absent otherwise
- [ ] Child block shown when entry has accompanying child name; absent otherwise
- [ ] Sandbox preview: visit `/sandbox/email-pre-session` (admin or localhost) — iframe shows rendered email with all conditional blocks exercised
- [ ] `GET /api/email/sandbox/pre-session?format=json` returns fixture data

### H31. Backup export
- [ ] Admin page → "Export Backup" button → `POST /api/backup/export-all`
- [ ] Returns summary with file counts and timestamp; displayed in admin page
- [ ] Files written to `Backups/` folder in Shared Documents on the Tracker site
- [ ] Unchanged files are skipped (SHA-256 diff check) — re-running immediately results in 0 updated files
- [ ] API key auth: `POST /api/backup/export-all` with valid `X-Api-Key` succeeds without session
- [ ] Backup runs automatically as last step of nightly `POST /api/eventbrite/nightly-update`; result included in summary email

---

## MEDIUM PRIORITY — Read Operations

### M1. Dashboard stats
- [ ] `GET /api/stats` — returns thisFY and lastFY stats (groups, sessions, hours, volunteers)
- [ ] Progress bar reflects FY elapsed time
- [ ] Nav cards show correct counts

### M2. Health check
- [ ] `GET /api/health` — returns `{ success: true }` (no auth required)

### M3. Groups listing
- [ ] `GET /api/groups` — all groups with regulars counts
- [ ] Groups display as 3-column grid (1-column on mobile); sand background on cards
- [ ] Cards show: display name, Eventbrite icon (if linked), description (3-line clamp), regulars/sessions/hrs stats stacked left, View button bottom-right
- [ ] Hours shown as rounded integers (no decimals)
- [ ] Bottom padding present (cards don't sit flush against footer)

### M4. Group detail
- [ ] `GET /api/groups/:key` — stats, regulars, sessions for the group
- [ ] Stats: Sessions, Hours, Entries

### M5. Sessions listing
- [ ] `GET /api/sessions` — all sessions (includes `metadata` tags array)
- [ ] Sessions display as 3-column grid (1-column on mobile); sand background on cards
- [ ] Cards show: group name, date, description (3-line clamp), availability, View button
- [ ] Bottom padding present (cards don't sit flush against footer)
- [ ] Text search (min 3 chars) filters by session title and description
- [ ] Calendar view shows sessions as dots; clicking navigates to that date range

### M6. Session detail
- [ ] `GET /api/sessions/:group/:date` — entries with badges, tags, check-in status
- [ ] Stats: Registrations (or Attendees if past), Hours

### M7. Entry detail
- [ ] `GET /api/entries/:group/:date/:slug` — entry with volunteer info, hours, notes
- [ ] All emails shown as individual `mailto:` links for authenticated users; hidden from public
- [ ] Profile with comma-separated emails in SharePoint → multiple mailto links shown

### M8. Volunteers listing
- [ ] `GET /api/profiles` — all volunteers with hours, records, membership status
- [ ] `GET /api/profiles?group=X` — filtered by group attendance
- [ ] `GET /api/groups` — populate group dropdown
- [ ] `GET /api/records/options` — populate record type/status dropdowns
- [ ] Warnings filter dropdown appears in the advanced filters row
- [ ] "All profiles" (default) — no filter applied; all volunteers shown
- [ ] "All warnings" — only volunteers with at least one warning shown
- [ ] "No warnings" — only volunteers with no warnings shown
- [ ] Selecting a specific warning (e.g. "Possible Duplicate") — only those volunteers shown
- [ ] Warnings dropdown only lists warning values that exist in the current filtered list
- [ ] URL query param `?warnings=Possible+Duplicate` persists on page reload and correctly pre-selects the filter

### M9. Profile detail
- [ ] `GET /api/profiles/:slug` — slug format is `name-id` (e.g. `gary-downs-42`); resolves correctly even when two profiles share a name
- [ ] `GET /api/records/options` — populate record dropdowns
- [ ] `GET /auth/me` — determines inline hours editing permissions
- [ ] All emails shown as individual mailto links (one per line)
- [ ] Profile with comma-separated emails in SharePoint → multiple mailto links shown
- [ ] Admin, Check In, or Read Only viewing a profile with warnings — warnings section appears in the right column (dirt background, white text) listing each warning
- [ ] Self-Service user viewing the same profile — warnings section absent
- [ ] Profile with no warnings — warnings section not rendered

### M10. Unmatched Eventbrite events
- [ ] `GET /api/eventbrite/unmatched-events` — events with no matching group

### M11. App config
- [ ] `GET /api/config` — SharePoint site URL for admin page link

### M12. Cache stats
- [ ] `GET /api/cache/stats` — cache key information

### M13. CSV exports
- [ ] `GET /api/sessions/export` — downloads FE Hours CSV (this FY, past sessions)
- [ ] `GET /api/records/export` — downloads Records CSV with hours breakdown
- [ ] `GET /api/profiles/export?...` — downloads Profiles CSV with filter params

---

## LOW PRIORITY — UI-Only

### L1. Homepage personalisation

**As a self-service or check-in user with sessions:**
- [ ] Calendar shows a filled dot on dates where you have an entry (registered or attended)
- [ ] Calendar shows an outline dot on dates where your regular group has a session but you haven't joined
- [ ] Next button jumps to your next upcoming session; Last button jumps to your most recent session
- [ ] If you have no upcoming sessions, Next/Last fall back to global next/last
- [ ] Selected session card shows "Registered" pill for future sessions you're signed up to
- [ ] Selected session card shows "Attended · Nh" pill for past sessions you attended (checked in, with hours if set), or "Registered" if not checked in

**As a public or read-only user:**
- [ ] Calendar, Next/Last, and session cards behave exactly as before — no personalisation applied

**Word cloud:**
- [ ] Homepage loads with top 5 tags visible by default (cloud still shows, just limited)
- [ ] Clicking Show History expands the full word cloud alongside the FY bar chart
- [ ] Clicking Hide History collapses back to top 5

### L2. FY filtering (client-side)
- [ ] Dashboard: This FY / Last FY toggle
- [ ] Groups: All / Last FY / This FY
- [ ] Sessions: Past / Last FY / This FY / Future
- [ ] Volunteers: All / Last FY / This FY
- [ ] Profile detail: bar chart loads with no year selected (all entries shown); click a bar to select that FY; click selected bar again to deselect back to all
- [ ] Profile detail: Groups card remains visible when a FY is selected; hours figure updates to show hours for that FY (0 if none)
- [ ] Homepage nav cards (Sessions, Groups, Volunteers) link with `?fy=YYYY-YYYY` — clicking through applies the correct FY filter on the destination page

### L2. Volunteers advanced filters (client-side)
- [ ] Type: All / Individuals / Groups
- [ ] Hours: All / 0h / <15h / 15h+ / 15-30h / 30h+
- [ ] Record Type + Status combination
- [ ] Filters combine with AND logic
- [ ] Closing advanced section resets all filters and clears selection
- [ ] Opening Advanced shows checkboxes on all volunteer cards
- [ ] Checkbox toggles selection; "Add Records (N)" and "Download CSV" enable only when ≥1 selected
- [ ] "Select all" checks all visible volunteers; "Deselect all" clears; label toggles correctly
- [ ] Download CSV with selection → exports only selected volunteers (`?profileIds=...`)

### L3. Search
- [ ] Sessions page: min 3 chars, filters by title and description
- [ ] Volunteers page: min 3 chars, filters by name
- [ ] Add entry page: min 2 chars, filters by name/email
- [ ] Profile transfer modal: min 2 chars

### L19. Sessions advanced filters (client-side)
- [ ] Opening Advanced shows checkboxes on all session cards
- [ ] Group dropdown: shows only groups with sessions matching current FY + search + tag
- [ ] Tag dropdown (tree picker): shows only tags present in sessions matching current FY + search + group
- [ ] Selecting a group narrows the tag options; selecting a tag narrows the group options
- [ ] Clearing one filter re-expands the other's options
- [ ] If the active tag is not present in the newly selected group, tag is auto-cleared
- [ ] "Select all" / "Deselect all" respects current visible sessions
- [ ] "Add Tags (N)" enabled only when ≥1 session checked; label shows count
- [ ] Closing Advanced clears selection and hides checkboxes

### L4. Sort
- [ ] Volunteers: A-Z / Hours (descending)

### L20. Taxonomy tag word cloud
- [ ] **Homepage**: Word cloud card appears below FY stats (requires sessions tagged with taxonomy tags); font sizes vary by hours; selecting a different FY from the bar chart updates the cloud
- [ ] **Group detail**: Word cloud card appears between FY bar chart and sessions list; selecting a different FY updates the cloud; selecting "All" hides the FY param (shows all-time for that group)
- [ ] **Profile detail**: Word cloud card appears between Groups card and Records card; FY filter change updates the cloud; selecting a group from the group dropdown updates the cloud (scoped to that group)
- [ ] **Hierarchy**: A parent tag (e.g. "DH") appears larger/darker than its children (e.g. "Sheepskull"), which appear larger than grandchildren — depth shown via colour and size
- [ ] **Tooltips**: Hovering a word shows the full path label and hours (e.g. "DH > Sheepskull — 45h")
- [ ] **Empty state**: If no sessions have taxonomy tags for the selected scope/FY, no word cloud card is rendered (not even an empty card)
- [ ] **Randomised order**: Reloading the page renders the word cloud in a different order each time (font size still reflects hours)
- [ ] **CSV download**: Clicking "Download CSV" button downloads a `.csv` file with Tag and Hours columns; all rows (not just visible ones) included
- [ ] **API endpoint**: `GET /api/tags/hours-by-taxonomy?group=xc&fy=FY2025` returns `{ success: true, data: [...] }` with correct aggregated hours per label

### L5. SVG badge icons
- [ ] Member: green medal — shown for charity members
- [ ] Card: green receipt (Accepted) / orange (Invited)
- [ ] Group: green people — shown for group/company profiles
- [ ] Tooltips on hover
- [ ] Present on: volunteers, session detail, profile detail, entry detail

### L6. SVG tag icons
- [ ] Notes hashtags render as SVG icons (not emoji)
- [ ] FirstAider and NoPhoto appear red
- [ ] Tag toggle buttons use SVG icons on entry detail and add entry
- [ ] Active buttons highlighted with green border
- [ ] Replacing SVG in `/public/icons/` changes icon everywhere (no rebuild)

### L7. Icon legend (admin page)
- [ ] Shows all 12 icons with labels
- [ ] Card Invited in orange, FirstAider and NoPhoto in red

### L8. Member card highlighting
- [ ] Volunteers page: green background + left border for individuals meeting 15h in selected FY
- [ ] Changes with FY filter (hours-based, not membership-based)

### L9. Description clamping
- [ ] Long session descriptions clamped to 3 lines with "Show more" toggle

### L10. Breadcrumbs
- [ ] Detail pages show trail (e.g. Home > Sessions > Session)
- [ ] Each level clickable

### L11. Dropdowns
- [ ] Click to open, click again or outside to close
- [ ] Active option highlighted

### L12. Modals
- [ ] Overlay dims background
- [ ] Cancel closes without changes
- [ ] Buttons disabled during processing

### L13. Live-save feedback
- [ ] Entry detail: green border flash on success, red on error

### L14. Responsive / mobile
- [ ] All pages usable on mobile (44px touch targets)
- [ ] Cards and filter rows stack vertically on narrow screens
- [ ] Modals fit small screens

### L15. Profile entries group filter (client-side)
- [ ] Group dropdown appears opposite "Entries" heading
- [ ] Options populated from FY-filtered entries (changes with FY filter)
- [ ] Selecting a group filters entries; "All Groups" shows all
- [ ] Entry count updates with filter

### L16. Favicon
- [ ] SVG favicon shown in browser tab on all pages
- [ ] ICO fallback works in older browsers

### L17. User info
- [ ] Header shows logged-in user name and Logout link
- [ ] `/auth/me` returns user details (no session check)

### L18. Upload and consent buttons (entry detail)
- [ ] Upload button positioned top-right of entry header card alongside h1
- [ ] Displays cloud-upload SVG icon + "Upload" label
- [ ] Upload button visible for Admin and Check In; hidden for Read Only and Self-Service (checkin-only CSS class)
- [ ] Consent button (checkboxes icon + "Consent" label) shown next to Upload when volunteer has no Accepted Privacy Consent
- [ ] Consent button hidden when volunteer already has Accepted Privacy Consent
- [ ] Consent button visible for Admin, Check In, and Self-Service; hidden for Read Only (checkin-or-selfservice CSS class)
