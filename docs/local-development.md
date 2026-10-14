# Local Development

Most changes are made prompt-driven (see the [readme](../readme.md) and [AGENTS.md → How we work](../AGENTS.md#how-we-work)). Run the app locally when you need constant feedback, for example on a UI problem: pull the current `task/…` branch, run it, and push your commits back to the same branch.

**Local runs against the preview site**, `tracker-preview`: a copy of live restored from backup. Changes don't reach live, but it's real people's data, so treat it with production care. Email only goes to the addresses in your `TRACKER_ADMIN_USERS` and on their profiles, and the Preview registration is switched off every night at 2am: switch it on before you start ([sharepoint-setup.md](sharepoint-setup.md) section 6).

```bash
git fetch && git checkout task/<name> && git pull
```

## Setup

You'll need Node.js 24, credentials from your team lead (the Entra client ID and secret, and the Eventbrite API key), and SharePoint already configured — see [sharepoint-setup.md](sharepoint-setup.md) if it isn't.

```bash
git clone https://github.com/gothandy/dtv-tracker-app
cd dtv-tracker-app
npm install
cd frontend && npm install && cd ..
```

Create a `.env` file in the project root (never commit it — already in `.gitignore`). Every setting is described in [configuration.md](configuration.md).

```bash
# Entra app registration (SharePoint, email, Microsoft sign-in)
ENTRA_CLIENT_ID=your_client_id_here
ENTRA_CLIENT_SECRET=your_client_secret_here

# SharePoint
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/tracker-preview

# Eventbrite
EVENTBRITE_API_KEY=your_eventbrite_api_key_here

# Tracker
TRACKER_COOKIE_SECRET=any_long_random_value
TRACKER_JOBS_API_KEY=any_long_random_value
# Admin access, and locally the email safe list (see configuration.md)
TRACKER_ADMIN_USERS=you@dtv.org.uk
TRACKER_SHARED_MAILBOX=preview.tracker@deantrailvolunteers.org.uk
```

List IDs, drive IDs and the term set are fixed values in `backend/config.ts`, so they aren't in `.env`. If a setting is missing, the app starts with a page naming it.

Build, verify your credentials reach the preview site, then run:

```bash
npm run build       # compile TypeScript (required before test:live and dev)
npm run test:live   # all green = credentials and list access confirmed
cd frontend && npm test && cd ..   # Vitest store unit tests (no live calls)
npm run dev         # Express + Vite HMR at http://localhost:3000
```

Everything runs on a single server. In dev mode, Express integrates Vite as middleware — HMR for frontend changes and the API on the same port. After a backend change, run `npm run build:dev` while `npm run dev` is running (incremental compile; nodemon restarts after a short delay). Use `npm run build` for a clean compile (wipes `dist/` first) — stop the dev server first on Windows/OneDrive if you see `EBUSY` on files under `dist/`.

## Troubleshooting

### Cannot connect to SharePoint

- `.env` file exists with all eight settings (the app names any that are missing)
- `ENTRA_CLIENT_ID` and `ENTRA_CLIENT_SECRET` are correct and from the same registration
- No extra spaces in `.env` values
- Correct SharePoint site URL

### "401 Unauthorized" or "Invalid client secret"

Credentials in `.env` are incorrect or expired. If the secret has expired, follow [Entra ID secret needs updating](../readme.md#entra-id-secret-needs-updating-see-readme) in the readme.

### "Access denied" (403) from SharePoint

The app registration hasn't been given the tracker site. See [sharepoint-setup.md](sharepoint-setup.md) section 3.

### `ERR_MODULE_NOT_FOUND: vite`

Frontend dependencies not installed. Run `cd frontend && npm install`.

### Tests fail

```bash
npm run test:live
```

Failing assertions are shown with `✗`. Authentication errors surface from `test-auth.js`.
