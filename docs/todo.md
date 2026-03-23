# Todo

Items are grouped by the code they touch, so related work can be tackled together.

---

## Caching: Detail-tier Per-Session Caches
*Touches: `services/repositories/entries-repository.ts`, `services/repositories/profiles-repository.ts`, `routes/sessions.ts`, `routes/entries.ts`*

Deferred from session detail performance work (2026-03-23). Fixes 1–3, 6–7 already shipped. Measure average session detail load time before implementing these.

**Fix 4 — Per-session entries cache**
Cache `entries_session_{sessionId}` (1min TTL) inside `getBySessionIds()` for the single-ID path. Add optional `sessionId?: number` to `updateFields`, `create`, `delete` so route handlers can bust the specific key. Callers that already hold the session context (check-in, hours update, create entry) pass it; generic callers don't.

**Fix 5 — Per-session profiles cache**
After entries are loaded, collect the session's profile IDs and build `profiles_session_{sessionId}` (5min TTL) by filtering the profiles list cache. On cold list cache, falls back to `profilesRepository.getAll()`. Invalidate from `profilesRepository` write methods (`clearCacheByPrefix('profiles_session_')`) and from entry write handlers (`clearCacheKey('profiles_session_{sessionId}')`).

---

## Homepage & Dashboard Polish
*Touches: `index.html`, `session-cards.js`, `styles.css`, `eventbrite.ts`*

**Step 4 — CTA for next unregistered session**
For personalised users, show a lightweight "Also coming up" prompt/card for the next upcoming session they haven't registered for. No extra fetch needed — data is already loaded. Change: `session-cards.js` + `styles.css`.

**Homepage Refresh Button — Public Appearance**
The refresh icon at the top of the homepage is intentionally visible to public users (the loading spinner is useful), but it currently looks like a fully active button. For public users it should appear visually inactive — muted colour, no hover effect, `cursor: default` — so it doesn't imply interactivity. The spinner behaviour on click should remain.

**Automatic Eventbrite Notification on Homepage**
When an admin/check-in user loads the homepage, silently check Eventbrite for new registrations and import them automatically — no button required. The Refresh button on "Recent Sign-ups" currently provides on-demand sync; a background version would fire `quick-sync` on `authReady` with a 5-minute cooldown so it doesn't trigger on every page load.

---

## Sessions Listing: Search & Filter Enhancements
*Touches: `sessions.html`, `sessions.js`, `session-cards.js`, `tags.ts`*

**Sessions Advanced Filter — Minor UX Issues**
- **[BUG]** Count total doesn't refresh when the advanced group/tag filters are applied — still shows the unfiltered total until a manual re-trigger
- **[BUG]** Select/deselect in advanced mode doesn't update the results count
- Advanced filter buttons (Apply/Clear) are in an odd position relative to the dropdowns
- Total shown on the selection button may not be needed — consider removing for simplicity
- We should show totals for all users including public.

Low priority, just polish.

**Text search highlight**
Both sessions and volunteers listing should highlight the matching portion of text in search results when a search term is active.

**Session tag lozenges on session cards**
Session cards on the sessions listing page should show tag pills/lozenges (same style as session detail). Only on sessions page, not other listing pages. Requires `session-cards.js`.

**Tag dropdown hierarchy**
The tag filter dropdown should show ALL ancestor nodes as separate options, not just leaf nodes. E.g. "DH", "DH > Sheepskull", "DH > Sheepskull > Top" as separate selectable options. Selecting a parent node ("DH") should match sessions tagged with it OR any of its descendants. Requires changes to `sessions.js` and `tags.ts`.

---

## Shared Stats Panel: FY Bar Chart + Word Cloud
*Touches: `word-cloud.js` (new `fy-stats-panel.js`), `group-detail.html`, `profile-detail.html`, `index.html`, CSS*

The bar chart and word cloud are currently implemented independently across three pages with inconsistent behaviour. Consolidate into a single shared module and ensure consistent UX everywhere.

**Current state (problems):**
- Bar chart + word cloud CSS is split across `home.css` and `styles.css`
- Homepage bar chart has a collapse/expand toggle; detail pages do not — no principled reason for the difference
- Word cloud CSV visibility varies page-to-page
- `GET /api/tags/hours-by-taxonomy?profile=` fetches all ~5,000 entries to find one volunteer's data — consider a targeted SharePoint query filtered by `ProfileLookupId eq :id` to avoid the full fetch on cold cache

**Goal:**
- Single `fy-stats-panel.js` module (`createFYStatsPanel(container, options)`) covering both bar chart and word cloud
- Decide and document the consistent behaviour: collapse toggle (homepage only?), word cloud limit, CSV visibility, FY click-to-filter vs always-selected
- All bar chart + word cloud CSS consolidated into one place
- Homepage, group detail, and profile detail all use the same module with different options
- Profile detail gains the missing FY bar chart (from `Profile.Stats.hoursByFY`), wired to the existing FY filter

**[BUG] Profile Detail — Groups Filter Bar Chart**
The groups filter on the profile detail page doesn't update the FY bar chart.

---

## Entry & Session Tagging
*Touches: `tag-icons.js`, SVGs, `entries.ts` (session refresh), `session-detail.html`, `entry-detail.html`, Records schema, `records-repository.ts`*

**#NoConsent Tag — Privacy Consent Warning**
Similar to `#NoPhoto`, automatically tag entries `#NoConsent` when the volunteer has no Accepted Privacy Consent record. Prompts check-in users to collect consent on the day.
- Add `#NoConsent` to the tag icon config in `public/js/tag-icons.js` (red warning style, matching `#NoPhoto`)
- Add SVG icon for the badge
- Session refresh (`POST /api/sessions/:group/:date/refresh`) should tag `#NoConsent` on entries where the volunteer lacks consent, alongside the existing `#NoPhoto` logic
- Entry detail and session detail should render the badge; check-in users can clear it once consent is collected (or it auto-clears on next refresh)

**Dig Lead and First Aider Session Roles**

Two named roles per session: the designated Dig Lead and First Aider on the day.

*Session fields* (new SharePoint lookup fields on Sessions list, pointing to Profiles):
- `DigLead` — the lead dig leader for the session
- `FirstAider` — the designated first aider

Shown on session detail page (check-in+); editable via the session edit modal.

*Dig Lead training record* (Records list):
- New Type choice: `Dig Lead Training` — records who has completed dig lead training (Status: Accepted/Invited/etc., Date: training date)
- Displayed on profile detail Records section like other record types

*`#DigLead` entry tag* — marks sub dig leaders attending on the day (anyone with dig lead training who isn't the named session Dig Lead). Currently exists as a hashtag in entry Notes. Eventbrite sync should auto-tag `#DigLead` on entries where the volunteer has a `Dig Lead Training` record, similar to how `#NoPhoto` is tagged from Photo Consent. The named session Dig Lead may or may not also get this tag — TBD.

*Schema changes*: two new lookup fields on Sessions list; one new Type choice on Records list.

**Records — Notes Field**
Add a free-text `Notes` field to the Records list for recording supplementary information against a record, e.g. which email address was used to collect consent, first aid certificate type/expiry, DofE award level. Schema change (new single-line text field on the Records SharePoint list) plus UI changes on the record add/edit modal and record pill display.

**Use of #Tags — Retire Redundant Tags**
Many of the tags can be retired? Things like "#New" can be calculated, #Regulars comes from the lookup. Perhaps overtime gently retire each once possible, leaving those that are required like dig lead, etc. Do this after the new auto-tags above are settled, so it's clear what stays. All tags now use SVG icons configured in `public/js/tag-icons.js` — easy to add/remove/rename tags by editing this file.

---

## Profile & Volunteer Management
*Touches: `profile-detail.html`, `profiles.ts`, `volunteers.html`, `routes/stats.ts`*

**Multiple Emails UI**
The `Profile.Email` field supports comma-separated addresses but there's no dedicated UI for managing them — currently edited as a raw string in the profile edit modal. Needs a proper multi-value input: add/remove individual addresses, clear labelling of which is primary (first in the list), and validation per address.

**Timesheet functionality**
It is possible for users to edit the hours directly in people's profiles — needs checking for usability.

**Volunteer List Filters — Admin Shortcuts**
Automatically link through to the volunteers page with advanced filters set from the admin page.
- **"Nearly there"** — profiles not yet members but approaching 15h this FY
- **"Needs card"** — members who haven't been issued a card yet (requires Records)
- **"At risk"** — members who aren't on track to meet 15h this FY

**Bulk Email to Volunteers**
Both from filtered volunteers page, groups (regulars) and session page? Or provide emails to cut and paste into email client.

**Volunteer Calls to Action**
Shift the whole App away from being a backend management tool, to something that is highly compelling to the "self-service" audiance. This would include thing like.
- No future registrations - Target a group they've been on before.
- Only go on one groups digs - Target other groups.
- Highlight benefits and push on homepage with (only 2 more digs and you get X)
- Make sign up easier than Eventbrite with self-service sign in. Maybe with registrations from all session cards.
- You've just earned discounts.
- AGM x- days away for members.
- Membership application form for anyone with the hours.
Then some updates with the website.
- Links from the website (your account style).
- Replace eventbrite sign up with feed

---

## Entry URLs & Session Actions
*Touches: `app.js` (new route), `entries.ts` (new endpoint), `entry-detail.html`, `session-detail.html`*

**Human-Readable Entry URLs**
Replace numeric entry URLs (`/entries/123/edit.html`) with consistent slug-based URLs: `/sessions/:groupKey/:date/:volunteerSlug/entry.html` (e.g. `/sessions/Sat/2026-03-21/andrew-davies-1/entry.html`).
- Express route serves `entry-detail.html` for the 5-segment pattern
- New API endpoint `GET /api/sessions/:groupKey/:date/entries/:volunteerSlug` resolves the entry (group+date → session; slug suffix → profile ID; profile+session → entry)
- `entry-detail.html` JS detects the new URL pattern and calls the new endpoint instead of `/api/entries/:id`

**Microsoft Planner Integration — Flag Issues from Sessions**
Allow check-in users to create a task in Microsoft Planner directly from the session detail page. Useful for flagging issues noticed during a dig (equipment running low, machinery broken, etc.) so they reach the wider team.

- "Flag Issue" button (check-in+) on session detail → modal with title + optional notes → creates task in Planner via Graph API
- Session context (group, date) prepended to task title automatically
- Reuses existing client-credentials Graph API token
- Requires `Tasks.ReadWrite.All` application permission on Azure app registration
- New env vars: `PLANNER_PLAN_ID` (required), `PLANNER_BUCKET_ID` (optional)
- No task display in-app — team views/manages tasks in Teams/Planner

---

## Auth & Session Reliability
*Touches: `app.js` (session config), `routes/auth/google.ts`, `routes/auth/facebook.ts`*

**Investigate Random Sign-Outs**

Reports of users being signed out every 5–10 minutes. Root cause not yet confirmed — gather more data before implementing fixes.

**Likely causes (check in order):**
1. **"Always On" disabled** in Azure App Service (Configuration → General settings) — app goes idle between requests and restarts, wiping in-memory sessions. Free fix if this is the cause. [I think this has been fixed now. Waiting on more feedback before closing issue]
2. **App crashing** — App Insights Failures blade will show unhandled exceptions and process restarts. Check after next reported sign-out.
3. **MemoryStore** — `express-session` defaults to in-memory session storage; all sessions lost on any process restart/redeploy. Long-term fix regardless of root cause: provision Azure Cache for Redis and add `connect-redis`.

**Quick wins to apply once root cause confirmed:**
- Add `rolling: true` to session config so the 8-hour window resets on activity rather than expiring from login time
- Throw on startup if `SESSION_SECRET` env var is missing (currently falls back to a hardcoded string — a deploy without it invalidates all session cookies)
- Revert OAuth CSRF state to stateless HMAC tokens in `google.ts`/`facebook.ts` (regression from 2026-03-17 refactor, noted in technical-debt.md)

Key files: [app.js](../app.js) (session config ~lines 38–48), [routes/auth/google.ts](../routes/auth/google.ts), [routes/auth/facebook.ts](../routes/auth/facebook.ts)

---

## Sync, Logging & Backup
*Touches: `eventbrite.ts`, `eventbrite-sync.ts`, `admin.html`, `backup.ts`; Azure Logic App config*

**Sync Logging**
The Eventbrite sync endpoints return structured results but there's no persistent log. Azure Logic App run history provides some visibility, but a SharePoint "Logs" list would allow viewing sync history from within the app.
- SharePoint Logs list with fields: Title (timestamp), Summary (text), Source (Manual/Scheduled)
- Write to Logs list at the end of `event-and-attendee-update` endpoint
- Display on admin page with last sync timestamp

**Nightly Backup — Azure Logic App scheduling**
Backup now runs as the last step of the nightly Eventbrite sync and is included in the email summary. Remaining: schedule the existing Logic App to also trigger `POST /api/backup/export-all` directly (or rely on it running via the sync chain). Configure SharePoint document library version retention limit in library settings.

**Nightly task endpoint naming**
`POST /api/eventbrite/event-and-attendee-update` now does: session sync, attendee sync, session stats refresh, profile stats refresh, and backup export — the name no longer reflects its scope. Consider renaming to `POST /api/nightly/run` with a redirect or alias so the existing Azure Logic App URL keeps working.

**Media Metadata Backup**
Add `Backups/media.json` to the nightly backup — file name, folder path (`groupKey/date`), `mimeType`, `isPublic`, and `title` (caption) per item. The photos themselves don't need backing up; these custom column values are what could be lost if the SharePoint list behind the drive was corrupted. Use the Graph Drive delta endpoint (`GET /drives/{driveId}/root/delta?$expand=listItem(...)`) to fetch all items in one paginated traversal — needs a new paginated method on `sharepoint-client.ts`. Include same diff check as other backup files.

**MatchName Field — Is It Redundant?**
`MatchName` was added to support Eventbrite name matching (lowercased/normalised form of Title). Now that duplicate detection also normalises `Title` via `toMatchName()` at query time, and Eventbrite sync could do the same, the field may be unnecessary. Investigate:
- Does Eventbrite sync need a stored normalised name, or can it normalise on the fly?
- Are there profiles where `MatchName` differs meaningfully from `toMatchName(Title)`? (i.e. has it ever been manually overridden for a reason?)
- If redundant: remove the field from SharePoint, the repositories, and all sync/matching code.

---

## UX Polish
*Touches: `common.js`, `styles.css`, all HTML pages*

**Standardise Modal Close Button**
Add a consistent `[×]` close button to all modals (top-right corner). Currently modals use text buttons ("Cancel", "Close"). The About modal in `common.js` would be the first to adopt the pattern.

**Breadcrumb / Back Navigation**
Current breadcrumb is static (path-based) and doesn't reflect where the user navigated from. Options:
- **Back button**: Replace breadcrumb with a single context-aware "Back" button using `history.back()` or `document.referrer`. More mobile-friendly (large touch target, familiar UX).
- **Context-sensitive breadcrumb**: Detect referrer to build the correct trail (e.g. entry page reached from session vs profile shows different parent). Started on profile detail page but incomplete.

A back button is probably the right approach — simpler, works well on mobile, and avoids the complexity of reconstructing navigation history from the URL alone.

**[BUG] Self-Service Breadcrumb — Volunteers Link**
The breadcrumb on profile detail in self-service mode includes a Volunteers link that returns an error (self-service users can't access the volunteers listing). Remove the Volunteers breadcrumb step for self-service users — from their perspective, profile sits directly under the homepage.

**Filters, Cards & Stats Consistency Review**
Review all list pages (groups, sessions, volunteers, group detail, profile detail) for consistency and usability:
- Filter options and ordering (All / Last FY / This FY / Future where applicable)
- Stats shown on cards vs detail pages — are they the right ones, do they reflect the active filter?
- Card layouts — consistent use of meta items, green numbers, descriptions
- Empty states when a filter returns no results
- Default filter selection across pages

---

## Group Structure
*Touches: groups schema, `groups.html`, `group-detail.html`, `stats.ts`*

**Group of Groups**
Have a category dropdown for groups to cover Dig/Fund/Organise, though this list will be managed in SharePoint. Show each category differently (colour?) and provide a bar chart to show how much time is spent in each area.

---

## External Integrations
*Touches: new routes/services, `session-detail.html`, `common.js`, `admin.html`*

These all carry external API setup cost and are independent of each other.

**PWA Push Notifications**
Send a session update notification to all subscribed devices (users who have installed the app) after a session is completed.

**Trigger**: Manual "Send update" button on session detail page, check-in+ only.
**Audience**: Anyone who has installed the PWA and granted notification permission (device-level, not tied to accounts).

**Implementation sketch:**
- **Service worker** (`public/sw.js`) — receives push events, shows notification, handles click → opens session URL
- **VAPID keys** — generate once with `npx web-push generate-vapid-keys`; store as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` env vars
- **`web-push` npm package** — server-side push sending
- **SharePoint "PushSubscriptions" list** — stores device subscriptions: `Endpoint` (multi-line text), `P256dh` (text), `Auth` (text). Env var: `PUSH_SUBSCRIPTIONS_LIST_GUID`
- **`POST /api/push/subscribe`** — public (no auth), saves device subscription
- **`POST /api/push/send`** — check-in+, sends notification to all subscribers with session name, group, date, and link
- **Client-side** — register service worker on all pages; prompt for permission once; "Send update" button on session detail (check-in+)

**Notification content**: Session name, date, group, volunteer count. Tapping opens the session detail page.

**Post sessions to Facebook Page**
Auto-post session summaries (text + photos) to a Facebook Page after a session. Facebook's Graph API supports posting to Pages you manage with a long-lived Page Access Token.

**What a post would include:**
- Session name, date, group
- Stats: attendees, hours volunteered, new volunteers
- Session description/notes
- Photos from the SharePoint media library

**Implementation sketch:**
- `POST /api/sessions/:group/:date/share-facebook` — admin-only endpoint; fetches session + photos, posts to Facebook Graph API
- Admin button on session detail page (admin-only)
- Store returned `post_id` on the session (new SharePoint field) to prevent double-posting and link back to the post
- `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_TOKEN` env vars (Page token doesn't expire if refreshed properly)

**Setup cost:** Register a Facebook App, request `pages_manage_posts` permission, generate a long-lived Page Access Token.

**Import from Facebook events**
Some groups use Facebook for registration. Maybe use an OCR to get the text, and match against the names in the profile list.

---

## Investigations & Reporting
*Items that need human decisions or research before any code is written*

**Email Handling & GDPR — Requirements Gaps**

The `Profile.Email` field supports a comma-separated list of addresses — all are used for OAuth login matching and Eventbrite sync, with the first as primary. This handles the common case of multi-account volunteers, but some gaps remain:

- **Email changes**: a volunteer can update their email in Tracker, but this silently breaks future Eventbrite matching — the new email won't match their existing Eventbrite registration. There's no defined process for updating an email safely. Consent records are attached to the profile (not the email), so re-collection shouldn't be needed — but the workflow needs to be explicit.

- **Children registered by parents**: children don't have their own email address. They're booked on Eventbrite by a parent, so their profile picks up whichever parent's email was used that day. A different parent books the same child next time → different email → false name clash → duplicate profile.

These are requirements gaps in the matching model, not bugs.

**Unmatched names from Records imports**
- 41 people from privacy consent form CSV have no matching profile in Tracker
- 2 people from membership CSV: "Ben Herycz" (no profile), "Dave Rowley" (probably David Rowley)
- Update facebook joined date?

**Pivot Table Reporting**
Need a way for non-technical users to do ad-hoc reporting. Options:
1. **CSV export** — denormalized dataset, open in Excel. Simple, already have session CSV export.
2. **Excel template** — pre-built pivot table that loads from CSV or API.
3. **Power Pivot** — live data model connecting to an API endpoint.
Constraint: users may not have full Excel installed (online-only licences). Option 1 is the safest starting point.

**Session Stats — Media Count: Total vs Public Only**
The `media` count in session Stats (and shown on session cards) uses `folder.childCount` from the SharePoint Drive folder — this counts all uploaded items regardless of `IsPublic`. Consider whether the count should reflect only public items (i.e. those visible to public/self-service users). Counting all items is simpler and gives admins a true picture of uploads; counting only public items matches what an anonymous visitor would see in the gallery. Currently counts all.

**Volunteer Count — Group Profile Exclusion**
Homepage and history stats count volunteers as any profile with `sessionsByFY > 0`, including group profiles (IsGroup = true). A group attending a session counts as 1 volunteer, which is defensible but slightly inflates the "people" count. Consider filtering to `IsGroup = false` in `volunteersFromStats()` in `routes/stats.ts`. Leave as-is for now — behaviour matches the previous entries-based count.

**Change Attribution / Audit Logging**
Track which user made each change, for accountability and audit purposes. Three options in increasing complexity:

1. **"Changed by" field on each list** *(simplest)* — Add a `ChangedBy` text field to key SharePoint lists (Entries, Sessions, etc.) and populate it from the logged-in user's session on every write. No history — overwrites on each change — but attribution is visible on the item. Schema change + a few lines in the repository update methods.

2. **Custom audit log list** *(medium)* — Keep app-level SharePoint access but write to a SharePoint Logs list on every mutation, storing: user (from session), action, entity ID, and timestamp. Queryable history without touching the auth model. Doesn't appear in SharePoint's native audit trail but gives full control over the schema.

3. **Delegated permissions / On-Behalf-Of flow** *(hardest, most "correct")*  — Use each user's own Entra ID access token for Graph API calls instead of the app's service account. Changes appear in SharePoint's native audit logs under the user's name. Requires: storing/refreshing per-user tokens in sessions, granting each user SharePoint site permissions, and significant rework of the auth and Graph client layers. Worth it for compliance requirements; otherwise Option 2 gives most of the benefit at a fraction of the cost.

## Media Gallery 
1. **Delete** Currently no way of deleting images.

## Recording No Shows
Currently we delete no shows. Suggest we start recording these against volunteers so we know who's likely to be a repeat offender.

## Taxonomy Stats
Divide the hours by the number of tags and allocate that way.