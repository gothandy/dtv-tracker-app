# DTV Tracker App - Project Context

## Project Overview

This is a volunteer hours tracking and registration system for managing volunteer crews, events/sessions, and volunteer profiles. The application integrates with SharePoint for data storage and Eventbrite for event management.

## Tech Stack

- **Backend**: Node.js with Express 5, TypeScript for services/types
- **Frontend**: Vanilla HTML/CSS/JavaScript (mobile-first, served statically)
- **Data Storage**: SharePoint Online lists via Microsoft Graph API
- **External Integration**: Eventbrite API
- **Server**: Express server running on http://localhost:3000

## Current State

**Last Updated**: 2026-03-02

Feature-complete volunteer tracking application with:
- Express server entry point ([app.js](app.js)) loading compiled TypeScript routes, with public static assets (img, css, js, svg, manifest) served before auth
- Microsoft Entra ID authentication with session management ([routes/auth.ts](routes/auth.ts))
- TypeScript API routes split by domain ([routes/](routes/)) — 40+ endpoints across 11 route modules
- API response types defining the HTTP contract ([types/api-responses.ts](types/api-responses.ts))
- TypeScript service layer with Graph API client ([services/sharepoint-client.ts](services/sharepoint-client.ts))
- Eventbrite API client for event and attendee sync ([services/eventbrite-client.ts](services/eventbrite-client.ts))
- Data layer handling SharePoint quirks, enrichment, and FY stats ([services/data-layer.ts](services/data-layer.ts))
- Repository pattern for each SharePoint list ([services/repositories/](services/repositories/))
- Auth middleware with session auth + API key bypass ([middleware/require-auth.ts](middleware/require-auth.ts))
- Role-based authorization: Admin, Check In, Read Only, Self-Service, and Public ([middleware/require-admin.ts](middleware/require-admin.ts))
- Server-side caching with 5-minute TTL; all writes call `clearCache()` for immediate consistency
- Hosted on Azure App Service with Azure Logic App for scheduled Eventbrite sync
- Comprehensive SharePoint schema documentation ([docs/sharepoint-schema.md](docs/sharepoint-schema.md))

### Pages
- Dashboard with FY stats, progress bar, next session card ([public/index.html](public/index.html))
- Admin page with Eventbrite sync buttons, exports, backup export, site link, icon legend ([public/admin.html](public/admin.html))
- Groups listing with FY filter ([public/groups.html](public/groups.html))
- Group detail with FY stats, FY bar chart, regulars, sessions, edit/create/delete ([public/group-detail.html](public/group-detail.html))
- Sessions listing with FY filter, calendar view, text search, cascading group+tag filter dropdowns, checkbox selection, bulk tagging, and CSV download of selected sessions ([public/sessions.html](public/sessions.html))
- Session detail with entries, check-in, set hours, move group, session taxonomy tags, session photo gallery, edit/delete ([public/session-detail.html](public/session-detail.html))
- Volunteers listing with FY filter, sort, group filter, search, advanced filters (type/hours/records), checkbox selection, bulk records, CSV download ([public/volunteers.html](public/volunteers.html))
- Profile detail with FY stats, FY bar chart (click to filter by year, click again to deselect; starts unselected), group hours (always visible; hours update for selected FY), entries with inline hours editing, group filter, records, regulars ([public/profile-detail.html](public/profile-detail.html))
- Entry edit page with tag buttons, auto-fields, volunteer email (mailto link, auth users only), delete, Upload button (check-in+) ([public/entry-detail.html](public/entry-detail.html))
- Add entry page with volunteer search and create ([public/add-entry.html](public/add-entry.html))
- Unified sign-in page: Google and Facebook (volunteer self-service) and Microsoft (trusted users) options with role descriptions; Facebook login uses `m.facebook.com` OAuth URL (bypasses Android intent routing to native app) + `target="_blank"` in PWA standalone (forces Chrome Custom Tab) + `window.open()` in Chrome (keeps login.html alive for BroadcastChannel/polling) ([public/login.html](public/login.html))
- Volunteer media upload page (authenticated): context loaded from `?entryId=` param; ownership enforced for self-service users ([public/upload.html](public/upload.html))
- Shared utilities: header, footer, breadcrumbs, date formatting; exposes `window.currentUser` and dispatches `authReady` event after auth ([public/js/common.js](public/js/common.js))
- Tag/badge icon config and rendering ([public/js/tag-icons.js](public/js/tag-icons.js))
- Session card rendering shared module ([public/js/session-cards.js](public/js/session-cards.js))
- Session taxonomy tag UI: term tree picker, tag pills; supports `onConfirm` callback for bulk tagging from sessions listing ([public/js/session-tags.js](public/js/session-tags.js))
- Calendar widget for sessions listing ([public/js/calendar.js](public/js/calendar.js))
- Lightbox photo viewer for session galleries ([public/js/lightbox.js](public/js/lightbox.js))
- SVG icons for badges and tags ([public/svg/](public/svg/))

## Data Model

The application uses 6 SharePoint lists on the Tracker site (`/sites/tracker`):

### 1. Groups List
**GUID**: `6e86cef7-a855-41a4-93e8-6e01a80434a2`
- Stores volunteer group/crew information
- Key fields: Title (key), Name (display), Description, EventbriteSeriesID

### 2. Sessions List
**GUID**: `583867bd-e032-4940-89b5-aa2d5158c5d0`
- Stores volunteer event/session information
- Key fields: Title, Date (required), Group (lookup to Groups), Notes, EventbriteEventID
- Registrations and hours are calculated from Entries, not stored

### 3. Entries List
**GUID**: `7146b950-94e3-4c94-a0d7-310cf2fbd325`
- Junction table linking volunteers to sessions
- Key fields: Session (indexed lookup to Sessions), Profile (lookup to Profiles), Checked, Hours, Count
- Notes field supports hashtags: #New #Child #DofE #DigLead #FirstAider #Regular
- **Naming**: "Entry" is the preferred term in the UI. An entry starts as a registration (before the session) and becomes an attendance record (after check-in). Avoid "registration" or "attendee" as labels since the same record serves both purposes.

### 4. Profiles List
**GUID**: `84649143-9e10-42eb-b6ee-2e1f57033073`
- Stores volunteer profile information
- Key fields: Title (name), Email, MatchName (for Eventbrite matching), User (DTV Entra ID username), IsGroup
- Hours are calculated from Entries, not stored

### 5. Regulars List
**GUID**: `925c96fd-9b3a-4f55-b179-ed51fc279d39`
- Junction table linking volunteers to groups they regularly attend
- Key fields: Profile (lookup to Profiles), Group (lookup to Groups)

### 6. Records List
**GUID**: `2666a819-1275-4fce-83a3-5bb67b4da83a`
- Tracks consents, benefits, and governance items per profile
- Key fields: Profile (lookup to Profiles), Type (choice), Status (choice), Date
- Type choices: Privacy Consent, Photo Consent, Newsletter Consent, Charity Membership, Discount Card

## Entity Relationships

```
Groups 1:N Sessions
Sessions 1:N Entries N:1 Profiles
Groups N:N Regulars N:N Profiles
Profiles 1:N Records
```

## Membership Rules

A volunteer becomes a **member** when they have a "Charity Membership" record with Status "Accepted" in the Records list. Groups cannot be members.

### Member badge and highlighting
- **MEMBER badge**: Based on Charity Membership record status from the Records list (`isMember` field on ProfileResponse).
- **CARD badge**: Shows discount card status — green if Accepted, orange if Invited (`cardStatus` field on ProfileResponse).
- **Card highlighting** (green background on volunteers list): Hours-based — changes with the FY filter, highlights if the volunteer meets 15h in the selected FY.
- This separation makes at-risk members easy to spot: when filtering "This FY", a volunteer with a MEMBER badge but no green highlight hasn't yet reached 15h this year.

The threshold constant for card highlighting is `MEMBER_HOURS = 15` in `volunteers.html`. Profile and entry detail pages use the literal `15`.

## Key Workflows

1. **Create Groups**: Set up volunteer crews/groups
2. **Schedule Sessions**: Create events/sessions for each group with dates
3. **Volunteer Registration**: Create Entries linking volunteers (Profiles) to Sessions
4. **Check-in**: Mark Entries as Checked when volunteers show up
5. **Hours Tracking**: Record hours at session level and individual entry level
6. **Regular Tracking**: Assign core volunteers as Regulars for specific crews

## External Integrations

### Eventbrite
- Groups have `EventbriteSeriesID` for linking to Eventbrite recurring series
- Sessions have `EventbriteEventID` for linking to specific events
- Profiles use `MatchName` field (lowercase name) to sync with Eventbrite registrations
- Eventbrite client ([services/eventbrite-client.ts](services/eventbrite-client.ts)):
  - `getOrgEvents()` — fetches all live events from the organisation, used to create new sessions
  - `getAttendees()` — fetches attendees for a specific event, used to create profiles and entries
- Sync endpoints ([routes/eventbrite.ts](routes/eventbrite.ts)):
  - `POST /api/eventbrite/event-and-attendee-update` — combined sync (sessions + attendees), returns summary string
  - `POST /api/eventbrite/sync-sessions` — matches Eventbrite events to groups by SeriesID, creates missing sessions; group-matched sessions are created with a blank `Name` (display title falls back to group name + date)
  - `POST /api/eventbrite/sync-attendees` — fetches attendees for upcoming sessions, creates profiles/entries/consent records; detects name clashes (same name + different email = different person) and tags the new entry `#Duplicate` for admin review
  - `GET /api/eventbrite/unmatched-events` — lists events with no matching group (for admin UI)
- Admin page ([public/admin.html](public/admin.html)) provides manual sync buttons
- Scheduled daily sync via Azure Logic App calling `event-and-attendee-update` with API key auth

### Scheduled Sync
- **Azure Logic App** (Consumption plan) calls `POST /api/eventbrite/event-and-attendee-update` daily
- Auth: `X-Api-Key` header checked in `middleware/require-auth.ts` for `/api/eventbrite/` paths
- Env vars: `API_SYNC_KEY` (shared secret), `EVENTBRITE_ORGANIZATION_ID`, `EVENTBRITE_API_KEY`
- Response includes `summary` field for email notifications

### SharePoint
- All data stored in SharePoint Online lists on the Tracker site (`/sites/tracker`)
- Access via Microsoft Graph API
- Lists have specific GUIDs for API access

## Development Guidelines

### Workflow
- **Always plan first**: Use plan mode before implementing any non-trivial change. Explore the codebase, understand existing patterns, and get approval before writing code.
- **Documentation review after every change**: After completing any update, review all relevant documentation and update it to reflect the current state:
  - [CLAUDE.md](CLAUDE.md) — project context, file structure, features list
  - [docs/test-script.md](docs/test-script.md) — manual test script (add/update test cases)
  - [docs/permissions.md](docs/permissions.md) — if roles or endpoint access change
  - [docs/technical-debt.md](docs/technical-debt.md) — code/architecture issues only (not functionality)
  - [docs/todo.md](docs/todo.md) — planned functionality and feature ideas
  - [docs/progress.md](docs/progress.md) — development session notes (resolved items tracked here)
  - [docs/sharepoint-schema.md](docs/sharepoint-schema.md) — if SharePoint fields change
  - [readme.md](readme.md) — if dependencies or configuration change
- **Archive outdated docs**: Move superseded or no-longer-relevant documentation to `docs/legacy/` rather than deleting it.

### Comments and Documentation Philosophy
- **Readable code over comments**: Use clear naming conventions so the code explains itself
- **Comments explain why, not what**: Use comments for things developers need to know that aren't obvious from the code (SharePoint quirks, business rules, workarounds)
- **Comments as a tech debt flag**: If you need a comment to explain what code does, consider whether the code itself could be clearer

### Code Style
- TypeScript for services, types, and routes; CommonJS for entry point (`app.js`)
- Lowercase-hyphen naming for files (e.g., `data-layer.ts`, `test-auth.js`)
- Keep code simple and maintainable
- Follow existing patterns in the codebase

### Calculated Fields Over Stored Fields
- **Always calculate derived values** (hours totals, counts) from source entries at query time rather than storing them.
- The app is the source of truth for all derived data. No Power Automate flows update fields.
- Cached data (5-minute TTL) keeps this performant despite recalculating on each request.

### SharePoint Integration
- Use the documented GUIDs and internal field names from [docs/sharepoint-schema.md](docs/sharepoint-schema.md)
- Field name constants live in `services/field-names.ts` — use these instead of hardcoded strings
- SharePoint returns lookup IDs as strings — always use `safeParseLookupId()` from `data-layer.ts` for comparisons
- Indexed fields: `Session` in Entries list for performance

### Data Validation
- Sessions require a Date field
- Entries default Count to 1
- Entries default Checked to false

### Permissions / Authorization
- Five access levels: **Admin** (full access), **Check In** (field-day operations), **Read Only** (view all data, no edits), **Self-Service** (volunteer Google/Facebook login — own profile only + session sign-up + photo upload), **Public** (unauthenticated — limited non-privacy view)
- **"Trusted"** = Admin + Check In + Read Only (all Microsoft-auth roles). Self-Service is explicitly **not** trusted — it has stricter restrictions than Read Only: cannot view other volunteers' profiles, entries, or the volunteers listing; owns its own data only.
- Admin users set via `ADMIN_USERS` env var; Check In users matched by Profile `User` field (Microsoft login); Self-Service users matched by Profile `Email` field (Google/Facebook login); everyone else logged in via Microsoft is Read Only; unauthenticated visitors are Public
- Role computed at login, stored in session; Public has no session role (`body[data-role]` not set)
- Backend: `requireAuth` middleware gates all API routes (whitelist of public paths); `requireAdmin` middleware enforces role-based rules; route handlers enforce ownership for self-service users (profile ID check on `GET /api/profiles/:slug` etc.)
- Frontend: CSS classes control visibility — `.admin-only`, `.checkin-only`, `.trusted-only` (Admin + Check In + Read Only; hidden from Self-Service and Public), `.auth-only` (any logged-in user), `.unauth-only` (Public only), `.selfservice-only` (Self-Service only)
- All login redirects (page redirects, 401 API responses) go to `/login.html` — never `/auth/login`
- Full reference: [docs/permissions.md](docs/permissions.md)

### Error Handling
- **Propagate errors by default** — do not catch exceptions in service methods and return empty results. Let errors surface to the route handler where they can be logged and returned as a proper HTTP error response.
- **No silent empty returns** — returning `[]` or `null` from a catch block is only acceptable when the feature is genuinely optional and the empty state is indistinguishable from "not configured". Always add a comment explaining the deliberate choice.
- **API endpoints must return non-2xx on failure** — a route that fetches required data and fails must return 4xx/5xx, not `{ success: true, data: [] }`. The frontend cannot distinguish a real empty result from a failed fetch if the status is always 200.
- **Frontend fetch handlers must log on failure** — every `if (!res.ok) return;` is a bug waiting to happen. At minimum call `console.error` with the status and URL. For user-facing features, call `showError()` so the failure is visible.
- **When adding try/catch, ask**: *does swallowing this error hide a misconfiguration or a broken API call?* If yes, re-throw or log prominently rather than returning empty data.

### Security Considerations
- Validate all user input before SharePoint API calls
- Prevent XSS when displaying user-generated content
- Use parameterized queries for SharePoint REST API
- Don't commit secrets or SharePoint credentials to git

## File Structure

```
dtv-tracker-app/
├── app.js                          # Express server entry point (CommonJS)
├── package.json
├── tsconfig.json                   # TypeScript configuration
├── CLAUDE.md                       # This file - project context for Claude
├── docs/
│   ├── permissions.md             # Role-based permissions reference
│   ├── progress.md                # Development session notes
│   ├── sharepoint-schema.md       # SharePoint list schemas and field names
│   ├── sharepoint-setup.md        # One-time SharePoint/Entra ID setup (admin)
│   ├── technical-debt.md          # Performance and optimization tracking
│   ├── test-script.md             # Manual test script (prioritised)
│   ├── todo.md                    # Planned work items
│   ├── requirements.md            # Mobile & field usage requirements
│   └── legacy/                    # Superseded documentation
├── types/
│   ├── api-responses.ts           # API response types (HTTP contract)
│   ├── group.ts                   # Group entity types (SharePoint + domain)
│   ├── session.ts                 # Session entity types
│   ├── sharepoint.ts              # Profile, Entry, Regular types + utilities
│   └── express-session.d.ts       # Session type augmentation for auth
├── services/
│   ├── auth-config.ts             # MSAL client configuration (Microsoft OAuth)
│   ├── google-auth.ts             # Google OAuth helper (DIY, native fetch — no extra packages)
│   ├── sharepoint-client.ts       # Graph API client (auth, caching, pagination)
│   ├── eventbrite-client.ts       # Eventbrite API client (org events, attendees)
│   ├── eventbrite-sync.ts         # Shared attendee sync logic and consent question mapping
│   ├── taxonomy-client.ts         # SharePoint Term Store client for session tagging (Graph beta)
│   ├── field-names.ts             # SharePoint field name constants
│   ├── data-layer.ts              # Data conversion, enrichment, validation
│   ├── media-upload.ts            # Shared media helpers: EXIF date extraction, filename generation
│   └── repositories/
│       ├── groups-repository.ts
│       ├── sessions-repository.ts
│       ├── profiles-repository.ts
│       ├── entries-repository.ts
│       ├── regulars-repository.ts
│       └── records-repository.ts
├── routes/
│   ├── api.ts                     # Router mounting all route modules
│   ├── groups.ts                  # Groups CRUD endpoints
│   ├── sessions.ts                # Sessions CRUD + CSV exports
│   ├── entries.ts                 # Entries CRUD
│   ├── profiles.ts                # Profiles CRUD + records + transfer (+ regulars via sub-routes)
│   ├── regulars.ts                # Regulars management
│   ├── stats.ts                   # Dashboard stats, cache, config
│   ├── eventbrite.ts              # Eventbrite sync endpoints
│   ├── tags.ts                    # Session taxonomy tag read/write endpoints
│   ├── media.ts                   # Authenticated media endpoints (list photos/videos, batch counts, stream)
│   ├── backup.ts                  # Backup endpoint: exports all 6 lists as JSON to SharePoint Shared Documents
│   └── auth.ts                    # Authentication routes (login, callback, logout)
├── middleware/
│   ├── require-auth.ts            # Auth guard middleware
│   └── require-admin.ts           # Role-based authorization (Admin / Check In / Read Only / Public)
├── public/
│   ├── index.html                 # Dashboard homepage
│   ├── groups.html                # Groups listing with FY filter
│   ├── group-detail.html          # Group detail with stats and regulars
│   ├── sessions.html              # Sessions listing with FY filter, search, cascading filters, bulk tag
│   ├── session-detail.html        # Session detail with entries and check-in
│   ├── volunteers.html            # Volunteers listing with filters and search
│   ├── profile-detail.html        # Profile detail with FY stats, inline hours, group filter
│   ├── entry-detail.html          # Entry edit page with tag buttons; Upload button (check-in+) navigates to upload page
│   ├── add-entry.html             # Add entry (register volunteer to session)
│   ├── upload.html                # Volunteer photo upload page — uses ?entryId= param; redirects to login.html if unauthenticated
│   ├── login.html       # Unified sign-in page: volunteer (Google/Facebook) and trusted users (Microsoft) options; Facebook uses m.facebook.com + target=_blank (PWA) / window.open (Chrome)
│   ├── admin.html                 # Admin page (Eventbrite sync, exports)
│   ├── css/
│   │   └── styles.css             # Global stylesheet (brand colours, Rubik Dirt font)
│   ├── favicon.ico                # 32x32 ICO (PNG embedded), generated from logo-930.jpg
│   ├── site.webmanifest           # PWA manifest for Add to Home Screen
│   ├── img/
│   │   ├── logo.png               # DTV logo (180x179, used in header)
│   │   ├── logo-930.jpg           # High-res source logo (930x924) — use this for generating icons
│   │   ├── icon-192.png           # Home screen icon 192x192 (generated from logo-930.jpg)
│   │   └── icon-512.png           # Home screen icon 512x512 (generated from logo-930.jpg)
│   ├── js/
│   │   ├── common.js              # Shared header, footer, utilities; injects favicon + manifest links
│   │   ├── tag-icons.js           # Tag/badge icon config and rendering
│   │   ├── session-cards.js       # Shared session card rendering (used by sessions.html, index.html)
│   │   ├── session-tags.js        # Session taxonomy tag UI: term tree picker, tag pills
│   │   ├── word-cloud.js          # Reusable word cloud component (hours by taxonomy tag); used on homepage, group detail, profile detail
│   │   ├── sessions.js            # Sessions listing logic (filters, search, cascading dropdowns, bulk tagging, CSV download)
│   │   ├── calendar.js            # Calendar widget for sessions listing
│   │   ├── lightbox.js            # Lightbox photo viewer for session galleries
│   │   ├── profile-detail.js      # Profile detail page logic (FY filter, bar chart, entries, records, transfer)
│   │   ├── volunteers.js          # Volunteers listing logic (filters, sort, checkbox selection, bulk records, CSV download)
│   │   ├── session-detail.js      # Session detail logic (entries, check-in, hours, photos, edit/delete)
│   │   └── group-detail.js        # Group detail logic (bar chart, sessions, edit/delete, new session)
│   └── svg/                       # SVG icons for badges and tags
└── test/
    ├── test-auth.js               # Authentication verification
    └── test-*.js                  # Various data/integration tests
```

## Implemented Features

- [x] Full CRUD for groups, sessions, profiles, entries, records
- [x] Volunteer registration for sessions (add entry)
- [x] Bulk add regulars to a session
- [x] Check-in volunteers at events (checkbox per entry)
- [x] Record volunteer hours (per-entry and bulk set hours)
- [x] View volunteer profiles and hours history
- [x] FY filtering on all list pages (This FY / Last FY / All)
- [x] Group-filtered volunteer listing with search
- [x] Regulars management (add/remove per group)
- [x] Member status tracking (Charity Membership record + hours-based highlighting)
- [x] Consent/records management on profile detail page
- [x] CSV exports (sessions, profiles, records)
- [x] Profile transfer (merge duplicate profiles)
- [x] Microsoft authentication (Entra ID OAuth)
- [x] Role-based permissions: Admin (full access), Check In (field-day operations), Read Only (view all data), Public (unauthenticated, limited non-privacy view)
- [x] Partial public access: homepage, sessions listing, groups listing, group detail, and session detail accessible without login; volunteer names, profiles, entries, free parking, and recent signups require auth; login button shown in header for unauthenticated visitors
- [x] Mobile-first responsive design (44px touch targets)
- [x] Eventbrite session sync (org events → sessions via SeriesID matching)
- [x] Eventbrite attendee sync (attendees → profiles/entries/consent records); name-clash detection flags `#Duplicate` entries when same name + different email; backfills email on existing profiles without one
- [x] Admin page with manual sync buttons, unmatched events, icon legend
- [x] SVG icons for badges (member, card, group) and entry tags
- [x] Bulk add/update records from volunteers page (with optional checkbox selection of specific volunteers)
- [x] CSV export filtered to selected volunteers (`?profileIds=` param on `/api/profiles/export`)
- [x] Volunteer checkbox selection on listing page (Advanced mode; Select all/Deselect all respects active filters)
- [x] Sessions listing: text search (title/description, min 3 chars)
- [x] Sessions listing: advanced filter section with cascading group and tag dropdowns (each dropdown shows only options present in the other filter's result set)
- [x] Sessions listing: bulk tagging (checkbox selection + `POST /api/sessions/bulk-tag`; merges tags, deduplicates by termGuid)
- [x] Sessions listing: CSV download of selected sessions (Advanced mode; columns: Date, Group, Name, Registrations, Hours, New, Children, Regulars, Financial Year; public-accessible)
- [x] Move session between groups
- [x] API key auth for scheduled sync (Azure Logic App)
- [x] Azure App Service deployment
- [x] Comprehensive manual test script ([docs/test-script.md](docs/test-script.md))
- [x] PWA web manifest and icons for Add to Home Screen (Chrome on Android)
- [x] Volunteer media upload via authenticated entry ID (check-in+ clicks Upload on entry detail; navigates to `/upload.html?entryId=:id`; self-service volunteers can also upload from their profile or session page); accepts photos (JPG, PNG, WebP, HEIC) and short videos (MP4, MOV); max 10 files, 10 MB each
- [x] Upload completion screen: shows file count, review notice; link to session gallery
- [x] Self-service volunteer login via Google and Facebook OAuth — `Profile.Email` field controls access (set by admin/check-in); volunteers can view their own profile only, register for future sessions, and upload photos to their own entries; other volunteers' data is blocked at both middleware and handler level
- [x] Volunteer sign-up for sessions (self-service role): own profile only, future sessions only, duplicate prevention
- [x] Self-service privacy hardening: regulars list hidden on group pages (shows "You are a regular" message if applicable); profile slugs require numeric ID suffix to prevent path confusion; `GET /api/tags/hours-by-taxonomy?profile=` requires authentication; media `name`/`webUrl` (contain uploader PII) stripped from public API responses
- [x] Facebook login on Android (Chrome + PWA standalone): `m.facebook.com` OAuth URL bypasses Android's intent filter for the native Facebook app; PWA uses `target="_blank"` to open a Chrome Custom Tab (CCT shares cookies with PWA); Chrome uses `window.open()` to keep login.html alive; BroadcastChannel + `/auth/me` polling detects session completion
- [x] Session media storage in SharePoint Media Library (`{groupKey}/{date}/` folder structure); capture date extracted from EXIF (images) or MP4/MOV container metadata (videos)
- [x] Session gallery with lightbox viewer on session detail page; videos play inline in the lightbox via `GET /api/media/:itemId/stream` (Graph API `/content` redirect); public users restricted to `IsPublic` items
- [x] Session taxonomy tags via SharePoint Managed Metadata Term Store (hierarchical tag picker)
- [x] Calendar view on sessions listing page (month navigation, clickable session dates)
- [x] FY bar charts on group detail and profile detail pages
- [x] Manual backup export: admin button calls `POST /api/backup/export-all`, writes all 6 lists as JSON to `Tracker Archive/` folder in SharePoint Shared Documents (requires `BACKUP_DRIVE_ID` env var)
- [x] Taxonomy tag word cloud on homepage, group detail, and profile detail — `GET /api/tags/hours-by-taxonomy` aggregates hours by tag with ancestor rollup; reusable `word-cloud.js` component; respects all FY/group/profile filters; CSV download

## Planned Features

- [ ] Sync logging (SharePoint Logs list or similar)
- [ ] Report generation (custom date ranges, exportable)

## Running the Application

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript
npm run dev       # Start with auto-reload (development)
# or
npm start         # Start without auto-reload

# Visit http://localhost:3000

npm run test:live # Integration tests — require live SharePoint credentials, run locally only
```

## Important Notes

- Financial year runs April 1 to March 31
- Session lookup in Entries is indexed for performance
- Standard SharePoint metadata fields (ID, Created, Modified, Author, Editor) are auto-managed
- Always read [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for the complete field definitions before working with SharePoint data
- The app calculates all derived values (hours, registrations, membership) from source data at query time.
- The `Code` field on the Entries list is no longer used for uploads (the code-based upload system was replaced by authenticated entry-ID-based upload). The field is left in SharePoint but no longer read or written.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars are required for Google OAuth (self-service volunteer login). Create a Web Application OAuth 2.0 client in Google Cloud Console and register `/auth/google/callback` as an authorized redirect URI for both localhost and production domains.
- `MEDIA_LIBRARY_DRIVE_ID` env var required for photo uploads (Graph API Drive ID of the SharePoint Media document library).
- `TAXONOMY_TERM_SET_ID` env var: GUID of the SharePoint Term Store term set for session tagging. **Required** — tags will not appear without it.
- `BACKUP_DRIVE_ID` env var: Drive ID of the Shared Documents library on the Tracker site (different from `MEDIA_LIBRARY_DRIVE_ID`). Required for the backup export endpoint. Find via `GET /v1.0/sites/{siteId}/drives` — look for the drive named "Documents".
- Term Store access requires `TermStore.ReadWrite.All` application permission on the Azure app registration (admin consent required). Uses the Graph API **beta** endpoint — see [docs/tagging.md](docs/tagging.md) for full implementation notes.

## Known Constraints

- SharePoint API rate limits may apply
- Graph API orderby on Sessions list returns 400 - sorting done in Node.js instead
- Single line of text fields have 255 character max length
- Lookup fields require the related list item to exist first

---

*Last Updated: 2026-03-01*
