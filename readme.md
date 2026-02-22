# DTV Tracker App

A volunteer hours tracking and registration system for managing volunteer crews, events/sessions, and volunteer profiles. Integrates with SharePoint for data storage and Eventbrite for event management.

## Quick Start

```bash
git clone <repository-url>
cd dtv-tracker-app
npm install

# Create .env.tracker file with your credentials (see Setup section)

npm run build           # Compile TypeScript
npm run dev:tracker     # Start with auto-reload (development)
# or
npm start               # Start without auto-reload

# Visit http://localhost:3000
```

## Prerequisites

- **Node.js** 18+ (with npm)
- **Git**
- **SharePoint Online** access with admin permissions
- **Microsoft Entra ID** (formerly Azure AD) access to create app registrations

## Setup for New Developers

> **Note**: If you're setting up SharePoint/Entra ID for the first time (organization admin), see [docs/sharepoint-setup.md](docs/sharepoint-setup.md) for detailed configuration steps. The steps below assume SharePoint is already configured.

### 1. Clone and Install

```bash
git clone <repository-url>
cd dtv-tracker-app
npm install
```

### 2. Get Credentials

**Ask your team lead or admin for**:
- SharePoint Client ID
- SharePoint Client Secret
- SharePoint Tenant ID
- SharePoint Site URL
- Eventbrite API Key
- Eventbrite Organisation ID

These are stored securely and shared via password manager or secure channel (never via email/Slack).

### 3. Create Environment File

Create a `.env` file in the project root:

```bash
# SharePoint Configuration
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/tracker
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here

# SharePoint List GUIDs (these are the same for all developers)
GROUPS_LIST_GUID=6e86cef7-a855-41a4-93e8-6e01a80434a2
SESSIONS_LIST_GUID=583867bd-e032-4940-89b5-aa2d5158c5d0
ENTRIES_LIST_GUID=7146b950-94e3-4c94-a0d7-310cf2fbd325
PROFILES_LIST_GUID=84649143-9e10-42eb-b6ee-2e1f57033073
REGULARS_LIST_GUID=925c96fd-9b3a-4f55-b179-ed51fc279d39
RECORDS_LIST_GUID=2666a819-1275-4fce-83a3-5bb67b4da83a

# Eventbrite Configuration
EVENTBRITE_API_KEY=your_eventbrite_api_key_here
EVENTBRITE_ORGANIZATION_ID=your_org_id_here

# Scheduled Sync (optional — for API key auth bypass on /api/eventbrite/ endpoints)
API_SYNC_KEY=your_random_key_here

# Admin users (comma-separated emails — all other users get Check In Only access)
ADMIN_USERS=a...s@dtv.org.uk,b...o@dtv.org.uk

# Session secret (change in production)
SESSION_SECRET=your_session_secret_here
```

Never commit the `.env` file to version control (already in `.gitignore`). The list GUIDs are the same for everyone — they identify the SharePoint lists.

### 4. Verify Setup

```bash
node test/test-auth.js

# Expected output:
# ✓ Access token obtained successfully
# ✓ Success! Retrieved X group(s)
```

### 5. Build and Run

```bash
npm run build           # Compile TypeScript
npm run dev:tracker     # Start with nodemon using .env.tracker
```

The server runs at http://localhost:3000.

**Restarting after a code change**: nodemon watches the `dist/` folder, so run `npm run build` in a second terminal and nodemon will restart automatically. If you need a full restart, stop nodemon (Ctrl+C), run `npm run build`, then `npm run dev:tracker` again.

## Deployment

The app is hosted on **Azure App Service** (Node.js, UK South region).

All environment variables from `.env` must be configured in Azure App Service > Configuration > Application settings.

### Scheduled Eventbrite Sync

An **Azure Logic App** (Consumption plan) runs a daily scheduled sync:

1. **Trigger**: Recurrence — daily at a configured time (e.g. 03:00 UTC)
2. **Action**: HTTP POST to `/api/eventbrite/event-and-attendee-update`
   - Header: `X-Api-Key: <API_SYNC_KEY value>`
3. **Optional**: Send email action with the `summary` field from the response

The API key bypasses the normal Entra ID session auth for `/api/eventbrite/` paths only (handled in `middleware/require-auth.ts`).

The sync:
- Fetches live events from Eventbrite, creates sessions for any new events matching a group's `EventbriteSeriesID`
- Fetches attendees for upcoming sessions, creates profiles and entries for new registrations
- Syncs consent records (privacy, photo) from Eventbrite custom questions

Response includes a human-readable `summary` field, e.g.:
```
59 events, 59 matched, 0 new sessions / 59 sessions, 0 new profiles, 0 new entries, 18 consent records
```

## API Endpoints

### Stats & Config

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check (unauthenticated) |
| `/api/stats` | GET | Dashboard statistics (current + last FY) |
| `/api/config` | GET | App configuration (SharePoint site URL) |
| `/api/cache/clear` | POST | Clear server-side data cache |
| `/api/cache/stats` | GET | Cache hit/miss statistics |

### Groups

| Endpoint | Method | Description |
|---|---|---|
| `/api/groups` | GET | All groups with regulars count |
| `/api/groups` | POST | Create new group |
| `/api/groups/:key` | GET | Group detail with sessions and stats |
| `/api/groups/:key` | PATCH | Update group |
| `/api/groups/:key` | DELETE | Delete group |

### Sessions

| Endpoint | Method | Description |
|---|---|---|
| `/api/sessions` | GET | All sessions with calculated hours and registrations |
| `/api/sessions` | POST | Create new session |
| `/api/sessions/export` | GET | Export this FY sessions as CSV |
| `/api/sessions/:group/:date` | GET | Session detail with entries |
| `/api/sessions/:group/:date` | PATCH | Update session (name, description, date) |
| `/api/sessions/:group/:date` | DELETE | Delete session |
| `/api/sessions/:group/:date/entries` | POST | Create entry (register volunteer) |
| `/api/sessions/:group/:date/add-regulars` | POST | Bulk add regulars as entries |
| `/api/sessions/:group/:date/refresh` | POST | Refresh session entry data |

### Entries

| Endpoint | Method | Description |
|---|---|---|
| `/api/entries/:group/:date/:slug` | GET | Entry detail with FY hours |
| `/api/entries/:id` | PATCH | Update entry (check-in, hours, notes) |
| `/api/entries/:id` | DELETE | Delete entry |

### Profiles

| Endpoint | Method | Description |
|---|---|---|
| `/api/profiles` | GET | All profiles with FY stats (optional `?group=` filter) |
| `/api/profiles` | POST | Create new profile |
| `/api/profiles/export` | GET | Export profiles as CSV |
| `/api/profiles/:slug` | GET | Profile detail with entries and group hours |
| `/api/profiles/:slug` | PATCH | Update profile |
| `/api/profiles/:slug` | DELETE | Delete profile (only if no entries) |
| `/api/profiles/:slug/regulars` | POST | Add as regular to group |
| `/api/profiles/:slug/transfer` | POST | Transfer entries between profiles |
| `/api/profiles/:id/records` | POST | Create consent/governance record |

### Records

| Endpoint | Method | Description |
|---|---|---|
| `/api/records/options` | GET | Available record types and statuses |
| `/api/records/export` | GET | Export records as CSV |
| `/api/records/:id` | PATCH | Update record |
| `/api/records/:id` | DELETE | Delete record |

### Regulars

| Endpoint | Method | Description |
|---|---|---|
| `/api/regulars/:id` | DELETE | Remove regular assignment |

### Eventbrite Sync

| Endpoint | Method | Description |
|---|---|---|
| `/api/eventbrite/event-and-attendee-update` | POST | Run full sync (sessions + attendees), returns summary |
| `/api/eventbrite/sync-sessions` | POST | Sync Eventbrite events → sessions |
| `/api/eventbrite/sync-attendees` | POST | Sync Eventbrite attendees → profiles/entries |
| `/api/eventbrite/unmatched-events` | GET | List Eventbrite events with no matching group |
| `/api/eventbrite/event-config-check` | GET | Check event config (child ticket, consent questions, per-attendee) |

## Pages

| Page | URL | Description |
|---|---|---|
| Dashboard | `/` | FY stats, progress bar, next session |
| Admin | `/admin.html` | Eventbrite sync buttons, exports, site link |
| Groups | `/groups.html` | Groups listing with FY filter |
| Group Detail | `/groups/:key/detail.html` | Stats, regulars, sessions, edit/delete |
| Sessions | `/sessions.html` | Sessions listing with FY filter |
| Session Detail | `/sessions/:group/:date/details.html` | Entries, check-in, set hours, edit/delete |
| Volunteers | `/volunteers.html` | Profiles with FY filter, sort, group filter, search |
| Profile Detail | `/profiles/:slug/details.html` | FY stats, group hours, entries, records |
| Entry Edit | `/entries/:group/:date/:slug/edit.html` | Tag buttons, hours, notes, delete |
| Add Entry | `/sessions/:group/:date/add-entry.html` | Volunteer search and create |

## Project Structure

```
dtv-tracker-app/
├── app.js              # Express server entry point
├── types/              # TypeScript type definitions (SharePoint + domain + API)
├── services/           # Data layer: Graph API client, repositories, enrichment
│   ├── eventbrite-client.ts  # Eventbrite API client (attendees, org events)
│   └── repositories/   # CRUD for each SharePoint list
├── routes/             # API endpoints split by domain
│   ├── api.ts          # Router mounting all route modules
│   ├── groups.ts       # Groups CRUD
│   ├── sessions.ts     # Sessions CRUD + exports
│   ├── entries.ts      # Entries CRUD
│   ├── profiles.ts     # Profiles CRUD + records + transfer
│   ├── regulars.ts     # Regulars management
│   ├── stats.ts        # Dashboard stats, cache, config
│   ├── eventbrite.ts   # Eventbrite sync endpoints
│   └── auth.ts         # Authentication (login, callback, logout)
├── middleware/          # Auth guard middleware (session + API key)
├── public/             # Frontend HTML/CSS/JS (10 pages, served statically)
├── docs/               # SharePoint schema, setup guides, progress notes
└── test/               # Auth and data verification scripts
```

## Tech Stack

- **Backend**: Node.js with Express 5, TypeScript for services/types
- **Frontend**: Vanilla HTML/CSS/JavaScript (mobile-first, served statically)
- **Data**: SharePoint Online lists via Microsoft Graph API
- **Integrations**: Eventbrite API (event sync, attendee sync, consent records)
- **Hosting**: Azure App Service (UK South)
- **Scheduled Tasks**: Azure Logic App (Consumption) for daily Eventbrite sync
- **Authentication**: Microsoft Entra ID (OAuth) for browser sessions; API key for scheduled sync

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project context, data model, and development guidelines
- **[docs/sharepoint-schema.md](docs/sharepoint-schema.md)** - SharePoint list schemas and field definitions
- **[docs/sharepoint-setup.md](docs/sharepoint-setup.md)** - One-time SharePoint/Entra ID configuration (admin)
- **[docs/power-automate-flows.md](docs/power-automate-flows.md)** - Eventbrite sync documentation (legacy PA flows + Node.js migration)
- **[docs/technical-debt.md](docs/technical-debt.md)** - Performance and optimization tracking
- **[docs/progress.md](docs/progress.md)** - Development session notes

## Development Guidelines

### Code Style
- TypeScript for services, types, and routes; CommonJS for entry point (`app.js`)
- Lowercase-hyphen naming for files (e.g., `data-layer.ts`, `test-auth.js`)
- Prefer readable code over comments; use comments to explain non-obvious decisions
- Keep code simple and follow existing patterns

### Security
- Never commit `.env` file (already in `.gitignore`)
- Never commit secrets or credentials
- Validate all user input
- Prevent XSS when displaying user content (`escapeHtml()` in frontend)

### SharePoint Integration
- Always reference [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for field names
- Use field name constants from `services/field-names.ts`
- Use `safeParseLookupId()` for lookup field comparisons

## Troubleshooting

### Cannot connect to SharePoint

**Checklist**:
- [ ] `.env` file exists with all required variables
- [ ] Client ID, Secret, and Tenant ID are correct
- [ ] No extra spaces in `.env` values
- [ ] Using the correct SharePoint site URL

### "401 Unauthorized" or "Invalid client secret"

Credentials in `.env` are incorrect or expired. Contact your team lead for updated credentials.

### "Unsupported app only token" error

SharePoint site permissions issue (admin-level). See [docs/sharepoint-setup.md](docs/sharepoint-setup.md) section 3.

### Test script fails

```bash
node test/test-auth.js
```

The error message will indicate whether it's authentication, permission, or network related.
