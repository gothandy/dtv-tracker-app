# DTV Tracker — Manual Test Script

Run with `npm run dev` at http://localhost:3000. Log in via Microsoft Entra ID.

**Priority key:**
- **HIGH** — Writes to SharePoint (creates, updates, deletes data)
- **MEDIUM** — Reads from APIs (SharePoint, Eventbrite)
- **LOW** — UI-only (client-side filtering, styling, navigation)

---

## HIGH PRIORITY — Write Operations

### H1. Authentication & Permissions

- [ ] Unauthenticated visit redirects to `/auth/login`
- [ ] `/auth/login` redirects to Microsoft login page
- [ ] Successful login redirects back to `/` (or originally requested page)
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
- [ ] Check In: Add Record, Transfer, Delete still hidden on profile page
- [ ] Check In: `POST /api/profiles/:slug/records` returns 403
- [ ] Check In: `POST /api/groups` returns 403
- [ ] **Read Only user** (no matching profile `User` field, not in `ADMIN_USERS`): all action buttons hidden
- [ ] Read Only: session detail — edit, refresh, set hours, add entry buttons all hidden
- [ ] Read Only: session detail — check-in checkboxes visible but disabled (greyed out, not clickable)
- [ ] Read Only: entry detail — checked in and hours controls visible but disabled
- [ ] Read Only: profile detail — edit button hidden, regular checkboxes disabled
- [ ] Read Only: any POST/PATCH/DELETE API call returns 403 "Read only access"
- [ ] Check In Only: `DELETE /api/sessions/:group/:date` returns 403
- [ ] Check In Only: `GET /api/sessions/export` returns 403 (GDPR)
- [ ] Check In Only: admin page shows only Icon Legend section
- [ ] `/auth/me` returns `role: "admin"` or `role: "checkin"` based on env var

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
- [ ] Profile detail → Delete button (only shown if no entries)
- [ ] `DELETE /api/profiles/:slug`
- [ ] Redirects to volunteers listing

### H17. Transfer profile
- [ ] Profile detail → "Transfer" button → search target → select → confirm
- [ ] `POST /api/profiles/:slug/transfer` — `{ targetProfileId, deleteAfter? }`
- [ ] Entries, regulars, records transferred. Duplicates skipped.
- [ ] Redirects to target profile

### H18. Toggle regular
- [ ] Profile detail → group hours section → check/uncheck regular checkbox
- [ ] Check: `POST /api/profiles/:slug/regulars` — `{ groupId }`
- [ ] Uncheck: `DELETE /api/regulars/:id`

### H19. Create record
- [ ] Profile detail → Records → "+ Add" → modal with Type, Status, Date
- [ ] `POST /api/profiles/:id/records` — `{ type, status, date? }`
- [ ] Record appears in pills list

### H20. Edit record
- [ ] Profile detail → click record pill → modal with Status, Date
- [ ] `PATCH /api/records/:id` — `{ status?, date? }`

### H21. Delete record
- [ ] Profile detail → edit record modal → Delete button → confirmation
- [ ] `DELETE /api/records/:id`

### H22. Bulk add records
- [ ] Volunteers page → Advanced → "Add Records" → modal with Type, Status, Date
- [ ] Shows count of filtered individuals (groups excluded)
- [ ] Confirmation dialog: "You are about to update N records with Type: Status"
- [ ] `POST /api/records/bulk` — `{ profileIds, type, status, date? }`
- [ ] Shows "Done: X created, Y updated", auto-closes, reloads list
- [ ] Upsert: same type updates existing records, doesn't duplicate

### H23. Eventbrite sync — sessions
- [ ] Admin → "Refresh Events"
- [ ] `POST /api/eventbrite/sync-sessions`
- [ ] Shows "X events, Y matched, Z new sessions"

### H24. Eventbrite sync — attendees
- [ ] Admin → "Fetch New Attendees"
- [ ] `POST /api/eventbrite/sync-attendees`
- [ ] Shows "X sessions, Y new profiles, Z new entries, W consent records"
- [ ] Creates profiles, entries, upserts consent records

### H25. Eventbrite combined sync (scheduled)
- [ ] `POST /api/eventbrite/event-and-attendee-update` with `X-Api-Key` header
- [ ] Returns `{ summary: "..." }` suitable for email notification
- [ ] Azure Logic App calls this daily

### H26. Clear cache
- [ ] Dashboard → Refresh button
- [ ] `POST /api/cache/clear`
- [ ] Forces fresh data on next request

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
- [ ] `GET /api/sessions` — all sessions
- [ ] Cards show date, group, registrations, hours
- [ ] Next session highlighted with countdown

### M6. Session detail
- [ ] `GET /api/sessions/:group/:date` — entries with badges, tags, check-in status
- [ ] Stats: Registrations (or Attendees if past), Hours

### M7. Entry detail
- [ ] `GET /api/entries/:group/:date/:slug` — entry with volunteer info, hours, notes

### M8. Volunteers listing
- [ ] `GET /api/profiles` — all volunteers with hours, records, membership status
- [ ] `GET /api/profiles?group=X` — filtered by group attendance
- [ ] `GET /api/groups` — populate group dropdown
- [ ] `GET /api/records/options` — populate record type/status dropdowns

### M9. Profile detail
- [ ] `GET /api/profiles/:slug` — entries, group hours, records, membership
- [ ] `GET /api/records/options` — populate record dropdowns
- [ ] Email shown as mailto link

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

### L1. FY filtering (client-side)
- [ ] Dashboard: This FY / Last FY toggle
- [ ] Groups: All / Last FY / This FY
- [ ] Sessions: Past / Last FY / This FY / Future
- [ ] Volunteers: All / Last FY / This FY
- [ ] Profile detail: All / Last FY / This FY

### L2. Volunteers advanced filters (client-side)
- [ ] Type: All / Individuals / Groups
- [ ] Hours: All / 0h / <15h / 15h+ / 15-30h / 30h+
- [ ] Record Type + Status combination
- [ ] Filters combine with AND logic
- [ ] Closing advanced section resets all filters

### L3. Search
- [ ] Volunteers page: min 3 chars, filters by name
- [ ] Add entry page: min 2 chars, filters by name/email
- [ ] Profile transfer modal: min 2 chars

### L4. Sort
- [ ] Volunteers: A-Z / Hours (descending)

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

### L15. User info
- [ ] Header shows logged-in user name and Logout link
- [ ] `/auth/me` returns user details (no session check)
