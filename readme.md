# DTV Tracker App

A volunteer hours tracking and registration system for managing volunteer crews, events/sessions, and volunteer profiles. Integrates with SharePoint for data storage and Eventbrite for event management.

## Quick Start

```bash
git clone <repository-url>
cd dtv-tracker-app
npm install

# Create .env file with your credentials (see Setup section)

npm run build   # Compile TypeScript
npm run dev     # Start with auto-reload (development)
# or
npm start       # Start without auto-reload

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

These are stored securely and shared via password manager or secure channel (never via email/Slack).

### 3. Create Environment File

Create a `.env` file in the project root:

```bash
# SharePoint Configuration
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/members
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here

# SharePoint List GUIDs (these are the same for all developers)
GROUPS_LIST_GUID=68f9eb4a-1eea-4c1f-88e5-9211cf56e002
SESSIONS_LIST_GUID=857fc298-6eba-49ab-99bf-9712ef6b8448
ENTRIES_LIST_GUID=8a362810-15ea-4210-9ad0-a98196747866
PROFILES_LIST_GUID=f3d3c40c-35cb-4167-8c83-c566edef6f29
REGULARS_LIST_GUID=34b535f1-34ec-4fe6-a887-3b8523e492e1
```

Never commit the `.env` file to version control (already in `.gitignore`). The list GUIDs are the same for everyone - they identify the SharePoint lists.

### 4. Verify Setup

```bash
node test/test-auth.js

# Expected output:
# ✓ Access token obtained successfully
# ✓ Success! Retrieved X group(s)
```

### 5. Build and Run

```bash
npm run build   # Compile TypeScript services
npm run dev     # Start with nodemon (auto-restarts on changes)
```

The server runs at http://localhost:3000.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check (unauthenticated) |
| `/api/stats` | GET | Dashboard statistics (current + last FY) |
| `/api/groups` | GET | All groups with regulars count |
| `/api/groups` | POST | Create new group |
| `/api/groups/:key` | GET | Group detail with sessions and stats |
| `/api/groups/:key` | PATCH | Update group |
| `/api/sessions` | GET | All sessions with calculated hours and registrations |
| `/api/sessions` | POST | Create new session |
| `/api/sessions/export` | GET | Export this FY sessions as CSV |
| `/api/sessions/:group/:date` | GET | Session detail with entries |
| `/api/sessions/:group/:date` | PATCH | Update session |
| `/api/sessions/:group/:date/entries` | POST | Create entry (register volunteer) |
| `/api/sessions/:group/:date/add-regulars` | POST | Bulk add regulars as entries |
| `/api/entries/:group/:date/:slug` | GET | Entry detail with FY hours |
| `/api/entries/:id` | PATCH | Update entry (check-in, hours, notes) |
| `/api/entries/:id` | DELETE | Delete entry |
| `/api/profiles` | GET | All profiles with FY stats (optional `?group=` filter) |
| `/api/profiles` | POST | Create new profile |
| `/api/profiles/:slug` | GET | Profile detail with entries and group hours |
| `/api/profiles/:slug` | PATCH | Update profile |
| `/api/profiles/:slug` | DELETE | Delete profile (only if no entries) |
| `/api/profiles/:slug/regulars` | POST | Add as regular to group |
| `/api/regulars/:id` | DELETE | Remove regular assignment |
| `/api/cache/clear` | POST | Clear server-side data cache |
| `/api/cache/stats` | GET | Cache hit/miss statistics |

## Project Structure

```
dtv-tracker-app/
├── app.js              # Express server entry point
├── types/              # TypeScript type definitions (SharePoint + domain + API)
├── services/           # Data layer: Graph API client, repositories, enrichment
├── routes/             # API endpoints (api.ts) and auth flow (auth.ts)
├── middleware/          # Auth guard middleware
├── public/             # Frontend HTML/CSS/JS (9 pages, served statically)
├── docs/               # SharePoint schema, setup guides, progress notes
└── test/               # Auth and data verification scripts
```

## Tech Stack

- **Backend**: Node.js with Express 5, TypeScript for services/types
- **Frontend**: Vanilla HTML/CSS/JavaScript (mobile-first, served statically)
- **Data**: SharePoint Online lists via Microsoft Graph API
- **Integrations**: Eventbrite (event series linking)

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Project context, data model, and development guidelines
- **[docs/sharepoint-schema.md](docs/sharepoint-schema.md)** - SharePoint list schemas and field definitions
- **[docs/sharepoint-setup.md](docs/sharepoint-setup.md)** - One-time SharePoint/Entra ID configuration (admin)
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

### Claude Code Usage
- Track API usage at https://claude.ai/settings/usage

### SharePoint Integration
- Always reference [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for field names
- Use internal field names (e.g., `Crew` not `Group`)

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
