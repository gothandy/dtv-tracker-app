# Permissions

## Roles

There are **four** app permission levels. **Admin** extends **Check In** (same field-day capabilities plus admin-only endpoints and UI).

| Role | Auth required | Description |
|------|--------------|-------------|
| **Admin** | Yes (Microsoft) | Profile **`User`** must match sign-in email **and** email must be in **`ADMIN_USERS`**. Full access (includes all Check In capabilities). |
| **Check In** | Yes (Microsoft) | Profile **`User`** matches sign-in email; not in **`ADMIN_USERS`**. Field-day operations: check-in, hours, entries, sessions/profiles edits, regulars, uploads, consent collection, etc. |
| **Self-Service** | Yes (magic link / verification code on email) | View own profile, register for sessions, upload own photos. Cannot view other volunteers' data. Matched via Profile **`Email`**. |
| **Public** | No | Limited access to non-privacy data (sessions, groups, stats) |

> **"Trusted" (Microsoft)** = **Admin ∪ Check In** — both require a **Profile `User`** link to the Microsoft work account. There is **no** Microsoft “read-only” fallback: if Entra succeeds but no profile **`User`** matches, sign-in is **rejected** (`/login?reason=dtv-not-authorised`) and no session is opened (this is **not** the same as browsing as Public). **Self-Service** is not trusted for other volunteers’ PII.

## Configuration

**Microsoft (Check In / Admin):** A volunteer **Profiles** row must have **`User`** set to the person’s DTV Microsoft email. **Admin** additionally requires that email in **`ADMIN_USERS`** (comma-separated, case-insensitive):

```
ADMIN_USERS=first.last@dtv.org.uk,another.email@dtv.org.uk
```

**Self-Service:** `Profile.Email` (comma-separated) contains the volunteer address used for magic link / code. Editable by Check In and Admin.

**Public:** no session.

Capability stack (additive UI / testing): **Public** ⊆ **Check In tier** ⊆ **Admin tier**. Role is stored in `req.session.user.role`. The SPA sign-in route is **`/login`**.

### Future: Entra ID App Roles

To migrate to Entra ID roles, configure App Roles in the Azure app registration and replace the env var check in `routes/auth.ts` (line ~52) with `tokenResponse.idTokenClaims?.roles?.includes('Admin')`. The middleware, frontend CSS, and class markers all stay the same.

---

## Per-Page Permissions

### Unauthenticated (Public)

| Page | Access |
|------|--------|
| Dashboard, Groups list, Group detail, Sessions list | Full view (no volunteer names/emails) |
| Session detail | Session info, stats, tags, public photos; entries and free parking hidden |
| Volunteers list | Redirected to `/login` |
| Profile detail | Redirected to `/login` |
| Add entry, Entry detail, Admin | Redirected to `/login` |

### Self-Service (magic link / email code)

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

### Trusted Microsoft (Check In, Admin)

Check In and Admin share the **same** base visibility on these pages; **Admin** adds the items in the last column only.

| Page | Public sees | Check In additionally | Admin additionally |
|------|------------|----------------------|-------------------|
| **Dashboard** | Stats, word cloud | — | — |
| **Groups list** | Full view, regulars count | — | — |
| **Group detail** | Group info, stats, sessions, regulars list | — | Edit button, Create Session button |
| **Sessions list** | Full view | CSV download, checkboxes (Advanced) | Add Tags button |
| **Session detail** | Session info, stats, tags, photos; Privacy Protection card | Entries list, Free Parking card; check-in, Set Hours, Add Entry, Refresh, Edit (title + description); photo edit (caption, public, cover — not delete) | Delete session; delete photos; edit modal: Group, Date, Eventbrite ID |
| **Add entry** | Redirected (auth required) | Full access | — |
| **Entry detail** | Redirected (auth required) | Checked In toggle, Hours, Count, Upload | Notes, tag buttons, Delete Entry |
| **Volunteers list** | Redirected (auth required) | View, search, filter, sort, CSV download | Bulk Records |
| **Profile detail** | Redirected (auth required) | Edit profile (name/email/match name), Regulars checkboxes, inline hours (own profile only), Collect Consent | **`User`** field in edit modal, Add Record, record pill editing, inline hours (all profiles), Transfer, Delete Profile |
| **Consent page** | Redirected (auth required) | Full access | Full access |
| **Admin** | Redirected (auth required) | — | Eventbrite sync, Exports, Site link |

**trackerAccess:** For trusted callers, profile and entry payloads may include **`trackerAccess`** (`none` | `checkin` | `admin`) so dig leads can see who else has Microsoft Tracker access. Omitted for self-service/public.

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
| PATCH | `/api/entries/:id` | Cancel own booking only (`{ cancelled: true }`) for today/future sessions; handler requires the entry’s profile `Email` field (comma-separated) to contain the logged-in email |

Self-service users **cannot** access:
- `/api/profiles` (listing), `/api/profiles/export` — all volunteers list
- `/api/sessions/export`, `/api/records/export` — GDPR exports
- Any write endpoint not in the allowlist above

### Trusted Microsoft — Check In + Admin

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | All endpoints (except admin-only exports/listings) | View all data including volunteer PII |

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

Check In can make a session photo non-public via `PATCH /media/:itemId`; permanent delete requires admin (see below).

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
| DELETE | `/media/:itemId` | Delete session photo from media library |
| POST | `/eventbrite/*` | Eventbrite sync endpoints |
| POST | `/cache/clear` | Clear server cache |

---

## How It Works

### Backend

1. **Role assignment** ([`routes/auth/dtv.ts`](../routes/auth/dtv.ts)): Microsoft callback requires a Profile **`User`** match; else session is destroyed and redirect **`/login?reason=dtv-not-authorised`**. If matched: `ADMIN_USERS` → **`admin`**, else **`checkin`**. Magic link / verify flows set **`selfservice`** when Profile **`Email`** matches; no match → `reason=not-approved`. Role is `req.session.user.role`. Public = no session.

2. **Auth middleware** (`middleware/require-auth.ts`): Whitelist of public GET paths (`/api/stats`, `/api/sessions`, `/api/groups`, `/api/tags`, `/api/media`). All other paths require a session. Page requests redirect to `/login`; API requests return 401. API key auth bypasses this for `/api/eventbrite/` paths.

3. **Role enforcement** (`middleware/require-admin.ts`): After `requireAuth` on API routes:
   - **Admin**: passes through.
   - **Self-Service**: GETs restricted to `SELFSERVICE_ALLOWED_GET_PATTERNS` plus own profile slug; writes allowed only per `SELFSERVICE_ALLOWED_PATTERNS`.
   - **Check In**: GETs allowed except `ADMIN_ONLY_GET_PATTERNS` (exports, `/entries` list); writes allowed for `CHECKIN_ALLOWED_PATTERNS`.
   - Export GETs (`/sessions/export`, `/records/export`) and **`GET /entries`** — **Admin only**.

4. **Handler-level enforcement**: Route handlers perform a second ownership check for self-service users. `GET /api/profiles/:slug` checks `req.session.user.profileIds` and returns 403 if the profile ID doesn't match. Similar checks in entries and upload-context handlers.

5. **`/auth/me`**: Returns the user object including `role`, `profileSlug`, and `profileIds`, so the frontend knows which role is active.

### Frontend

1. **`useViewer()`** ([`frontend/src/composables/useViewer.ts`](../frontend/src/composables/useViewer.ts)): Fetches **`/auth/me`**. **`hasCheckInAccess`** = Admin or Check In (check-in tier). **`isTrusted`** = same. **`RoleContext`** is passed into presentational components (e.g. session cards).

2. **CSS classes** (see [`frontend/src/main.css`](../frontend/src/main.css) / layouts): **`admin-only`**, **`checkin-only`**, **`trusted-only`**, **`selfservice-only`**, etc., gate visibility.

3. **Class reference**:
   - `admin-only` — Admin only
   - `checkin-only` — Check In and Admin
   - `trusted-only` — Microsoft trusted (Admin + Check In)
   - `auth-only` — Any authenticated user
   - `unauth-only` — Public only
   - `selfservice-only` — Self-Service only

4. Prefer **additive** layouts: admins should see the same check-in surfaces plus extra controls, not unrelated replacement UIs per role.

### Public (No Authentication)

The following endpoints and pages require no authentication and are served before `requireAuth`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/login` | Unified sign-in (self-service email + Microsoft) |
| GET | `/upload` | Volunteer photo upload — uses `?entryId=` |

The upload flow calls `GET /api/entries/:id/upload-context` and `POST /api/entries/:id/photos` (ownership enforced for self-service). Check-in and admin can upload to any entry.

### API Key Auth

Scheduled sync calls (Azure Logic App) use `X-Api-Key` header auth and bypass role checks entirely. This only works for `/api/eventbrite/` paths.

### Media Privacy

`GET /api/media/*` is publicly accessible. However:
- Only items with `isPublic !== false` are returned to unauthenticated callers.
- The `name` and `webUrl` fields are stripped from the public response — these fields contain the uploader's name in the filename (generated by `mediaFilename()`), which would constitute PII exposure.
- Authenticated users receive the full response including `name` and `webUrl`.
