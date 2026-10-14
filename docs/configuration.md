# Configuration

All configuration is in [`backend/config.ts`](../backend/config.ts). Nothing else reads environment variables.

## Settings

A value is a **setting** (an environment variable) only if it is a secret or differs between environments. Everything else, such as list IDs, drive IDs and the tenant ID, is a fixed value in `config.ts`, reviewed and versioned like code.

Settings are named **`TRACKER_{WHO}_{WHAT}`**. The test: **if we choose the name, it starts with `TRACKER_`**. In the Azure portal that keeps ours together and apart from the host's own (`NODE_ENV`, `PORT`, `WEBSITE_…`), which aren't ours to rename. WHO is the system that issued the value (`ENTRA`, `SHAREPOINT`, `EVENTBRITE`), so the name tells you where to find or renew it; it's left out for the tracker's own values (`TRACKER_COOKIE_SECRET`).

| Setting | Where it comes from | Purpose |
|---|---|---|
| `TRACKER_ENTRA_CLIENT_ID` | Entra ID → App registrations → *DTV Tracker (Production)* or *(Preview)* → Overview | The environment's app registration: SharePoint, email and Microsoft sign-in |
| `TRACKER_ENTRA_CLIENT_SECRET` | Same registration → Certificates & secrets | Its secret. Expires; see [Entra ID secret needs updating](../readme.md#entra-id-secret-needs-updating-see-readme) |
| `TRACKER_SHAREPOINT_SITE_URL` | Production: `https://dtvolunteers.sharepoint.com/sites/tracker`. Preview slot and local development: `…/sites/tracker-preview` | Picks the site; its list and drive IDs are in `config.ts` |
| `TRACKER_EVENTBRITE_API_KEY` | Eventbrite → Account settings → API keys | Eventbrite sync |
| `TRACKER_COOKIE_SECRET` | Any long random value, e.g. `openssl rand -base64 32` | Signs the login cookie. Changing it signs everyone out |
| `TRACKER_JOBS_API_KEY` | Any long random value; the same value is in the Azure Logic App | `X-Api-Key` header for the scheduled jobs (sync, stats refresh, backup) |
| `TRACKER_SHARED_MAILBOX` | `{slot}.tracker@deantrailvolunteers.org.uk`: production `tracker@` (`admin@` until switched over), the preview slot and local development `preview.tracker@` | The app's own mailbox and public address: emails are sent from it with Reply-To it, and the About box and *Contact us* links show it. The environment's registration must be allowed to send as it **before** this changes ([sharepoint-setup.md](sharepoint-setup.md) section 4) |
| `TRACKER_ADMIN_USERS` | Comma-separated `@dtv.org.uk` emails | Who has Admin access (they also need a Profile `User`). On a slot or locally, also who can **receive email**: these accounts and the addresses on their own profiles; see [Email outside production](#email-outside-production) |

All eight are required, listed in [`backend/required-settings.json`](../backend/required-settings.json).

**Not ours, but needed on Azure:** `NODE_ENV=production` on production and every slot. We set it in Azure (it isn't automatic), and the tracker's code doesn't read it, but Express does: without it, Express's error pages include stack traces. Azure sets `PORT` itself. Locally, `npm run dev` passes `--local` instead, which is how the tracker knows it's on your machine.

## When a setting is missing

Problems are surfaced, not hidden (see *Error Handling* in [AGENTS.md](../AGENTS.md)):

- **Deploy:** the production and preview deploys check every required setting exists and isn't empty before deploying. If one is missing or empty, the deploy fails and names it, and the running app is left as it was.
- **Start-up:** if a setting goes missing later (removed or renamed in Azure), or `TRACKER_SHAREPOINT_SITE_URL` names a site with no IDs in `config.ts`, the tracker doesn't start. Every page says it isn't set up correctly and what's wrong, and `/api/health` returns 503.

## Email outside production

On a slot or in local development (any site other than the live one), the tracker only sends email to the people testing it, so a test can't email the real volunteers in the copied data by accident. The safe list is:

- each account in that environment's `TRACKER_ADMIN_USERS`, and
- the addresses in `Email` on the profile whose `User` is that account.

Exact addresses only: no other domains, no plus-addresses. Anything else is refused with an error naming the address, and nothing is sent (`backend/services/email-safe-list.ts`). A bulk send checks every recipient first, so it's refused as a whole rather than half sent. To let someone receive test email, add them to the slot's `TRACKER_ADMIN_USERS` and link their profile's `User`. Production sends as before.

This catches accidents; it doesn't stop someone deliberately changing their own profile's `Email`. Code that gets around it is caught by Exchange instead: a slot's mailbox can only send to the `test.tracker@` list, one recipient at a time ([sharepoint-setup.md](sharepoint-setup.md#locking-a-slots-mailbox)). Everyone on the app's list should also be on `test.tracker@`, or their test emails bounce.

## Adding or changing a setting

1. Add it to `backend/config.ts` (read it with `setting('NAME')`) and to `backend/required-settings.json`.
2. Add it to this page and to the `.env` example in [local-development.md](local-development.md).
3. Add it in Azure (*DTVTrackerApp → Environment variables*) on production **and** the `preview` slot before merging, or the deploy check will stop the deploy.

Renaming a setting: add the new name alongside the old one, merge, then delete the old name once the deploy is healthy.

## Where the values live

- **Local development:** `.env` in the project root; see [local-development.md](local-development.md).
- **Azure:** *DTVTrackerApp → Environment variables*, separately for production and each slot; see [azure-app-service.md](azure-app-service.md).
- **App registration and permissions:** see [sharepoint-setup.md](sharepoint-setup.md).
