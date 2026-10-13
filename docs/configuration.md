# Configuration

All configuration is in [`backend/config.ts`](../backend/config.ts). Nothing else reads environment variables.

## Settings

A value is a **setting** (an environment variable) only if it is a secret or differs between environments. Everything else, such as list IDs, drive IDs and the tenant ID, is a fixed value in `config.ts`, reviewed and versioned like code.

Settings are named `{WHO}_{WHAT}`: WHO is the system the value belongs to or was issued by, so the name tells you where to find or renew it.

| Setting | Where it comes from | Purpose |
|---|---|---|
| `ENTRA_CLIENT_ID` | Entra ID → App registrations → *DTV Tracker (Production)* or *(Preview)* → Overview | The environment's app registration: SharePoint, email and Microsoft sign-in |
| `ENTRA_CLIENT_SECRET` | Same registration → Certificates & secrets | Its secret. Expires; see [Entra ID secret needs updating](../readme.md#entra-id-secret-needs-updating-see-readme) |
| `SHAREPOINT_SITE_URL` | Production: `https://dtvolunteers.sharepoint.com/sites/tracker`. Preview slot and local development: `…/sites/tracker-preview` | Picks the site; its list and drive IDs are in `config.ts` |
| `EXCHANGE_SEND_MAILBOX` | Exchange admin centre → Mailboxes. Today `admin@deantrailvolunteers.org.uk` everywhere | The mailbox the tracker sends from. The environment's registration needs Mail.Send for it ([sharepoint-setup.md](sharepoint-setup.md) section 4) |
| `EVENTBRITE_API_KEY` | Eventbrite → Account settings → API keys | Eventbrite sync |
| `TRACKER_COOKIE_SECRET` | Any long random value, e.g. `openssl rand -base64 32` | Signs the login cookie. Changing it signs everyone out |
| `TRACKER_JOBS_API_KEY` | Any long random value; the same value is in the Azure Logic App | `X-Api-Key` header for the scheduled jobs (sync, stats refresh, backup) |
| `TRACKER_ADMIN_USERS` | Comma-separated `@dtv.org.uk` emails | Who has Admin access (they also need a Profile `User`). On a slot or locally, also who can **receive email**: these accounts and the addresses on their own profiles; see [Email outside production](#email-outside-production) |

All eight are required, listed in [`backend/required-settings.json`](../backend/required-settings.json). Azure also sets `NODE_ENV=production` and `PORT`; `npm run dev` sets `NODE_ENV=development`.

## When a setting is missing

Problems are surfaced, not hidden (see *Error Handling* in [AGENTS.md](../AGENTS.md)):

- **Deploy:** the production and preview deploys check every required setting exists and isn't empty before deploying. If one is missing or empty, the deploy fails and names it, and the running app is left as it was.
- **Start-up:** if a setting goes missing later (removed or renamed in Azure), or `SHAREPOINT_SITE_URL` names a site with no IDs in `config.ts`, the tracker doesn't start. Every page says it isn't set up correctly and what's wrong, and `/api/health` returns 503.

## Email outside production

On a slot or in local development (any site other than the live one), the tracker only sends email to the people testing it, so a test can't email the real volunteers in the copied data by accident. The safe list is:

- each account in that environment's `TRACKER_ADMIN_USERS`, and
- the addresses in `Email` on the profile whose `User` is that account.

Exact addresses only: no other domains, no plus-addresses. Anything else is refused with an error naming the address, and nothing is sent (`backend/services/email-safe-list.ts`). A bulk send checks every recipient first, so it's refused as a whole rather than half sent. To let someone receive test email, add them to the slot's `TRACKER_ADMIN_USERS` and link their profile's `User`. Production sends as before.

This catches accidents; it doesn't stop someone deliberately changing their own profile's `Email`.

## Adding or changing a setting

1. Add it to `backend/config.ts` (read it with `setting('NAME')`) and to `backend/required-settings.json`.
2. Add it to this page and to the `.env` example in [local-development.md](local-development.md).
3. Add it in Azure (*DTVTrackerApp → Environment variables*) on production **and** the `preview` slot before merging, or the deploy check will stop the deploy.

Renaming a setting: add the new name alongside the old one, merge, then delete the old name once the deploy is healthy.

## Where the values live

- **Local development:** `.env` in the project root; see [local-development.md](local-development.md).
- **Azure:** *DTVTrackerApp → Environment variables*, separately for production and each slot; see [azure-app-service.md](azure-app-service.md).
- **App registration and permissions:** see [sharepoint-setup.md](sharepoint-setup.md).
