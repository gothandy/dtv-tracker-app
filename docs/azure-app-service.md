# Azure App Service Deployment

The app is hosted on **Azure App Service** (Node.js, UK South).

All `.env` variables must be configured in Azure App Service → Configuration → Application settings.

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
