# Local Development

Most changes are made prompt-driven (see the [readme](../readme.md) and [AGENTS.md → How we work](../AGENTS.md#how-we-work)). Run the app locally when you need constant feedback, for example on a UI problem: pull the current `task/…` branch, run it, and push your commits back to the same branch.

**Local runs against live SharePoint data**, the same as production. Treat it as production.

```bash
git fetch && git checkout task/<name> && git pull
```

## Setup

You'll need Node.js 24, credentials from your team lead (SharePoint Client ID/Secret/Tenant, Eventbrite API key), and SharePoint already configured — see [sharepoint-setup.md](sharepoint-setup.md) if it isn't.

```bash
git clone https://github.com/gothandy/dtv-tracker-app
cd dtv-tracker-app
npm install
cd frontend && npm install && cd ..
```

Create a `.env` file in the project root (never commit it — already in `.gitignore`). Every setting is described in [configuration.md](configuration.md).

```bash
# SharePoint
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/tracker
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here

# SharePoint List GUIDs (same for all developers)
GROUPS_LIST_GUID=6e86cef7-a855-41a4-93e8-6e01a80434a2
PROJECTS_LIST_GUID=669e479d-7b48-41dc-a0df-1ee7bc0fc2c7
SESSIONS_LIST_GUID=583867bd-e032-4940-89b5-aa2d5158c5d0
ENTRIES_LIST_GUID=7146b950-94e3-4c94-a0d7-310cf2fbd325
PROFILES_LIST_GUID=84649143-9e10-42eb-b6ee-2e1f57033073
REGULARS_LIST_GUID=925c96fd-9b3a-4f55-b179-ed51fc279d39
RECORDS_LIST_GUID=2666a819-1275-4fce-83a3-5bb67b4da83a
LOGINS_LIST_GUID=e3b5c7fb-313a-44b4-9363-a4e4d2b65a57

# Eventbrite
EVENTBRITE_API_KEY=your_eventbrite_api_key_here
EVENTBRITE_ORGANIZATION_ID=your_org_id_here

# Optional
API_SYNC_KEY=your_random_key_here
FACEBOOK_APP_ID=1973664160696548   # Meta app — Facebook link previews on session pages
MEDIA_LIBRARY_DRIVE_ID=   # find via admin page "Discover Drives"
DOCUMENTS_DRIVE_ID=     # Documents library drive — top-level Backups/ + Projects/{slug}/
ADMIN_USERS=a...s@dtv.org.uk,b...o@dtv.org.uk
SESSION_SECRET=your_session_secret_here
MAIL_SENDER=noreply@dtv.org.uk
```

Build, verify your credentials hit live SharePoint, then run:

```bash
npm run build       # compile TypeScript (required before test:live and dev)
npm run test:live   # all green = credentials and list access confirmed
cd frontend && npm test && cd ..   # Vitest store unit tests (no live calls)
npm run dev         # Express + Vite HMR at http://localhost:3000
```

Everything runs on a single server. In dev mode, Express integrates Vite as middleware — HMR for frontend changes and the API on the same port. After a backend change, run `npm run build:dev` while `npm run dev` is running (incremental compile; nodemon restarts after a short delay). Use `npm run build` for a clean compile (wipes `dist/` first) — stop the dev server first on Windows/OneDrive if you see `EBUSY` on files under `dist/`.

## Troubleshooting

### Cannot connect to SharePoint

- `.env` file exists with all required variables
- Client ID, Secret, and Tenant ID are correct
- No extra spaces in `.env` values
- Correct SharePoint site URL

### "401 Unauthorized" or "Invalid client secret"

Credentials in `.env` are incorrect or expired. If the secret has expired, follow [Entra ID secret needs updating](../readme.md#entra-id-secret-needs-updating-see-readme) in the readme.

### "Unsupported app only token" error

SharePoint site permissions issue. See [docs/sharepoint-setup.md](sharepoint-setup.md) section 3.

### `ERR_MODULE_NOT_FOUND: vite`

Frontend dependencies not installed. Run `cd frontend && npm install`.

### Tests fail

```bash
npm run test:live
```

Failing assertions are shown with `✗`. Authentication errors surface from `test-auth.js`.
