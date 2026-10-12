# Azure App Service Deployment

The app is hosted on **Azure App Service** (Node.js 24 LTS, UK South). GitHub Actions builds with Node 24 (`.nvmrc`); each deploy sets the App Service stack to `NODE|24-lts`.

Settings are under *DTVTrackerApp → Environment variables*, separately for production and each slot. The deploy checks they all exist first; see [configuration.md](configuration.md).

## Custom domains

| Host | Purpose |
|------|---------|
| `tracker.dtv.org.uk` | Primary app URL (`PRODUCTION_URL` in `backend/config.ts`) |
| `docs.dtv.org.uk` | Legacy docs hostname — 301 redirect to `/docs` on the canonical host (see `server.js`) |

**Azure setup for `docs.dtv.org.uk`:**

1. DNS: CNAME `docs` → `<app-name>.azurewebsites.net`
2. App Service → **Custom domains** → add `docs.dtv.org.uk`
3. Bind a free **App Service Managed Certificate** for that hostname

Redirect examples:

- `https://docs.dtv.org.uk/` → `https://tracker.dtv.org.uk/docs`
- `https://docs.dtv.org.uk/it-and-data/data-protection/2025-08-01-dtv-privacy-notice.pdf` → `https://tracker.dtv.org.uk/docs/data-protection/dtv-privacy-notice.pdf` (legacy path mapping in `server.js`)
- Other paths: prefix preserved — `https://docs.dtv.org.uk/foo.pdf` → `https://tracker.dtv.org.uk/docs/foo.pdf`

The hostnames are `PRODUCTION_URL` and `DOCS_HOST` in `backend/config.ts`.

### Facebook link previews (session pages)

Public SPA routes inject Open Graph tags server-side in production (`backend/services/og-meta.ts`): home, groups, projects, sessions (list + detail), docs, privacy, terms, login. The Meta app ID is `FACEBOOK_APP_ID` in `backend/config.ts`; `og:url` and `og:image` use the address the page was requested on. After deploy, use [Sharing Debugger](https://developers.facebook.com/tools/debug/) → **Scrape Again**. Cover images require a **public** session cover photo.

## CI/CD — GitHub Actions

Deployments are automated via `.github/workflows/main_dtvtrackerapp.yml` on every push to `main`.

**Build job:**
1. Installs Node 24 from `.nvmrc`
2. Installs root dependencies
3. Compiles TypeScript
4. Installs frontend dependencies and builds — output to `frontend/dist/`
5. Prunes dev dependencies
6. Zips `app.js`, `server.js`, `package.json`, `dist/`, `node_modules/`, and `frontend/dist/`

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
| `preview/<name>` (PR into `main`) | **Build job**, then **deploy job**, which **waits for the maintainer's approval**, then deploys to the `preview` slot, waits for `/api/health` (up to 10 minutes), and comments the preview URL on the PR. | Squash the task branch into it when ready to test. |

Merging the PR into `main` deploys to production via `main_dtvtrackerapp.yml` as before.

The `preview` slot is **pre-production**: **live SharePoint data and real emails**, with its own app registration (*DTV Tracker (Preview)*). Treat anything done on the preview as done in production. There is one slot, so the most recent PR push replaces the previous preview.

PRs from forks run the build job only; they don't get secrets, so they aren't deployed.

**Approving a preview deploy.** The deploy job runs in the GitHub environment `preview`, which has the maintainer as required reviewer. The PR's Checks show *Waiting for review*; open the run, **review the PR's changes first**, then *Review deployments → Approve*. This is the same care as merging: approved code runs against live data with the preview's credentials. The gate can't be skipped by editing the workflow in a PR: Azure only accepts the deploy's login (federated credential) from the `preview` environment. If the Preview registration is switched off ([sharepoint-setup.md](sharepoint-setup.md) section 6), switch it on before testing.

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
6. **App registration.** Use the Preview registration (or create one per slot; see [sharepoint-setup.md](sharepoint-setup.md)): add `https://<slot>.tracker.dtv.org.uk/auth/signed-in` and `/auth/signed-out` to its redirect URIs, and set the slot's `ENTRA_CLIENT_ID` and `ENTRA_CLIENT_SECRET` to it. Never give a slot production's registration.
7. **Require approval.** *GitHub → Settings → Environments → <environment> → Required reviewers*: add the maintainer, so nothing deploys to the slot without approval.
8. **Point a workflow at it.** `pr-preview.yml` deploys to the slot named `preview` in the GitHub environment `preview`. A new slot needs its own environment name and slot name in a workflow (see *Per-developer slots* below).
9. **Test.** Run the workflow, check the health step passes and the PR comment appears, then open the custom domain and sign in.

**Current slots and identities:**

| Slot | Custom domain | Default hostname | Federated credential (subject) |
| --- | --- | --- | --- |
| production | `tracker.dtv.org.uk`, `docs.dtv.org.uk` | `dtvtrackerapp-bhgjefb0acdwgqfx.uksouth-01.azurewebsites.net` | `oidc-credential-b66a` (`repo:gothandy/dtv-tracker-app:ref:refs/heads/main`) |
| `preview` | `preview.tracker.dtv.org.uk` | `dtvtrackerapp-preview-abcph0cucca0dvhf.uksouth-01.azurewebsites.net` | `preview-slot-plain` (`repo:gothandy/dtv-tracker-app:environment:preview`) |

An earlier credential created through the portal form with an ID-based subject never matches and can be deleted.

### Keeping slots in step

A slot's settings were **copied** from production when it was created. They don't follow later changes.

- **Each environment has its own registration**, so `ENTRA_CLIENT_ID` and `ENTRA_CLIENT_SECRET` differ between production and the slot. Other settings are the same; when one changes, update it on production **and every slot**.
- **One shared `preview` slot.** Deploys are only checked for staleness within a PR, not across PRs, so if two PRs are open the slot shows whichever deployed last. Check the About modal shows the PR you're testing (*PR #N · sha*); if not, re-run that PR's deploy job. Accepted while there's one developer; use per-developer slots (below) if parallel PRs become normal.
- **Scheduled jobs run on production only.** The Logic App calls the production URL, so slots never run the nightly sync, backup or stats refresh (no double runs against live data). To test a job change on a slot, run it on demand from the Tools page.
- Links in emails and link previews use the address the request came in on, so emails sent from a slot link to that slot.

### Per-developer slots (possible later)

With two or three volunteer developers and PRs that may stay open between sessions, one shared `preview` slot may become a bottleneck. Giving each developer their own slot (e.g. `preview-andrew`) would need:

- One slot per developer, created with the steps above (custom domain, credential, redirect URI)
- The workflow to choose the slot and GitHub environment from the PR author, or from a label on the PR
- Remembering that every slot still shares live data and the plan's CPU and memory

## Scheduled Eventbrite Sync

An **Azure Logic App** (Consumption plan) runs a daily sync:

1. **Trigger**: Recurrence — daily at 05:30 UTC
2. **Action**: `POST /api/eventbrite/nightly-update` with header `X-Api-Key: <TRACKER_JOBS_API_KEY>`

Response includes a human-readable `summary` field for email notifications.
