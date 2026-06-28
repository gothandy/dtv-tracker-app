# Azure App Service Deployment

The app is hosted on **Azure App Service** (Node.js, UK South).

All `.env` variables must be configured in Azure App Service → Configuration → Application settings.

## Custom domains

| Host | Purpose |
|------|---------|
| `tracker.dtv.org.uk` | Primary app URL (`FRONTEND_URL`) |
| `docs.dtv.org.uk` | Legacy docs hostname — 301 redirect to `/docs` on the canonical host (see `app.js`) |

**Azure setup for `docs.dtv.org.uk`:**

1. DNS: CNAME `docs` → `<app-name>.azurewebsites.net`
2. App Service → **Custom domains** → add `docs.dtv.org.uk`
3. Bind a free **App Service Managed Certificate** for that hostname
4. Ensure `FRONTEND_URL=https://tracker.dtv.org.uk` is set in Application settings

Redirect examples:

- `https://docs.dtv.org.uk/` → `https://tracker.dtv.org.uk/docs`
- `https://docs.dtv.org.uk/it-and-data/data-protection/2025-08-01-dtv-privacy-notice.pdf` → `https://tracker.dtv.org.uk/docs/data-protection/dtv-privacy-notice.pdf` (legacy path mapping in `app.js`)
- Other paths: prefix preserved — `https://docs.dtv.org.uk/foo.pdf` → `https://tracker.dtv.org.uk/docs/foo.pdf`

Optional override for non-production: `DOCS_REDIRECT_HOST` (hostname that triggers the redirect).

### Facebook link previews (session pages)

Public SPA routes inject Open Graph tags server-side in production (`backend/services/og-meta.ts`): home, groups, projects, sessions (list + detail), docs, privacy, terms, login. Set **`FACEBOOK_APP_ID`** (e.g. `1973664160696548`) in Application settings. **`FRONTEND_URL`** should be `https://tracker.dtv.org.uk` so `og:url` and `og:image` use the canonical host. After deploy, use [Sharing Debugger](https://developers.facebook.com/tools/debug/) → **Scrape Again**. Cover images require a **public** session cover photo.

## CI/CD — GitHub Actions

Deployments are automated via `.github/workflows/main_dtvtrackerapp.yml` on every push to `main`.

**Build job:**
1. Installs root dependencies
2. Compiles TypeScript
3. Installs frontend dependencies and builds — output to `frontend/dist/`
4. Prunes dev dependencies
5. Zips `app.js`, `package.json`, `dist/`, `node_modules/`, and `frontend/dist/`

**Deploy job:**
1. Authenticates with Azure via OIDC (no stored secrets — uses federated identity)
2. Disables Kudu build-on-deploy (`SCM_DO_BUILD_DURING_DEPLOYMENT=false`)
3. Deploys `release.zip` to Azure App Service

## Scheduled Eventbrite Sync

An **Azure Logic App** (Consumption plan) runs a daily sync:

1. **Trigger**: Recurrence — daily at 05:30 UTC
2. **Action**: `POST /api/eventbrite/nightly-update` with header `X-Api-Key: <API_SYNC_KEY>`

Response includes a human-readable `summary` field for email notifications.
