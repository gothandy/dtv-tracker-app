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
- [ ] Unauthenticated API 401 response (from `apiFetch` in common.js) redirects to `/login.html?returnTo=...` not `/auth/login`
- [ ] `/login.html` shows Google, Facebook, and Microsoft login options
- [ ] Successful Microsoft login redirects back to `/` (or originally requested page via `returnTo`)
- [ ] Click Logout — session cleared, redirected to Microsoft logout
- [ ] API key auth: `POST /api/eventbrite/event-and-attendee-update` with valid `X-Api-Key` succeeds without session
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
- [ ] Check In: Upload button on entry detail visible and functional (navigates to `/upload/CODE`)
- [ ] Check In: `POST /api/entries/:id/upload-code` succeeds (not blocked by 403)
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
- [ ] `POST /api/sessions/:group/:date/entries` — `{ volunteerId, notes? }`
- [ ] Redirects to session detail

### H9. Check-in toggle
- [ ] Session detail → toggle entry checkbox
- [ ] `PATCH /api/entries/:id` — `{ checkedIn: true/false }`
- [ ] Visual checkmark updates immediately

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
- [ ] Adds missing regulars, syncs Eventbrite attendees, tags #NoPhoto
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

### H23. Bulk add records
- [ ] Volunteers page → Advanced → no checkboxes ticked → "Add Records" → modal shows count of filtered individuals (groups excluded)
- [ ] With checkboxes ticked → "Add Records (N)" → modal shows count of selected individuals only
- [ ] Confirmation dialog: "You are about to update N records with Type: Status"
- [ ] `POST /api/records/bulk` — `{ profileIds, type, status, date? }`
- [ ] Shows "Done: X created, Y updated", auto-closes, reloads list
- [ ] Upsert: same type updates existing records, doesn't duplicate

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
- [ ] Creates profiles, entries, upserts consent records
- [ ] Two attendees with same name but different emails → two separate profiles created; entry for the new profile has `#Duplicate` (red warning badge) on session detail
- [ ] Attendee name AND email both match an existing profile → same profile reused (email checked against all profile emails, not just the first)
- [ ] Attendee name matches existing profile, email is one of the profile's secondary emails → profile reused, no duplicate
- [ ] Attendee name matches existing profile with no stored email → email is backfilled on the existing profile, no duplicate created
- [ ] Attendee email matches an existing profile's email but name differs → name match used, not email; behaves by name logic
- [ ] If any duplicates flagged, sync summary includes "X duplicate warning(s) — check session entries"
- [ ] Triggering sync while one is already running returns 409 "Sync already in progress" (second request rejected immediately)

### H26. Eventbrite combined sync (scheduled)
- [ ] `POST /api/eventbrite/event-and-attendee-update` with `X-Api-Key` header
- [ ] Returns `{ summary: "..." }` suitable for email notification
- [ ] Azure Logic App calls this daily
- [ ] Concurrent call (second request while first still running) returns 409 — prevents duplicate entries from Logic App retries

### H27. Clear cache
- [ ] Dashboard → Refresh button
- [ ] `POST /api/cache/clear`
- [ ] Forces fresh data on next request

### H28. Generate volunteer upload link (check-in+)
- [ ] Entry detail → "Upload" button visible for Admin and Check In; hidden for Read Only
- [ ] Click button → `POST /api/entries/:id/upload-code` → browser navigates directly to `/upload/{CODE}`
- [ ] No intermediate code panel shown — navigation is immediate
- [ ] Read Only user: button not visible; `POST /api/entries/:id/upload-code` returns 403

### H29. Volunteer photo upload (public page)
- [ ] Visit `/upload` in incognito (no session) — page loads without redirect to login
- [ ] `/upload` with no code → error message shown ("No upload code found. Please use the link provided by your session admin.")
- [ ] `/upload/INVALIDCODE` (invalid format) → same error
- [ ] Visit `/upload/AGHR` with valid code → validates immediately, shows volunteer name and session name (no code entry step)
- [ ] Visit `/upload/AGHR` with expired code (session date > 7 days ago, public access) → "This code has expired. Please ask for a new one."
- [ ] Share icon visible for sessions ≤ 7 days old; hidden for sessions > 7 days old
- [ ] Share icon → native share sheet (mobile) or copies URL to clipboard (desktop)
- [ ] Authenticated user navigating to old session upload page (> 7 days) → validates OK, share icon hidden, upload works
- [ ] Select 2–3 photos → Upload button shows correct count
- [ ] Upload → each file shows "✓ Uploaded" status
- [ ] Files appear in SharePoint Media Library at `{groupKey}/{date}/`
- [ ] Session `mediaCount` increments on next page load (cache cleared after upload)
- [ ] Step 3 "X photos uploaded" confirmation shown after upload
- [ ] Non-image file (e.g. PDF) → rejected server-side, shows "✗ Failed"
- [ ] WhatsApp: paste `/upload/AGHR` URL → tap link on mobile → upload page opens and validates immediately

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
- [ ] Cards show display name, description, regulars count, Eventbrite link

### M4. Group detail
- [ ] `GET /api/groups/:key` — stats, regulars, sessions for the group
- [ ] Stats: Sessions, Hours, Entries

### M5. Sessions listing
- [ ] `GET /api/sessions` — all sessions (includes `metadata` tags array)
- [ ] Cards show date, group, registrations, hours
- [ ] Next session highlighted with countdown
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

### M9. Profile detail
- [ ] `GET /api/profiles/:slug` — slug format is `name-id` (e.g. `gary-downs-42`); resolves correctly even when two profiles share a name
- [ ] `GET /api/records/options` — populate record dropdowns
- [ ] `GET /auth/me` — determines inline hours editing permissions
- [ ] All emails shown as individual mailto links (one per line)
- [ ] Profile with comma-separated emails in SharePoint → multiple mailto links shown

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
- [ ] Replacing SVG in `/public/svg/` changes icon everywhere (no rebuild)

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

### L18. Upload button (entry detail)
- [ ] Button positioned top-right of entry header card alongside h1
- [ ] Displays cloud-upload SVG icon + "Upload" label
- [ ] Visible for Admin and Check In; hidden for Read Only (checkin-only CSS class)
