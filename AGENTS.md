# AGENTS.md

Project context and development guidelines for coding agents. For Claude Code-specific instructions see [CLAUDE.md](CLAUDE.md).

---

## Project Overview

A volunteer hours tracking and registration system for managing volunteer crews, events/sessions, and volunteer profiles. Integrates with SharePoint for data storage and Eventbrite for event management.

## Tech Stack

- **Backend**: Node.js with Express 5, TypeScript for services/types
- **Frontend**: Vue 3 + Vite + TypeScript (mobile-first SPA)
- **Data Storage**: SharePoint Online lists via Microsoft Graph API
- **External Integration**: Eventbrite API
- **Server**: Express server running on http://localhost:3000

## Current State

Feature-complete volunteer tracking application with:
- Express server entry point ([app.js](app.js)) loading compiled TypeScript routes; in dev integrates Vite as middleware (HMR at `:3000`); in production serves `frontend/dist/` as static
- Microsoft Entra ID authentication with session management ([routes/auth/dtv.ts](routes/auth/dtv.ts))
- TypeScript API routes split by domain ([routes/](routes/)) — 40+ endpoints across 11 route modules
- API response types defining the HTTP contract ([types/api-responses.ts](types/api-responses.ts))
- TypeScript service layer with Graph API client ([services/sharepoint-client.ts](services/sharepoint-client.ts))
- Eventbrite API client for event and attendee sync ([services/eventbrite-client.ts](services/eventbrite-client.ts))
- Data layer handling SharePoint quirks, enrichment, and FY stats ([services/data-layer.ts](services/data-layer.ts))
- Repository pattern for each SharePoint list ([services/repositories/](services/repositories/))
- Auth middleware with session auth + API key bypass ([middleware/require-auth.ts](middleware/require-auth.ts))
- Role-based authorization: Admin, Check In, Read Only, Self-Service, and Public ([middleware/require-admin.ts](middleware/require-admin.ts))
- Server-side caching with tier-informed per-entity TTLs and targeted per-repository invalidation
- Hosted on Azure App Service with Azure Logic App for scheduled Eventbrite sync

### Pages

All pages are Vue 3 SPA routes defined in [frontend/src/router/index.ts](frontend/src/router/index.ts).

- Dashboard with FY stats, next session card, personalised calendar ([HomePage.vue](frontend/src/pages/HomePage.vue))
- Admin page with Eventbrite sync buttons, exports, backup export, site shortcuts ([AdminPage.vue](frontend/src/pages/AdminPage.vue))
- Groups listing with FY filter ([GroupListPage.vue](frontend/src/pages/GroupListPage.vue))
- Group detail with FY stats, FY bar chart, regulars, sessions, edit/create/delete ([GroupDetailPage.vue](frontend/src/pages/GroupDetailPage.vue))
- Sessions listing with FY filter, calendar view, text search, cascading filters, bulk tagging, CSV download ([SessionListPage.vue](frontend/src/pages/SessionListPage.vue))
- Session detail with entries, check-in, set hours, move group, tags, photo gallery ([SessionDetailPage.vue](frontend/src/pages/SessionDetailPage.vue))
- Volunteers listing with FY filter, sort, group filter, search, advanced filters, bulk records, CSV download ([ProfileListPage.vue](frontend/src/pages/ProfileListPage.vue))
- Profile detail with FY stats, FY bar chart, group hours, entries, records ([ProfileDetailPage.vue](frontend/src/pages/ProfileDetailPage.vue))
- Entries page (admin-only): all entries with notes/adult filters, checkbox selection, edit modal ([EntriesPage.vue](frontend/src/pages/EntriesPage.vue))
- Unified sign-in page: magic link + verification code (self-service) + Microsoft (trusted) ([LoginPage.vue](frontend/src/pages/LoginPage.vue))
- Volunteer media upload page ([UploadPage.vue](frontend/src/pages/UploadPage.vue))
- Consent collection page at `/profiles/:slug/consent` ([ConsentPage.vue](frontend/src/pages/ConsentPage.vue))

---

## Data Model

The application uses 7 SharePoint lists on the Tracker site (`/sites/tracker`). Full schema: [docs/sharepoint-schema.md](docs/sharepoint-schema.md).

### Lists (GUIDs)

| List | GUID | Purpose |
|------|------|---------|
| Groups | `6e86cef7-a855-41a4-93e8-6e01a80434a2` | Volunteer crews |
| Sessions | `583867bd-e032-4940-89b5-aa2d5158c5d0` | Events/sessions |
| Entries | `7146b950-94e3-4c94-a0d7-310cf2fbd325` | Volunteer↔session junction |
| Profiles | `84649143-9e10-42eb-b6ee-2e1f57033073` | Volunteer profiles |
| Regulars | `925c96fd-9b3a-4f55-b179-ed51fc279d39` | Profile↔group regulars |
| Records | `2666a819-1275-4fce-83a3-5bb67b4da83a` | Consents/governance |
| Logins | `e3b5c7fb-313a-44b4-9363-a4e4d2b65a57` | Magic link token hashes |

### Entity Relationships

```
Groups 1:N Sessions
Sessions 1:N Entries N:1 Profiles
Groups N:N Regulars N:N Profiles
Profiles 1:N Records
```

### Key Naming

- **Entry**: preferred term. Starts as a registration (before session), becomes an attendance record after check-in. Avoid "registration" or "attendee".
- **Profile.Email**: comma-separated list — first is primary; all used for OAuth matching and Eventbrite sync.

### Membership Rules

A volunteer becomes a **member** when they have a "Charity Membership" record with Status "Accepted" in the Records list. Groups cannot be members.

- **MEMBER badge**: based on Charity Membership record (`isMember` field on ProfileResponse)
- **CARD badge**: discount card status — green if Accepted, orange if Invited (`cardStatus`)
- **Card highlighting** (green background on volunteers list): hours-based — 15h threshold in selected FY (`MEMBER_HOURS = 15` in ProfileListPage.vue)

---

## Key Workflows

1. **Create Groups**: set up volunteer crews/groups
2. **Schedule Sessions**: create events/sessions for each group with dates
3. **Volunteer Registration**: create Entries linking volunteers (Profiles) to Sessions
4. **Check-in**: mark Entries as Checked when volunteers show up
5. **Hours Tracking**: record hours at session level and individual entry level
6. **Regular Tracking**: assign core volunteers as Regulars for specific crews

---

## External Integrations

### Eventbrite

- Groups have `EventbriteSeriesID` for linking to Eventbrite recurring series
- Sessions have `EventbriteEventID` for linking to specific events
- Profiles use `MatchName` field (lowercase name) for Eventbrite matching
- Sync endpoints ([routes/eventbrite.ts](routes/eventbrite.ts)):
  - `POST /api/eventbrite/nightly-update` — full nightly run
  - `POST /api/eventbrite/sync-sessions` — matches events to groups by SeriesID, creates missing sessions
  - `POST /api/eventbrite/sync-attendees` — creates profiles/entries/consent; `#Duplicate` tag on name clashes

### Scheduled Sync

- **Azure Logic App** calls `POST /api/eventbrite/nightly-update` daily at 05:30 UTC
- Auth: `X-Api-Key` header; env var: `API_SYNC_KEY`

### SharePoint

- All data in SharePoint Online lists via Microsoft Graph API
- Field name constants in `services/field-names.ts` — use these, not hardcoded strings
- `safeParseLookupId()` from `data-layer.ts` for lookup ID comparisons

---

## Development Guidelines

### Frontend Architecture

Read [docs/app-dev-guidelines.md](docs/app-dev-guidelines.md) before designing a new Vue feature — layering model, component boundaries, modals as stateless forms, capabilities over roles, and the stats computation pattern.

### Stats Pattern

All data computation is server-side in the stats pipeline (ProfileStats → EntryStats → SessionStats). The backend parses JSON once via `parseSessionStats()`. The frontend helper `sessionDisplayStats(stats, regularsCount?, limits?)` in `frontend/src/utils/sessionStats.ts` does all lightweight derived maths. Components call it once and render `display.*` — never do stats arithmetic in a component or template.

### Comments and Documentation Philosophy

- **Readable code over comments**: use clear naming so the code explains itself
- **Comments explain why, not what**: use comments for hidden constraints, SharePoint quirks, workarounds
- **Comments as a tech debt flag**: if you need a comment to explain what code does, consider whether the code could be clearer

### Vue Frontend: Auth Context Pattern

- **`useViewer()`** is the single UI-facing composable for auth/role state. Pages and components must import only from `useViewer` — never directly from `useAuth` or `useRole` (ESLint enforces this).
- **`RoleContext`** interface — plain snapshot for passing auth context into components as a prop.
- **Pages**: `const profile = useViewer()` → use `profile.isAdmin` in template; pass `:profile="profile.context"` to child components.
- **Components**: accept `profile?: RoleContext` as a prop — never call `useViewer()` inside a component.
- **`isOperational`** = Admin or Check-In.

### Vue Frontend: Page and Store Pattern

- **Pages own stores and profile**: pages call stores, call `useViewer()`, and wire both together. Components receive data as props only.
- **`SessionDetailResponse` flows through the store as-is**: no mapping layer. Components get all server-computed fields directly.
- **`SessionResponse` is mapped**: sessions listing store maps `SessionResponse` → `Session` in `mapSession()`. Only place that translation happens.
- **Server-computed enrichment**: `isBookable`, `financialYear`, `regularsCount`, `deriveLimits` computed server-side in the route handler — not re-derived on the client.
- **Session capacity limits**: stored in the `Limits` field as JSON (e.g. `{"new":4,"total":20}`). `deriveLimits()` in `data-layer.ts` fills missing limits. Limits are config — never stored in Stats.

### Vue Frontend: URL / Path Conventions

- **Path builders live in `frontend/src/router/index.ts`** — single source of truth for URL structure.
- Export a named function for each entity, e.g. `sessionPath(groupKey, date)`. Never construct entity URLs inline in components or stores.

### Vue Frontend: Component CSS

- Scoped styles (`<style scoped>`) belong in the component that owns them. Promote to `frontend/src/styles/` only when shared across two or more components.
- `main.css` holds design tokens and global base styles only.

### Vue Frontend: Responsive Strategy

- Three breakpoints in `@theme` in `main.css`: `--breakpoint-sm: 30em`, `--breakpoint-md: 48em`, `--breakpoint-lg: 64em`
- **`em` not `px` or `rem`** in media queries.
- **CSS**: write the literal `em` value — e.g. `@media (width < 48em)`. Tailwind's `theme()` cannot be used in scoped component styles.
- **JS breakpoint checks**: use `belowBreakpointMd()` from `frontend/src/utils/breakpoints.ts`.

### Code Style

- TypeScript for services, types, and routes; CommonJS for entry point (`app.js`)
- Lowercase-hyphen naming for files (e.g. `data-layer.ts`, `test-auth.js`)
- Keep code simple and maintainable; follow existing patterns

### Caching Architecture

Four independent caches:

| Cache | Where | What | TTL | Invalidation |
|---|---|---|---|---|
| **NodeCache** (`sharePointClient.cache`) | `sharepoint-client.ts` | SharePoint list data | varies | Targeted per-repository write |
| **Column schema cache** | `sharepoint-client.ts` | SharePoint column definitions | 1 hr | Manual admin clear |
| **Taxonomy tree cache** (`treeCache`) | `taxonomy-client.ts` | Term Store hierarchy | 1 hr | Manual admin clear |
| **Cover image cache** (`coverCache`) | `services/cover-cache.ts` | Session cover image bytes | 1 hr | Bust on `coverMediaId` change |

**NodeCache per-entity TTLs:**

| Entity | TTL | Rationale |
|---|---|---|
| `groups`, `sessions`, `profiles`, `regulars` | 6 hr | Warmed nightly; covers check-in window |
| `entries` | 5 min | Check-in tier — live writes on the day |
| `records`, stats, media, slug/item keys | 24 hr | Targeted invalidation handles writes |

Targeted invalidation: each repository write evicts only its own key(s). Entry writes also clear `sessions_FY*` keys. **Admin cache clear** (`POST /api/cache/clear`) flushes all four caches.

### Calculated Fields Over Stored Fields

Always calculate derived values (hours totals, counts) from source entries at query time. The app is the source of truth — no Power Automate flows update fields. NodeCache keeps this performant.

**Exception — Pre-computed Stats fields**: The Sessions list has a `Stats` JSON field for performance (avoids fetching ~5,000 entries on listing page load). Kept fresh by `computeAndSaveSessionStats()` after every entry/record/media write and a nightly bulk refresh. Only computed aggregates belong in Stats — editable config fields (e.g. `Limits`) must never be stored there.

### Data Validation

- Sessions require a Date field
- Entries default Count to 1, Checked to false

### Permissions / Authorization

- Five access levels: **Admin** (full), **Check In** (field-day ops), **Read Only** (view only), **Self-Service** (own data via magic link), **Public** (unauthenticated)
- **"Trusted"** = Admin + Check In + Read Only. Self-Service is explicitly not trusted.
- Admin: `ADMIN_USERS` env var. Check In: Profile `User` field. Self-Service: Profile `Email` field (comma-separated). Everyone else via Microsoft = Read Only.
- Backend: `requireAuth` gates all API routes; `requireAdmin` enforces role rules; handlers enforce ownership for self-service.
- Frontend: CSS classes control visibility — `.admin-only`, `.checkin-only`, `.trusted-only`, `.auth-only`, `.unauth-only`, `.selfservice-only`.
- All login redirects go to `/login` — never `/auth/login`.
- Full reference: [docs/permissions.md](docs/permissions.md)

### Error Handling

- **Propagate errors by default** — do not catch exceptions in service methods and return empty results.
- **No silent empty returns** — `[]` or `null` from a catch is only acceptable when the feature is genuinely optional and the empty state is indistinguishable from "not configured".
- **API endpoints must return non-2xx on failure** — never `{ success: true, data: [] }` on error.
- **Frontend fetch handlers must log on failure** — at minimum `console.error`; for user-facing features call `showError()`.

### Security Considerations

- Validate all user input before SharePoint API calls
- Prevent XSS when displaying user-generated content
- Use parameterized queries for SharePoint REST API
- Never commit secrets or credentials to git

---

## File Structure

```
dtv-tracker-app/
├── app.js                          # Express server entry point (CommonJS)
├── AGENTS.md                       # This file — project context for coding agents
├── CLAUDE.md                       # Claude Code-specific workflow instructions
├── public/                         # Static assets at fixed URLs
│   └── icons/                      # SVG icons for badges and tags
├── frontend/                       # Vue 3 + Vite frontend
│   └── src/
│       ├── main.ts
│       ├── router/index.ts         # Route definitions + path builder functions
│       ├── composables/
│       │   ├── useAuth.ts          # Internal — use useViewer in UI
│       │   └── useViewer.ts        # Single UI auth composable
│       ├── stores/                 # Pinia stores (sessionList, sessionDetail, etc.)
│       ├── types/                  # Frontend domain types
│       ├── utils/                  # tagIcons, breakpoints, fetchSessionAdults, sessionStats
│       ├── components/             # Shared components
│       ├── layouts/DefaultLayout.vue
│       └── pages/                  # Page components
├── docs/                           # Reference documentation
├── types/
│   ├── api-responses.ts            # HTTP contract types
│   ├── group.ts / session.ts / sharepoint.ts
│   └── express-session.d.ts
├── services/
│   ├── sharepoint-client.ts        # Graph API client (auth, caching, pagination)
│   ├── eventbrite-client.ts
│   ├── eventbrite-sync.ts
│   ├── taxonomy-client.ts          # SharePoint Term Store (Graph beta)
│   ├── data-layer.ts               # Conversion, enrichment, validation
│   ├── field-names.ts              # SharePoint field name constants
│   ├── email-renderer.ts           # Handlebars email renderer
│   ├── backup-export.ts
│   ├── cover-cache.ts
│   └── repositories/               # CRUD per SharePoint list
├── routes/
│   ├── api.ts                      # Mounts all route modules
│   ├── groups.ts / sessions.ts / entries.ts / profiles.ts
│   ├── regulars.ts / stats.ts / eventbrite.ts / tags.ts
│   ├── media.ts / backup.ts / email.ts
│   └── auth/                       # dtv.ts, magic.ts, verify.ts
├── middleware/
│   ├── auth.ts                     # Cookie auth → req.session.user
│   ├── require-auth.ts
│   └── require-admin.ts
└── templates/email/                # Handlebars email templates
```

---

## Running the Application

```bash
npm install
cd frontend && npm install && cd ..
npm run build       # Compile TypeScript
npm run dev         # Express + Vite HMR at http://localhost:3000
```

Frontend build (for production):
```bash
npm run frontend:build   # → frontend/dist/
```

---

## Features

Feature inventory is split by area — read the relevant doc before working in that area:

| Doc | Area |
|-----|------|
| [docs/features/auth.md](docs/features/auth.md) | Auth flows, roles, consent |
| [docs/features/frontend.md](docs/features/frontend.md) | Vue pages, calendar, taxonomy word cloud, PWA |
| [docs/features/backend.md](docs/features/backend.md) | API, CRUD, Eventbrite sync, caching, email, backup |
| [docs/features/media.md](docs/features/media.md) | Photo/video upload, gallery, cover photo |
| [docs/features/tagging.md](docs/features/tagging.md) | Three-tier taxonomy design (people tags, session terms, photo metadata) |

## Testing

| Doc | Purpose |
|-----|---------|
| [docs/testing/test-strategy.md](docs/testing/test-strategy.md) | Testing approach and layers |
| [docs/testing/full-regression.md](docs/testing/full-regression.md) | Manual test checklist before release |

---

## Important Notes

- Financial year runs April 1 to March 31
- `SHAREPOINT_TIMEZONE` env var: IANA timezone for date conversions (default `Europe/London`)
- `MAIL_SENDER` env var: enables self-service email login (optional); must be a UPN with `Mail.Send` permission
- `EMAIL_RATE_LIMIT_PER_HOUR` env var: global cap on auth emails (default `60`)
- `AUTH_BASIC_TTL_HOURS` env var: magic link token lifetime (default `72`); stored as SHA-256 hashes in Logins list
- `MEDIA_LIBRARY_DRIVE_ID` env var: required for photo uploads
- `TAXONOMY_TERM_SET_ID` env var: required for session tags
- `BACKUP_DRIVE_ID` env var: required for backup export (Shared Documents library Drive ID)
- Term Store requires `TermStore.ReadWrite.All` application permission (Graph beta endpoint)
- The `Code` field on the Entries list is no longer used (legacy — do not read or write)

## Known Constraints

- SharePoint API rate limits may apply
- Graph API `orderby` on Sessions list returns 400 — sorting done in Node.js
- Single line of text fields have 255 character max length
- Lookup fields require the related list item to exist first

---

## Code Review

Before reviewing code, read [docs/app-dev-guidelines.md](docs/app-dev-guidelines.md).

Use that file as the primary reference for:
- component architecture
- modal ownership and error handling
- Vue data-down, events-up patterns
- capability and permission handling
- UI consistency and accessibility expectations

When reviewing pull requests:
- flag deviations from those documented patterns
- prioritise correctness, permission safety, and regression risks
- prefer repo conventions over generic framework advice
