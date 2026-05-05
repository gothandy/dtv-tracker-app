# Permissions

## Roles

There are five access levels:

| Role | Auth required | Description |
|------|--------------|-------------|
| **Admin** | Yes (Microsoft) | Full access to all features |
| **Check In** | Yes (Microsoft) | Field-day operations: view all data, check in volunteers, set hours, add entries, edit sessions/profiles, manage regulars, upload photos |
| **Read Only** | Yes (Microsoft) | View all volunteer data (profiles, entries, hours) — no editing |
| **Self-Service** | Yes (Google or Facebook) | Volunteer login: view own profile, register for sessions, upload own photos. Cannot view other volunteers' data. |
| **Public** | No | Limited read-only access to non-privacy data only (sessions, groups, stats) |

> **"Trusted" users** = Admin + Check In + Read Only. These are the three Microsoft-authenticated roles. Self-Service (Google/Facebook) is **not** trusted and has tighter restrictions than Read Only.

## Configuration

**Admin** users are set via the `ADMIN_USERS` environment variable — comma-separated email addresses, case-insensitive:

```
ADMIN_USERS=first.last@dtv.org.uk,another.email@dtv.org.uk
```

**Check In** users are determined by matching the login email against the `User` field on Profiles. If a profile's `User` value matches the authenticated user's email, they get Check In access.

**Read Only** is the default for any other authenticated DTV user (logged in via Microsoft but not in `ADMIN_USERS` and no matched Profile).

**Self-Service** users log in via Google or Facebook OAuth. Access is granted if the OAuth account email matches the `Email` field on a volunteer Profile (case-insensitive). To grant access: set `Profile.Email` to the volunteer's email. To revoke: clear it. The `Email` field is editable only by Check In and Admin users. Facebook login via the installed PWA uses `window.open()` + session polling to work around Android's intent system routing the OAuth callback to the native Facebook app.

**Public** is any unauthenticated visitor — no login required, but volunteer names, profiles, entries, and parking info are hidden.

Role is determined at login and stored in the session. All login/redirect flows use `/login.html` (the unified sign-in page).

### Future: Entra ID App Roles

To migrate to Entra ID roles, configure App Roles in the Azure app registration and replace the env var check in `routes/auth.ts` (line ~52) with `tokenResponse.idTokenClaims?.roles?.includes('Admin')`. The middleware, frontend CSS, and class markers all stay the same.

---

## Per-Page Permissions

### Unauthenticated (Public)

| Page | Access |
|------|--------|
| Dashboard, Groups list, Group detail, Sessions list | Full view (no volunteer names/emails) |
| Session detail | Session info, stats, tags, public photos; entries and free parking hidden |
| Volunteers list | Redirected to `/login.html` |
| Profile detail | Redirected to `/login.html` |
| Add entry, Entry detail, Admin | Redirected to `/login.html` |

### Self-Service (volunteer Google/Facebook login)

| Page | Access |
|------|--------|
| Dashboard, Groups list, Sessions list | Full view (same as Public) |
| Group detail | Group info, stats, sessions; regulars list **hidden** (shows "You are a regular" message if applicable) |
| Session detail | Session info, entries visible; check-in, set-hours, refresh, edit **hidden** |
| Sessions list | Advanced search/tag filter available; CSV download and checkboxes **hidden** |
| Volunteers list | **Blocked** — redirected (API returns 403) |
| Profile detail (own) | View own stats, entries, groups; edit profile **hidden**; duplicates/linked profiles **hidden** |
| Profile detail (other) | **403** — page shows "You don't have permission to view this profile" with back link |
| Entry detail (own) | View own entry; Upload button visible |
| Entry detail (other) | **403** |
| Add entry | Can register for future sessions (own profile only) |
| Admin | Redirected |

### Trusted (Read Only, Check In, Admin)

| Page | Public sees | Read Only additionally sees | Check In additionally sees | Admin additionally sees |
|------|------------|----------------------------|--------------------------|------------------------|
| **Dashboard** | Stats, word cloud | — | — | — |
| **Groups list** | Full view, regulars count | — | — | — |
| **Group detail** | Group info, stats, sessions, regulars list | — | — | Edit button, Create Session button |
| **Sessions list** | Full view | CSV download, checkboxes (Advanced) | — | Add Tags button |
| **Session detail** | Session info, stats, tags, photos; Privacy Protection card | Entries list, Free Parking card | Check-in checkboxes, Set Hours, Add Entry, Refresh, Edit (title + description only) | Delete; edit modal: Group, Date, Eventbrite ID |
| **Add entry** | Redirected (auth required) | View only (API blocks writes) | Full access (search, select, create entry, add new profile) | — |
| **Entry detail** | Redirected (auth required) | View only (controls disabled) | Checked In toggle, Hours field, Count, Upload button | Notes, tag buttons, Delete Entry |
| **Volunteers list** | Redirected (auth required) | View, search, filter, sort, CSV download | — | Bulk Records |
| **Profile detail** | Redirected (auth required) | View stats/entries/groups, duplicates/linked profiles | Edit profile (name/email/match name), Regulars checkboxes, Inline hours editing (own profile only), Collect Consent button | Username field in edit modal, Add Record, record pill editing, Inline hours editing (all profiles), Transfer, Delete Profile |
| **Consent page** | Redirected (auth required) | **Blocked** — page loads but API returns 403 | Full access — collect privacy and photo consent | Full access |
| **Admin** | Redirected (auth required) | Icon Legend only | — | Eventbrite sync, Exports, Site link |

---

## API Endpoint Permissions

### Public (unauthenticated)

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/stats` | No PII |
| GET | `/api/sessions`, `/api/sessions/:group/:date` | No volunteer names/emails |
| GET | `/api/groups`, `/api/groups/:key` | No regulars list (empty array returned) |
| GET | `/api/tags/*` | Tag metadata only; `?profile=` param requires auth |
| GET | `/api/media/*` | `isPublic` items only; `name` and `webUrl` fields stripped (contain uploader's name in filename) |

All other endpoints require authentication (return 401 from `require-auth.ts`).

### Self-Service (volunteer login)

Self-service users can GET the above public endpoints plus a limited additional set. All others return 403:

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/profiles/:slug` | **Own profile only** — handler checks `req.session.user.profileIds`; returns 403 for others |
| GET | `/api/entries/:id` | Own entry only (handler enforces) |
| GET | `/api/entries/:id/upload-context` | Own entry only |
| POST | `/api/sessions/:group/:date/entries` | Register for a session (own profile only; future sessions; no duplicates) |
| POST | `/api/entries/:id/photos` | Upload photos to own entry |
| PATCH | `/api/entries/:id` | Cancel own booking only (`{ cancelled: true }`); handler requires the entry’s profile `Email` field (comma-separated) to contain the logged-in email |

Self-service users **cannot** access:
- `/api/profiles` (listing), `/api/profiles/export` — all volunteers list
- `/api/sessions/export`, `/api/records/export` — GDPR exports
- Any write endpoint not in the allowlist above

### Trusted — Everyone (Read Only, Check In, Admin)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | All endpoints (except exports) | View all data including volunteer PII |

### Check In + Admin

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/entries/:id` | Check-in toggle, set hours |
| PATCH | `/sessions/:group/:date` | Edit session title/description |
| PATCH | `/profiles/:slug` | Edit profile name/email |
| POST | `/sessions/:group/:date/entries` | Add entry to session |
| POST | `/profiles` | Create new profile |
| POST | `/profiles/:slug/regulars` | Add regular |
| DELETE | `/regulars/:id` | Remove regular |
| POST | `/sessions/:group/:date/refresh` | Refresh session (regulars + Eventbrite) |
| POST | `/entries/:id/photos` | Upload photos to an entry |
| PATCH | `/media/:itemId` | Update media item metadata (title, isPublic) |
| POST | `/profiles/:id/consent` | Collect privacy and photo consent (upserts both records) |

### Admin Only

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/entries` | All entries listing (admin-only) |
| GET | `/sessions/export` | CSV export (GDPR) |
| GET | `/records/export` | CSV export (GDPR) |
| POST | `/groups` | Create group |
| PATCH | `/groups/:key` | Edit group |
| DELETE | `/groups/:key` | Delete group |
| POST | `/sessions` | Create session |
| DELETE | `/sessions/:group/:date` | Delete session |
| DELETE | `/entries/:id` | Delete entry |
| POST | `/profiles/:slug/records` | Create record |
| PATCH | `/records/:id` | Edit record |
| DELETE | `/records/:id` | Delete record |
| POST | `/records/bulk` | Bulk create/update records |
| POST | `/profiles/:slug/transfer` | Transfer profile |
| DELETE | `/profiles/:slug` | Delete profile |
| POST | `/eventbrite/*` | Eventbrite sync endpoints |
| POST | `/cache/clear` | Clear server cache |

---

## How It Works

### Backend

1. **Role assignment** (`routes/auth.ts`): At Microsoft login, the user's email is checked against `ADMIN_USERS` (→ `admin`), then against Profile `User` fields (→ `checkin`), otherwise → `readonly`. At Google/Facebook login, the email is matched against Profile `Email` fields (→ `selfservice`); no match → redirect to `/login.html?reason=not-approved`. Role is stored in `req.session.user.role`. Unauthenticated visitors have no role (Public).

2. **Auth middleware** (`middleware/require-auth.ts`): Whitelist of public GET paths (`/api/stats`, `/api/sessions`, `/api/groups`, `/api/tags`, `/api/media`). All other paths require a session. Page requests redirect to `/login.html`; API requests return 401. API key auth bypasses this for `/api/eventbrite/` paths.

3. **Role enforcement** (`middleware/require-admin.ts`): A single middleware applied after `requireAuth` on all API routes.
   - **Admin**: passes through.
   - **Read Only**: all GETs allowed (except export endpoints); all writes blocked (403 "Read only access").
   - **Self-Service**: GETs allowed only for patterns in `SELFSERVICE_ALLOWED_GET_PATTERNS` plus own profile slug (regex `/^\/profiles\/[^/]+-\d+$/`); writes allowed only for patterns in `SELFSERVICE_ALLOWED_PATTERNS`.
   - **Check In** (default for authenticated non-Admin/Read Only/Self-Service): GETs allowed; writes allowed for patterns in `CHECKIN_ALLOWED_PATTERNS`; everything else 403.
   - Export GETs (`/sessions/export`, `/records/export`) are in `ADMIN_ONLY_GET_PATTERNS` — blocked for Check In and all lower roles.

4. **Handler-level enforcement**: Route handlers perform a second ownership check for self-service users. `GET /api/profiles/:slug` checks `req.session.user.profileIds` and returns 403 if the profile ID doesn't match. Similar checks in entries and upload-context handlers.

5. **`/auth/me`**: Returns the user object including `role`, `profileSlug`, and `profileIds`, so the frontend knows which role is active.

### Frontend

1. **`common.js`**: After fetching `/auth/me`, sets `document.body.dataset.role` to the user's role (`admin`, `checkin`, `readonly`, or `selfservice`). Also stores `window.currentUser` and dispatches a `authReady` custom event for pages that need to react to auth state. For Public (unauthenticated), `data-role` is never set.

2. **`styles.css`**: CSS rules handle visibility per role:
   - `body:not([data-role="admin"]) .admin-only { display: none !important; }` — hides admin elements for all non-admins (including Public)
   - `body:not([data-role="admin"]) .admin-clickable { pointer-events: none; }` — disables clicks (record pills)
   - `body:not([data-role]) .checkin-only { display: none !important; }` — hides check-in action buttons for Public
   - `body[data-role="readonly"] .checkin-only { display: none !important; }` — hides check-in action buttons for Read Only
   - `body[data-role="selfservice"] .checkin-only { display: none !important; }` — hides check-in UI for self-service users
   - `body[data-role="readonly"] ...` — disables inline controls (checkboxes, inputs) with `pointer-events: none; opacity: 0.6`
   - `.auth-only { display: none !important; }` / `body[data-role] .auth-only { display: revert !important; }` — hides auth-gated content from Public
   - `body[data-role] .unauth-only { display: none !important; }` — shows Public-only content (e.g. Privacy Protection card) only to unauthenticated visitors
   - `.selfservice-only { display: none !important; }` / `body[data-role="selfservice"] .selfservice-only { display: revert !important; }` — shows self-service-only UI
   - `.trusted-only { display: none !important; }` / `body[data-role="admin"] .trusted-only`, `body[data-role="checkin"] .trusted-only`, `body[data-role="readonly"] .trusted-only { display: revert !important; }` — shows content only for the three trusted (Microsoft-auth) roles; hidden from Self-Service and Public

3. **HTML class reference**:
   - `admin-only` — Admin only
   - `checkin-only` — Check In and Admin only (hidden for Read Only, Self-Service, Public)
   - `trusted-only` — All three Microsoft-auth roles (Admin + Check In + Read Only); hidden from Self-Service and Public
   - `auth-only` — Any authenticated user (all roles including Self-Service)
   - `unauth-only` — Public (unauthenticated) only
   - `selfservice-only` — Self-Service only

4. **JavaScript guards**: Some UI elements can't be controlled by CSS alone (e.g. checkbox rendering per card). These use `window.currentUser.role` directly. For example, sessions.js gates checkbox rendering: `const isTrusted = role === 'admin' || role === 'checkin' || role === 'readonly';`.

### Public (No Authentication)

The following endpoints and pages require no authentication and are served before `requireAuth`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/login.html` | Unified sign-in page (Google, Facebook, Microsoft options) |
| GET | `/upload.html` | Volunteer photo upload page — uses `?entryId=` query param; redirects to `/login.html` if not authenticated |

The upload page calls `GET /api/entries/:id/upload-context` (requires login → 401 redirects to `/login.html`) and `POST /api/entries/:id/photos` (requires login + ownership for self-service users). Self-service users can only upload to their own entries; check-in and admin users can upload to any entry.

### API Key Auth

Scheduled sync calls (Azure Logic App) use `X-Api-Key` header auth and bypass role checks entirely. This only works for `/api/eventbrite/` paths.

### Media Privacy

`GET /api/media/*` is publicly accessible. However:
- Only items with `isPublic !== false` are returned to unauthenticated callers.
- The `name` and `webUrl` fields are stripped from the public response — these fields contain the uploader's name in the filename (generated by `mediaFilename()`), which would constitute PII exposure.
- Authenticated users receive the full response including `name` and `webUrl`.
