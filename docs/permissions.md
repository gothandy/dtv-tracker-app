# Permissions

## Roles

There are five access levels:

| Role | Auth required | Description |
|------|--------------|-------------|
| **Admin** | Yes (Microsoft) | Full access to all features |
| **Check In** | Yes (Microsoft) | Field-day operations: view all data, check in volunteers, set hours, add entries, edit sessions/profiles, manage regulars, upload photos |
| **Read Only** | Yes (Microsoft) | View all volunteer data (profiles, entries, hours) — no editing |
| **Self-Service** | Yes (Google) | Volunteer login: view own profile, register for sessions, upload own photos |
| **Public** | No | Limited read-only access to non-privacy data only (sessions, groups, stats) |

## Configuration

**Admin** users are set via the `ADMIN_USERS` environment variable — comma-separated email addresses, case-insensitive:

```
ADMIN_USERS=first.last@dtv.org.uk,another.email@dtv.org.uk
```

**Check In** users are determined by matching the login email against the `User` field on Profiles. If a profile's `User` value matches the authenticated user's email, they get Check In access.

**Read Only** is the default for any other authenticated DTV user (logged in via Microsoft but not in `ADMIN_USERS` and no matched Profile).

**Self-Service** users log in via Google OAuth. Access is granted if the Google account email matches the `Email` field on a volunteer Profile (case-insensitive). To grant access: set `Profile.Email` to the volunteer's Google email. To revoke: clear it. The `Email` field is editable only by Check In and Admin users.

**Public** is any unauthenticated visitor — no login required, but volunteer names, profiles, entries, and parking info are hidden.

Role is determined at login and stored in the session.

### Future: Entra ID App Roles

To migrate to Entra ID roles, configure App Roles in the Azure app registration and replace the env var check in `routes/auth.ts` (line ~52) with `tokenResponse.idTokenClaims?.roles?.includes('Admin')`. The middleware, frontend CSS, and class markers all stay the same.

---

## Per-Page Permissions

| Page | Public sees | Read Only additionally sees | Check In additionally sees | Admin additionally sees |
|------|------------|----------------------------|--------------------------|------------------------|
| **Dashboard** | Stats, word cloud | — | — | — |
| **Groups list** | Full view | — | — | — |
| **Group detail** | Group info, stats, sessions | — | — | Edit button, Create Session button |
| **Sessions list** | Full view | — | — | — |
| **Session detail** | Session info, stats, tags, photos; Privacy Protection card | Entries list, Free Parking card | Check-in checkboxes, Set Hours, Add Entry, Refresh, Edit (title + description only) | Delete; edit modal: Group, Date, Eventbrite ID |
| **Add entry** | Redirected (auth required) | View only (API blocks writes) | Full access (search, select, create entry, add new profile) | — |
| **Entry detail** | Redirected (auth required) | View only (controls disabled) | Checked In toggle, Hours field, Count, Upload button | Notes, tag buttons, Delete Entry |
| **Volunteers list** | Redirected (auth required) | View, search, filter, sort | — | Bulk Records, Download CSV |
| **Profile detail** | Redirected (auth required) | View stats/entries/groups | Edit profile (name/email/match name), Regulars checkboxes, Inline hours editing (own profile only) | Username field in edit modal, Add Record, record pill editing, Inline hours editing (all profiles), Transfer, Delete Profile |
| **Admin** | Redirected (auth required) | Icon Legend only | — | Eventbrite sync, Exports, Site link |

---

## API Endpoint Permissions

### Everyone (all authenticated users)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | All endpoints (except exports) | View data |

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
| POST | `/entries/:id/photos` | Upload photos to an entry (any entry for check-in; own entry only for self-service) |

### Admin Only

| Method | Endpoint | Purpose |
|--------|----------|---------|
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

1. **Role assignment** (`routes/auth.ts`): At Microsoft login, the user's email is checked against `ADMIN_USERS` (→ `admin`), then against Profile `User` fields (→ `checkin`), otherwise → `readonly`. At Google login, the email is matched against Profile `Email` fields (→ `selfservice`); no match → redirect to login.html with `?reason=not-approved`. Role is stored in `req.session.user.role`. Unauthenticated visitors have no role (Public).

2. **Enforcement** (`middleware/require-admin.ts`): A single middleware applied before all API routes in `routes/api.ts`. Read Only users are blocked from all non-GET requests. Check In users are allowed specific write endpoints via pattern matching. Everything else requires Admin.

3. **`/auth/me`**: Returns the user object including `role`, so the frontend knows which role is active.

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

3. **HTML**: Elements marked with `class="admin-only"` (admin tier), `class="checkin-only"` (check-in tier), `class="auth-only"` (any logged-in user), `class="unauth-only"` (Public only), or `class="selfservice-only"` (self-service only).

### Public (No Authentication)

The following endpoints and pages require no authentication and are served before `requireAuth`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/upload.html` | Volunteer photo upload page — uses `?entryId=` query param; redirects to `/login.html` if not authenticated |
| GET | `/login.html` | Volunteer login page (Google OAuth) |

The upload page calls `GET /api/entries/:id/upload-context` (requires login → 401 redirects to login.html) and `POST /api/entries/:id/photos` (requires login + ownership for self-service users). Self-service users can only upload to their own entries; check-in and admin users can upload to any entry.

### Self-Service API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | All (except exports) | View all data |
| POST | `/sessions/:group/:date/entries` | Register for a session (own profile only; future sessions only; no duplicates) |
| POST | `/entries/:id/photos` | Upload photos to own entry |

### API Key Auth

Scheduled sync calls (Azure Logic App) use `X-Api-Key` header auth and bypass role checks entirely. This only works for `/api/eventbrite/` paths.
