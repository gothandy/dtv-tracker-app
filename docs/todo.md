# Todo

## Bulk Email to Volunteers?
Both from filtered volunteers page, groups (regulars) and session page? Or provide emails to cut and paste into email client.

## Unmatched names from Records imports
- 41 people from privacy consent form CSV have no matching profile in Tracker
- 2 people from membership CSV: "Ben Herycz" (no profile), "Dave Rowley" (probably David Rowley)
- Update facebook joined date?

## Volunteer List Filters
Automatically link through to the volunteers page with advanced filters set from the admin page.
- **"Nearly there"** — profiles not yet members but approaching 15h this FY
- **"Needs card"** — members who haven't been issued a card yet (requires Records)
- **"At risk"** — members who aren't on track to meet 15h this FY

## Pivot Table Reporting
Need a way for non-technical users to do ad-hoc reporting. Options:
1. **CSV export** — denormalized dataset, open in Excel. Simple, already have session CSV export.
2. **Excel template** — pre-built pivot table that loads from CSV or API.
3. **Power Pivot** — live data model connecting to an API endpoint.
Constraint: users may not have full Excel installed (online-only licences). Option 1 is the safest starting point.

## Use of #Tags?
Many of the tags can be retired? Things like "#New" can be calculated, #Regulars comes from the lookup. Perhaps overtime gently retire each once possible. Leaving those that are required like dig lead, etc. All tags now use SVG icons configured in `public/js/tag-icons.js` — easy to add/remove/rename tags by editing this file.

## Timesheet functionality?
it is possible to fir users to edit the hours directly im people's profile it needs checking for usability.

## Change Attribution / Audit Logging
Track which user made each change, for accountability and audit purposes. Three options in increasing complexity:

1. **"Changed by" field on each list** *(simplest)* — Add a `ChangedBy` text field to key SharePoint lists (Entries, Sessions, etc.) and populate it from the logged-in user's session on every write. No history — overwrites on each change — but attribution is visible on the item. Schema change + a few lines in the repository update methods.

2. **Custom audit log list** *(medium)* — Keep app-level SharePoint access but write to a SharePoint Logs list on every mutation, storing: user (from session), action, entity ID, and timestamp. Queryable history without touching the auth model. Doesn't appear in SharePoint's native audit trail but gives full control over the schema.

3. **Delegated permissions / On-Behalf-Of flow** *(hardest, most "correct")*  — Use each user's own Entra ID access token for Graph API calls instead of the app's service account. Changes appear in SharePoint's native audit logs under the user's name. Requires: storing/refreshing per-user tokens in sessions, granting each user SharePoint site permissions, and significant rework of the auth and Graph client layers. Worth it for compliance requirements; otherwise Option 2 gives most of the benefit at a fraction of the cost.

## Nightly CSV Backup
Export all six SharePoint lists to CSV nightly as a safety net against accidental bulk deletion or data corruption.

**Implementation approach** (mirrors Eventbrite sync pattern):
1. Add a `POST /api/backup/export-all` endpoint that fetches all items from each list and writes the raw JSON response to the `Backups` folder in the Shared Documents library on the Tracker site (`/sites/Tracker/Shared Documents/Backups/`). No transformation needed — just `JSON.stringify` the raw SharePoint response. Will need the Drive ID for the Shared Documents library (separate from `MEDIA_LIBRARY_DRIVE_ID` which is the Media library used for photos).
2. ~~Add a manual "Export Backup" button to the admin page~~ ✓ Done — `POST /api/backup/export-all` endpoint and admin button implemented
3. Once validated, schedule via Azure Logic App (same as Eventbrite sync) for nightly automated runs; use API key auth
4. Overwrite the same fixed filenames each run (e.g. `groups.json`, `entries.json`) and rely on SharePoint document library version history for older snapshots; configure version retention limit in library settings

**Lists to cover**: Groups, Sessions, Entries, Profiles, Regulars, Records — all fetched directly via the Graph API list items endpoint, no existing export logic needed

## Sync Logging
The Eventbrite sync endpoints return structured results but there's no persistent log. Azure Logic App run history provides some visibility, but a SharePoint "Logs" list would allow viewing sync history from within the app.
- SharePoint Logs list with fields: Title (timestamp), Summary (text), Source (Manual/Scheduled)
- Write to Logs list at the end of `event-and-attendee-update` endpoint
- Display on admin page with last sync timestamp

## PWA Push Notifications
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

## Post sessions to Facebook Page
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

## Import from Facebook events?
Some groups use Facebook for registration. Maybe use an OCR to get the text, and match against the names in the profile list.

## Breadcrumb / Back Navigation
Current breadcrumb is static (path-based) and doesn't reflect where the user navigated from. Options:
- **Back button**: Replace breadcrumb with a single context-aware "Back" button using `history.back()` or `document.referrer`. More mobile-friendly (large touch target, familiar UX).
- **Context-sensitive breadcrumb**: Detect referrer to build the correct trail (e.g. entry page reached from session vs profile shows different parent). Started on profile detail page but incomplete.

A back button is probably the right approach — simpler, works well on mobile, and avoids the complexity of reconstructing navigation history from the URL alone.

## Homepage spinner
While the cache is building a spinner would help usability.

## Filters, Cards & Stats Consistency Review
Review all list pages (groups, sessions, volunteers, group detail, profile detail) for consistency and usability:
- Filter options and ordering (All / Last FY / This FY / Future where applicable)
- Stats shown on cards vs detail pages — are they the right ones, do they reflect the active filter?
- Card layouts — consistent use of meta items, green numbers, descriptions
- Empty states when a filter returns no results
- Default filter selection across pages
