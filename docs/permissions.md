# Permissions

## Roles

| Role | Description |
|------|-------------|
| **Admin** | Full access to all features |
| **Check In** | Field-day operations: view data, check in volunteers, set hours, add entries, edit sessions/profiles, manage regulars |
| **Read Only** | View all data, no editing |

## Configuration

**Admin** users are set via the `ADMIN_USERS` environment variable — comma-separated email addresses, case-insensitive:

```
ADMIN_USERS=first.last@dtv.org.uk,another.email@dtv.org.uk
```

**Check In** users are determined by matching the login email against the `User` field on Profiles. If a profile's `User` value matches the authenticated user's email, they get Check In access.

**Read Only** is the default for any other authenticated DTV user.

Role is determined at login and stored in the session.

### Future: Entra ID App Roles

To migrate to Entra ID roles, configure App Roles in the Azure app registration and replace the env var check in `routes/auth.ts` (line ~52) with `tokenResponse.idTokenClaims?.roles?.includes('Admin')`. The middleware, frontend CSS, and class markers all stay the same.

---

## Per-Page Permissions

| Page | Read Only sees | Check In additionally sees | Admin additionally sees |
|------|---------------|--------------------------|------------------------|
| **Dashboard** | Full view | — | — |
| **Groups list** | Full view | — | — |
| **Group detail** | View group, stats, regulars, sessions | — | Edit button, Create Session button |
| **Sessions list** | Full view | — | — |
| **Session detail** | View entries and stats | Check-in checkboxes, Set Hours, Add Entry, Refresh, Edit (title + description only) | Delete; edit modal: Group, Date, Eventbrite ID |
| **Add entry** | View only (API blocks writes) | Full access (search, select, create entry, add new profile) | — |
| **Entry detail** | View only (controls disabled) | Checked In toggle, Hours field | Count, Notes, tag buttons, Delete Entry |
| **Volunteers list** | View, search, filter, sort | — | Bulk Records, Download CSV |
| **Profile detail** | View stats/entries/groups | Edit profile (name/email/match name), Regulars checkboxes, Inline hours editing (own profile only) | Username field in edit modal, Add Record, record pill editing, Inline hours editing (all profiles), Transfer, Delete Profile |
| **Admin** | Icon Legend only | — | Eventbrite sync, Exports, Site link |

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

1. **Role assignment** (`routes/auth.ts`): At login, the user's email is checked against `ADMIN_USERS` (→ admin), then against Profile `User` fields (→ checkin), otherwise → readonly. Role is stored in `req.session.user.role`.

2. **Enforcement** (`middleware/require-admin.ts`): A single middleware applied before all API routes in `routes/api.ts`. Read Only users are blocked from all non-GET requests. Check In users are allowed specific write endpoints via pattern matching. Everything else requires Admin.

3. **`/auth/me`**: Returns the user object including `role`, so the frontend knows which role is active.

### Frontend

1. **`common.js`**: After fetching `/auth/me`, sets `document.body.dataset.role` to the user's role (`admin`, `checkin`, or `readonly`).

2. **`styles.css`**: CSS rules handle visibility per role:
   - `body:not([data-role="admin"]) .admin-only { display: none !important; }` — hides admin elements
   - `body:not([data-role="admin"]) .admin-clickable { pointer-events: none; }` — disables clicks (record pills)
   - `body[data-role="readonly"] .checkin-only { display: none !important; }` — hides check-in action buttons
   - `body[data-role="readonly"] ...` — disables inline controls (checkboxes, inputs) with `pointer-events: none; opacity: 0.6`

3. **HTML**: Elements marked with `class="admin-only"` (admin tier) or `class="checkin-only"` (check-in tier).

### API Key Auth

Scheduled sync calls (Azure Logic App) use `X-Api-Key` header auth and bypass role checks entirely. This only works for `/api/eventbrite/` paths.
