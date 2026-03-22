# Todo

## Homepage Personalisation — Step 4 (Remaining)

Steps 1–3 are done (calendar personalisation, word cloud Show History integration, personal word cloud on homepage). Remaining:

**Step 4 — CTA for next unregistered session**
For personalised users, show a lightweight "Also coming up" prompt/card for the next upcoming session they haven't registered for. No extra fetch needed — data is already loaded. Change: `session-section.js` + `styles.css`.

---

## Performance Optimisation (Remaining)

Phase 1 (session Stats field pre-computation), Phase 2 (profile Stats field + targeted profile queries), and Phase C (recent signups filtered query) are all done. Remaining:

**Phase 3 — Selective cache invalidation**
- Add `clearCacheByPrefix(prefix)` helper to `sharepoint-client.ts`
- Replace `clearCache()` (flushAll) in each repository write method with targeted key deletion; entry writes should only evict `entries`/`entries-profile-*`/`sessions_FY*`, not groups/profiles/sessions/records — critical for check-in day performance
- Stats refresh helpers already use `clearCacheKey()` (single-key eviction) as a stepping stone

**Phase 4 — Per-key TTL tuning**
- groups: 30 min, profiles/sessions/records: 10 min, regulars: 15 min, entries: 5 min (keep short — changes on every check-in)

---

## MatchName Field — Is It Redundant?

`MatchName` was added to support Eventbrite name matching (lowercased/normalised form of Title). Now that duplicate detection also normalises `Title` via `toMatchName()` at query time, and Eventbrite sync could do the same, the field may be unnecessary. Investigate:
- Does Eventbrite sync need a stored normalised name, or can it normalise on the fly?
- Are there profiles where `MatchName` differs meaningfully from `toMatchName(Title)`? (i.e. has it ever been manually overridden for a reason?)
- If redundant: remove the field from SharePoint, the repositories, and all sync/matching code.

---

## Email Handling & GDPR — Requirements Gaps

The `Profile.Email` field supports a comma-separated list of addresses — all are used
for OAuth login matching and Eventbrite sync, with the first as primary. This handles
the common case of multi-account volunteers, but some gaps remain:

- **Email changes**: a volunteer can update their email in Tracker, but this silently
  breaks future Eventbrite matching — the new email won't match their existing
  Eventbrite registration. There's no defined process for updating an email safely.
  Consent records are attached to the profile (not the email), so re-collection
  shouldn't be needed — but the workflow needs to be explicit.

- **Children registered by parents**: children don't have their own email address.
  They're booked on Eventbrite by a parent, so their profile picks up whichever
  parent's email was used that day. A different parent books the same child next time
  → different email → false name clash → duplicate profile.

These are requirements gaps in the matching model, not bugs.

---

## Session Stats — Media Count: Total vs Public Only
The `media` count in session Stats (and shown on session cards) uses `folder.childCount` from the SharePoint Drive folder — this counts all uploaded items regardless of `IsPublic`. Consider whether the count should reflect only public items (i.e. those visible to public/self-service users). Counting all items is simpler and gives admins a true picture of uploads; counting only public items matches what an anonymous visitor would see in the gallery. Currently counts all.

---

## FY Bar Chart + Word Cloud — Consolidation

The bar chart and word cloud are currently implemented independently across three pages with inconsistent behaviour. Consolidate into a single shared module and ensure consistent UX everywhere.

**Current state (problems):**
- Profile detail is missing the FY bar chart entirely (group detail has it, profile doesn't)
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

---

## Group Detail — Regulars Section Position
Move the Regulars list below the word cloud (currently appears above it). Word cloud is more useful at a glance; regulars are a management detail.

---

## Volunteer Count — Group Profile Exclusion
Homepage and history stats count volunteers as any profile with `sessionsByFY > 0`, including group profiles (IsGroup = true). A group attending a session counts as 1 volunteer, which is defensible but slightly inflates the "people" count. Consider filtering to `IsGroup = false` in `volunteersFromStats()` in `routes/stats.ts`. Leave as-is for now — behaviour matches the previous entries-based count.

---

## Sessions Advanced Filter — Minor UX Issues
- Count total doesn't refresh when the advanced group/tag filters are applied — still shows the unfiltered total until a manual re-trigger
- Advanced filter buttons (Apply/Clear) are in an odd position relative to the dropdowns
Low priority, just polish.

---

## Microsoft Planner Integration — Flag Issues from Sessions
Allow check-in users to create a task in Microsoft Planner directly from the session detail page. Useful for flagging issues noticed during a dig (equipment running low, machinery broken, etc.) so they reach the wider team.

- "Flag Issue" button (check-in+) on session detail → modal with title + optional notes → creates task in Planner via Graph API
- Session context (group, date) prepended to task title automatically
- Reuses existing client-credentials Graph API token
- Requires `Tasks.ReadWrite.All` application permission on Azure app registration
- New env vars: `PLANNER_PLAN_ID` (required), `PLANNER_BUCKET_ID` (optional)
- No task display in-app — team views/manages tasks in Teams/Planner

---

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
The `POST /api/backup/export-all` endpoint and admin "Export Backup" button are already implemented. Remaining:
1. Schedule via Azure Logic App (same as Eventbrite sync) for nightly automated runs; use API key auth
2. Overwrite the same fixed filenames each run (e.g. `groups.json`, `entries.json`) and rely on SharePoint document library version history for older snapshots; configure version retention limit in library settings

**Lists to cover**: Groups, Sessions, Entries, Profiles, Regulars, Records — all fetched directly via the Graph API list items endpoint, no existing export logic needed

## Automatic Eventbrite Notification on Homepage
When an admin/check-in user loads the homepage, silently check Eventbrite for new registrations and import them automatically — no button required. The Refresh button on "Recent Sign-ups" currently provides on-demand sync; a background version would fire `quick-sync` on `authReady` with a 5-minute cooldown so it doesn't trigger on every page load.

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

## Investigate Random Sign-Outs

Reports of users being signed out every 5–10 minutes. Root cause not yet confirmed — gather more data before implementing fixes.

**Likely causes (check in order):**
1. **"Always On" disabled** in Azure App Service (Configuration → General settings) — app goes idle between requests and restarts, wiping in-memory sessions. Free fix if this is the cause.
2. **App crashing** — App Insights Failures blade will show unhandled exceptions and process restarts. Check after next reported sign-out.
3. **MemoryStore** — `express-session` defaults to in-memory session storage; all sessions lost on any process restart/redeploy. Long-term fix regardless of root cause: provision Azure Cache for Redis and add `connect-redis`.

**Quick wins to apply once root cause confirmed:**
- Add `rolling: true` to session config so the 8-hour window resets on activity rather than expiring from login time
- Throw on startup if `SESSION_SECRET` env var is missing (currently falls back to a hardcoded string — a deploy without it invalidates all session cookies)
- Revert OAuth CSRF state to stateless HMAC tokens in `google.ts`/`facebook.ts` (regression from 2026-03-17 refactor, noted in technical-debt.md)

Key files: [app.js](app.js) (session config ~lines 38–48), [routes/auth/google.ts](routes/auth/google.ts), [routes/auth/facebook.ts](routes/auth/facebook.ts)

---

## Homepage spinner
While the cache is building a spinner would help usability.

## Standardise Modal Close Button
Add a consistent `[×]` close button to all modals (top-right corner). Currently modals use text buttons ("Cancel", "Close"). The About modal in `common.js` would be the first to adopt the pattern.

## Filters, Cards & Stats Consistency Review
Review all list pages (groups, sessions, volunteers, group detail, profile detail) for consistency and usability:
- Filter options and ordering (All / Last FY / This FY / Future where applicable)
- Stats shown on cards vs detail pages — are they the right ones, do they reflect the active filter?
- Card layouts — consistent use of meta items, green numbers, descriptions
- Empty states when a filter returns no results
- Default filter selection across pages

## Homepage Refresh Button — Public Appearance
The refresh icon at the top of the homepage is intentionally visible to public users (the loading spinner is useful), but it currently looks like a fully active button. For public users it should appear visually inactive — muted colour, no hover effect, `cursor: default` — so it doesn't imply interactivity. The spinner behaviour on click should remain.

## Multiple Emails UI
The `Profile.Email` field supports comma-separated addresses but there's no dedicated UI for managing them — currently edited as a raw string in the profile edit modal. Needs a proper multi-value input: add/remove individual addresses, clear labelling of which is primary (first in the list), and validation per address.

## Dig Lead and First Aider Session Roles

Two named roles per session: the designated Dig Lead and First Aider on the day.

**Session fields** (new SharePoint lookup fields on Sessions list, pointing to Profiles):
- `DigLead` — the lead dig leader for the session
- `FirstAider` — the designated first aider

Shown on session detail page (check-in+); editable via the session edit modal.

**Dig Lead training record** (Records list):
- New Type choice: `Dig Lead Training` — records who has completed dig lead training (Status: Accepted/Invited/etc., Date: training date)
- Displayed on profile detail Records section like other record types

**`#DigLead` entry tag** — marks sub dig leaders attending on the day (anyone with dig lead training who isn't the named session Dig Lead). Currently exists as a hashtag in entry Notes. Eventbrite sync should auto-tag `#DigLead` on entries where the volunteer has a `Dig Lead Training` record, similar to how `#NoPhoto` is tagged from Photo Consent. The named session Dig Lead may or may not also get this tag — TBD.

**Schema changes**: two new lookup fields on Sessions list; one new Type choice on Records list.

## #NoConsent Tag — Privacy Consent Warning
Similar to `#NoPhoto`, automatically tag entries `#NoConsent` when the volunteer has no Accepted Privacy Consent record. Prompts check-in users to collect consent on the day.
- Add `#NoConsent` to the tag icon config in `public/js/tag-icons.js` (red warning style, matching `#NoPhoto`)
- Add SVG icon for the badge
- Session refresh (`POST /api/sessions/:group/:date/refresh`) should tag `#NoConsent` on entries where the volunteer lacks consent, alongside the existing `#NoPhoto` logic
- Entry detail and session detail should render the badge; check-in users can clear it once consent is collected (or it auto-clears on next refresh)

## Records — Notes Field
Add a free-text `Notes` field to the Records list for recording supplementary information against a record, e.g. which email address was used to collect consent, first aid certificate type/expiry, DofE award level. Schema change (new single-line text field on the Records SharePoint list) plus UI changes on the record add/edit modal and record pill display.

## Human-Readable Entry URLs
Replace numeric entry URLs (`/entries/123/edit.html`) with consistent slug-based URLs: `/sessions/:groupKey/:date/:volunteerSlug/entry.html` (e.g. `/sessions/Sat/2026-03-21/andrew-davies-1/entry.html`).
- Express route serves `entry-detail.html` for the 5-segment pattern
- New API endpoint `GET /api/sessions/:groupKey/:date/entries/:volunteerSlug` resolves the entry (group+date → session; slug suffix → profile ID; profile+session → entry)
- `entry-detail.html` JS detects the new URL pattern and calls the new endpoint instead of `/api/entries/:id`
