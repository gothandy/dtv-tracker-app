# DTV Tracker App

A volunteer hours tracking and registration system for managing volunteer crews, events/sessions, and volunteer profiles. Integrates with SharePoint for data storage and Eventbrite for event management.

## Get Started

You'll need Node.js 18+, credentials from your team lead (SharePoint Client ID/Secret/Tenant, Eventbrite API key), and SharePoint already configured — see [docs/sharepoint-setup.md](docs/sharepoint-setup.md) if it isn't.

```bash
git clone https://github.com/gothandy/dtv-tracker-app
cd dtv-tracker-app
npm install
cd frontend && npm install && cd ..
```

Create a `.env` file in the project root (never commit it — already in `.gitignore`):

```bash
# SharePoint
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/tracker
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here

# SharePoint List GUIDs (same for all developers)
GROUPS_LIST_GUID=6e86cef7-a855-41a4-93e8-6e01a80434a2
SESSIONS_LIST_GUID=583867bd-e032-4940-89b5-aa2d5158c5d0
ENTRIES_LIST_GUID=7146b950-94e3-4c94-a0d7-310cf2fbd325
PROFILES_LIST_GUID=84649143-9e10-42eb-b6ee-2e1f57033073
REGULARS_LIST_GUID=925c96fd-9b3a-4f55-b179-ed51fc279d39
RECORDS_LIST_GUID=2666a819-1275-4fce-83a3-5bb67b4da83a

# Eventbrite
EVENTBRITE_API_KEY=your_eventbrite_api_key_here
EVENTBRITE_ORGANIZATION_ID=your_org_id_here

# Optional
API_SYNC_KEY=your_random_key_here
MEDIA_LIBRARY_DRIVE_ID=   # find via admin page "Discover Drives"
ADMIN_USERS=a...s@dtv.org.uk,b...o@dtv.org.uk
SESSION_SECRET=your_session_secret_here
MAIL_SENDER=noreply@dtv.org.uk
```

Build, verify your credentials hit live SharePoint, then run:

```bash
npm run build       # compile TypeScript (required before test:live and dev)
npm run test:live   # all green = credentials and list access confirmed
npm run dev         # Express + Vite HMR at http://localhost:3000
```

Everything runs on a single server. In dev mode, Express integrates Vite as middleware — HMR for frontend changes and the API on the same port. After a backend change, `npm run build` triggers an automatic nodemon restart.

---

## Documentation

| Doc | When to read |
|-----|-------------|
| [docs/api.md](docs/api.md) | All API endpoints and pages |
| [docs/permissions.md](docs/permissions.md) | Roles and what each can do |
| [docs/sharepoint-schema.md](docs/sharepoint-schema.md) | Data model — list structure and field names |
| [docs/sharepoint-setup.md](docs/sharepoint-setup.md) | First-time SharePoint/Entra ID setup (admin only) |
| [docs/azure-app-service.md](docs/azure-app-service.md) | CI/CD, deployment, and scheduled sync (hosting) |
| [docs/features/](docs/features/) | Feature inventory by area (auth, frontend, backend, media, taxonomy) |
| [docs/app-dev-guidelines.md](docs/app-dev-guidelines.md) | Building Vue features — layering, components, stats pattern |
| [docs/testing/test-strategy.md](docs/testing/test-strategy.md) | Testing approach and layers |
| [docs/testing/full-regression.md](docs/testing/full-regression.md) | Manual test checklist before release |
| [docs/design/](docs/design/) | Product vision, UX flows, visual guidelines |
| [AGENTS.md](AGENTS.md) | Full project context and coding guidelines |

---


## Troubleshooting

### Cannot connect to SharePoint

- `.env` file exists with all required variables
- Client ID, Secret, and Tenant ID are correct
- No extra spaces in `.env` values
- Correct SharePoint site URL

### "401 Unauthorized" or "Invalid client secret"

Credentials in `.env` are incorrect or expired. Contact your team lead.

### "Unsupported app only token" error

SharePoint site permissions issue. See [docs/sharepoint-setup.md](docs/sharepoint-setup.md) section 3.

### `ERR_MODULE_NOT_FOUND: vite`

Frontend dependencies not installed. Run `cd frontend && npm install`.

### Tests fail

```bash
npm run test:live
```

Failing assertions are shown with `✗`. Authentication errors surface from `test-auth.js`.
