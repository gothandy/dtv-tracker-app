# Azure App Service Deployment

The app is hosted on **Azure App Service** (Node.js 24 LTS, UK South). GitHub Actions builds with Node 24 (`.nvmrc`); each deploy sets the App Service stack to `NODE|24-lts`.

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
1. Installs Node 24 from `.nvmrc`
2. Installs root dependencies
3. Compiles TypeScript
4. Installs frontend dependencies and builds — output to `frontend/dist/`
5. Prunes dev dependencies
6. Zips `app.js`, `package.json`, `dist/`, `node_modules/`, and `frontend/dist/`

**Deploy job:**
1. Authenticates with Azure via OIDC (no stored secrets — uses federated identity)
2. Sets the App Service Linux stack to `NODE|24-lts`
3. Disables Kudu build-on-deploy (`SCM_DO_BUILD_DURING_DEPLOYMENT=false`)
4. Deploys `release.zip` to Azure App Service

## Pull request previews — `preview` slot

`.github/workflows/pr-preview.yml` supports a two-level branch model, so the slow deploy only happens when there's something to test:

| Branch | On push | Purpose |
| --- | --- | --- |
| `task/<name>` | **Build job** only: same build as production, plus backend and frontend unit tests (`vitest run`). About 2 minutes. | Day-to-day work; commit as often as needed. |
| `preview/<name>` (PR into `main`) | **Build job**, then **deploy job**: deploys to the `preview` slot, waits for `/api/health` (up to 10 minutes), and comments the preview URL on the PR. | Squash the task branch into it when ready to test. |

Merging the PR into `main` deploys to production via `main_dtvtrackerapp.yml` as before.

The `preview` slot is **pre-production**. It was cloned from production, so it uses the same settings, **live SharePoint data and real emails**. Treat anything done on the preview as done in production. There is one slot, so the most recent PR push replaces the previous preview.

PRs from forks run the build job only; they don't get secrets, so they aren't deployed.

### Adding a deployment slot

These are the steps used to create `preview` on 10 Oct 2026. Use them for any further slot (replace `<slot>`); allow about an hour, mostly waiting for DNS and the certificate.

**Prerequisite:** the App Service plan (`ASP-DTV-a457`) must support deployment slots: **Standard S1 or above** (Basic doesn't). We use **Premium v3 P0v3**: it costs less than S1, performs better, and Azure now lists Standard as legacy. P0v3 allows up to 20 slots; they all share the plan's 1 vCPU / 4 GB with production, at no extra cost.

1. **Create the slot.** *DTVTrackerApp → Deployment slots → Add slot* `<slot>`, **clone settings from production**. The slot gets its **own copy** of every setting (see *Keeping slots in step* below).
2. **Note its default hostname** from the slot's *Overview*, e.g. `dtvtrackerapp-<slot>-<random>.uksouth-01.azurewebsites.net`.
3. **DNS** (where `dtv.org.uk` is managed):
   - `CNAME <slot>.tracker` → the slot's default hostname
   - `TXT asuid.<slot>.tracker` → the *Custom Domain Verification ID* shown in the *Add custom domain* pane
4. **Custom domain and certificate.** Slot → *Custom domains → Add custom domain* `<slot>.tracker.dtv.org.uk`, certificate **App Service Managed Certificate**, TLS/SSL type **SNI SSL**. Then check its status reads **Secured**. If the browser shows `ERR_CERT_COMMON_NAME_INVALID`, the certificate exists but isn't bound: *Custom domains → Add binding*, choose the certificate, **SNI SSL**.
5. **Let GitHub deploy to it.** GitHub logs in as the managed identity **`oidc-msi-ad79`** (created by Deployment Center; *Website Contributor* on DTVTrackerApp covers all its slots). Each workflow environment needs its own federated credential. Create it from **Cloud Shell (Bash)**, because the portal form builds an ID-based subject (`repo:gothandy@5618305/…`) that doesn't match what the workflows send:

   ```bash
   RG=$(az identity list --query "[?name=='oidc-msi-ad79'].resourceGroup" -o tsv)
   az identity federated-credential create \
     --name <slot>-slot-plain \
     --identity-name oidc-msi-ad79 \
     --resource-group "$RG" \
     --issuer https://token.actions.githubusercontent.com \
     --subject "repo:gothandy/dtv-tracker-app:environment:<slot>" \
     --audiences api://AzureADTokenExchange
   ```

   `AADSTS700213: No matching federated identity record` in the deploy job means the subject doesn't match exactly.
6. **Sign-in redirect.** Entra ID → the tracker's app registration (`SHAREPOINT_CLIENT_ID`) → *Authentication → Web → Redirect URIs* → add `https://<slot>.tracker.dtv.org.uk/auth/callback`.
7. **Point a workflow at it.** `pr-preview.yml` deploys to the slot named `preview` in the GitHub environment `preview`. A new slot needs its own environment name and slot name in a workflow (see *Per-developer slots* below).
8. **Test.** Run the workflow, check the health step passes and the PR comment appears, then open the custom domain and sign in.

**Current slots and identities:**

| Slot | Custom domain | Default hostname | Federated credential (subject) |
| --- | --- | --- | --- |
| production | `tracker.dtv.org.uk`, `docs.dtv.org.uk` | `dtvtrackerapp-bhgjefb0acdwgqfx.uksouth-01.azurewebsites.net` | `oidc-credential-b66a` (`repo:gothandy/dtv-tracker-app:ref:refs/heads/main`) |
| `preview` | `preview.tracker.dtv.org.uk` | `dtvtrackerapp-preview-abcph0cucca0dvhf.uksouth-01.azurewebsites.net` | `preview-slot-plain` (`repo:gothandy/dtv-tracker-app:environment:preview`) |

An earlier credential created through the portal form with an ID-based subject never matches and can be deleted.

### Keeping slots in step

A slot's settings were **copied** from production when it was created. They don't follow later changes.

- **When a secret is renewed** (e.g. `SHAREPOINT_CLIENT_SECRET`) or any setting changes, update it on production **and every slot**.
- **One shared `preview` slot.** Deploys are only checked for staleness within a PR, not across PRs, so if two PRs are open the slot shows whichever deployed last. Check the About modal shows the PR you're testing (*PR #N · sha*); if not, re-run that PR's deploy job. Accepted while there's one developer; use per-developer slots (below) if parallel PRs become normal.
- **Scheduled jobs run on production only.** The Logic App calls the production URL, so slots never run the nightly sync, backup or stats refresh (no double runs against live data). To test a job change on a slot, run it on demand from the Tools page.
- `FRONTEND_URL` stays `https://tracker.dtv.org.uk` on slots, so emails sent from a slot link to production. Magic-link sign-in uses the host the request came from, so signing in on a slot works.

### Per-developer slots (possible later)

With two or three volunteer developers and PRs that may stay open between sessions, one shared `preview` slot may become a bottleneck. Giving each developer their own slot (e.g. `preview-andrew`) would need:

- One slot per developer, created with the steps above (custom domain, credential, redirect URI)
- The workflow to choose the slot and GitHub environment from the PR author, or from a label on the PR
- Remembering that every slot still shares live data and the plan's CPU and memory

## Scheduled Eventbrite Sync

An **Azure Logic App** (Consumption plan) runs a daily sync:

1. **Trigger**: Recurrence — daily at 05:30 UTC
2. **Action**: `POST /api/eventbrite/nightly-update` with header `X-Api-Key: <API_SYNC_KEY>`

Response includes a human-readable `summary` field for email notifications.
