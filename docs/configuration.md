# Configuration

All settings are environment variables: in `.env` locally, and under *Environment variables* in Azure (the `preview` slot uses the same values as production).

| Setting | Required | Purpose |
|---|---|---|
| `SHAREPOINT_SITE_URL`, `SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET`, `SHAREPOINT_TENANT_ID` | Yes | SharePoint site and Entra app credentials (also used for Microsoft sign-in and sending email) |
| `*_LIST_GUID` (Groups, Projects, Sessions, Entries, Profiles, Regulars, Records, Logins) | Yes | SharePoint list IDs; same for everyone |
| `SESSION_SECRET` | Yes in production | Signs session cookies |
| `ADMIN_USERS` | Yes | Comma-separated emails with Admin access (also need a Profile `User`) |
| `EVENTBRITE_API_KEY`, `EVENTBRITE_ORGANIZATION_ID` | For Eventbrite sync | Eventbrite API access |
| `API_SYNC_KEY` | For scheduled sync | `X-Api-Key` the Azure Logic App sends to the nightly sync endpoint |
| `MAIL_SENDER` | For email | Mailbox (UPN) that sends verification codes and session emails; needs Graph `Mail.Send` |
| `EMAIL_RATE_LIMIT_PER_HOUR` | No (default `60`) | Global cap on sign-in emails |
| `AUTH_BASIC_TTL_HOURS` | No (default `72`) | Self-service session lifetime; token hashes stored in the Logins list |
| `MEDIA_LIBRARY_DRIVE_ID` | For photo uploads | Media library drive on the tracker site (Graph: `GET /sites/{site-id}/drives`) |
| `DOCUMENTS_DRIVE_ID` | For backups and project docs | Documents library drive: `Backups/` and `Projects/{slug}/` |
| `TAXONOMY_TERM_SET_ID` | For session tags | SharePoint Term Store term set |
| `SHAREPOINT_TIMEZONE` | No (default `Europe/London`) | IANA timezone for date conversion |
| `FRONTEND_URL` | Production | Canonical origin (`https://tracker.dtv.org.uk`) for links in emails and Open Graph tags |
| `DOCS_REDIRECT_HOST` | No (default `docs.dtv.org.uk`) | Host that redirects to `/docs` on the tracker |
| `FACEBOOK_APP_ID` | No | Meta app ID for Facebook link previews |
| `PORT`, `NODE_ENV` | No | Set by the host / `npm run dev` |

Local development: put these in `.env` in the project root (see [local-development.md](local-development.md)). Azure: *DTVTrackerApp → Environment variables*; see [azure-app-service.md](azure-app-service.md).
