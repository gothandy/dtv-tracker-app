# API Reference

All endpoints are prefixed with `/api`. Auth routes (`/auth/...`) are listed at the bottom.

## Access Levels

| Level | Who |
|---|---|
| **Public** | No login required |
| **Trusted** | Any Microsoft login — Read Only, Check In, or Admin |
| **Check In+** | Check In or Admin |
| **Admin** | Admin only |
| **Admin / API key** | Admin session or `X-Api-Key` header (scheduled sync) |
| **SS (own)** | Self-service login restricted to own data; handler enforces ownership |

Self-service users get the **Public** GET allowlist plus their own profile (`/profiles/:slug` with numeric suffix), own entry detail, and own upload context. All other routes return 403.

---

## Stats & Config

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/health` | GET | Trusted | Health check |
| `/api/stats` | GET | Public | Dashboard statistics (current + last FY) |
| `/api/stats/history` | GET | Public | Historical stats by FY |
| `/api/config` | GET | Trusted | App configuration (SharePoint site URL) |
| `/api/cache/clear` | POST | Admin | Clear all server-side caches |
| `/api/cache/stats` | GET | Trusted | Cache hit/miss statistics |

## Groups

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/groups` | GET | Public | All groups with regulars count |
| `/api/groups` | POST | Admin | Create new group |
| `/api/groups/:key` | GET | Public | Group detail with sessions and stats |
| `/api/groups/:key` | PATCH | Admin | Update group |
| `/api/groups/:key` | DELETE | Admin | Delete group |

## Sessions

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/sessions` | GET | Public | All sessions with calculated hours and registrations |
| `/api/sessions` | POST | Admin | Create new session |
| `/api/sessions/export` | GET | Admin | Export this FY sessions as CSV |
| `/api/sessions/refresh-stats` | POST | Admin / API key | Bulk refresh pre-computed stats for all sessions |
| `/api/sessions/bulk-tag` | POST | Admin | Apply taxonomy terms to multiple sessions |
| `/api/sessions/:group/:date` | GET | Public | Session detail with entries |
| `/api/sessions/:group/:date` | PATCH | Check In+ | Update session (name, description, date, cover) |
| `/api/sessions/:group/:date` | DELETE | Admin | Delete session |
| `/api/sessions/:group/:date/entries` | POST | SS (own) / Check In+ | Register a volunteer for a session |
| `/api/sessions/:group/:date/add-regulars` | POST | Admin | Bulk add regulars as entries |
| `/api/sessions/:group/:date/refresh` | POST | Check In+ | Refresh session entry data |
| `/api/sessions/:group/:date/stats` | POST | Check In+ | Recompute and save stats for a single session |
| `/api/sessions/:group/:date/unchecked-entries` | DELETE | Check In+ | Remove all unchecked entries from a session |

## Entries

Volunteer attendance records are personal data. The list endpoint is Admin-only. Self-service users can only access their own entry by ID.

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/entries` | GET | Admin | All entries across all sessions |
| `/api/entries/recent` | GET | Trusted | Recent entries |
| `/api/entries/refresh-stats` | POST | Admin | Bulk refresh entry stats |
| `/api/entries/:id` | GET | SS (own) / Trusted | Entry detail with FY hours |
| `/api/entries/:id` | PATCH | Check In+ | Update entry (check-in, hours, notes) |
| `/api/entries/:id` | DELETE | SS (own) / Admin | Delete entry |
| `/api/entries/:id/upload-context` | GET | SS (own) / Trusted | Volunteer name and session context for upload page |
| `/api/entries/:id/photos` | POST | SS (own) / Check In+ | Upload photos to entry |
| `/api/entries/:id/notify` | POST | Check In+ | Send pre-session notification email to volunteer |

## Profiles

Volunteer profiles contain PII (name, email). Listing and export are restricted to Trusted users. Self-service users can access their own profile only.

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/profiles` | GET | Trusted | All profiles with FY stats |
| `/api/profiles` | POST | Check In+ | Create new profile |
| `/api/profiles/export` | GET | Admin | Export profiles as CSV |
| `/api/profiles/refresh-stats` | POST | Admin / API key | Bulk refresh pre-computed stats for all profiles |
| `/api/profiles/records/options` | GET | Trusted | Available record types and statuses |
| `/api/profiles/:slug` | GET | SS (own) / Trusted | Profile detail with entries and group hours |
| `/api/profiles/:slug` | PATCH | Check In+ | Update profile |
| `/api/profiles/:slug` | DELETE | Admin | Delete profile (only if no entries) |
| `/api/profiles/:slug/regulars` | POST | Check In+ | Add as regular to group |
| `/api/profiles/:slug/transfer` | POST | Admin | Transfer entries between profiles |
| `/api/profiles/:id/records` | POST | Admin | Create consent/governance record |
| `/api/profiles/:id/consent` | POST | SS (own) / Check In+ | Upsert privacy and photo consent records |

## Records

Consent and governance records are personal data. All write access is Admin-only.

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/records/export` | GET | Admin | Export records as CSV |
| `/api/records/bulk` | POST | Admin | Bulk create or update records |
| `/api/records/:id` | PATCH | Admin | Update record |
| `/api/records/:id` | DELETE | Admin | Delete record |

## Regulars

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/regulars/:id` | PATCH | Check In+ | Update regular assignment |
| `/api/regulars/:id` | DELETE | Check In+ | Remove regular assignment |

## Taxonomy

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/tags/taxonomy` | GET | Public | Full term store tree (term labels, GUIDs, hierarchy) |
| `/api/tags/hours-by-taxonomy` | GET | Public | Hours aggregated by term with ancestor rollup |

Session terms are read from the `metadata` field in `GET /api/sessions/:group/:date` and written via `PATCH /api/sessions/:group/:date` (`metadataTags` body field). Bulk application across multiple sessions uses `POST /api/sessions/bulk-tag`.

## Media

GET endpoints are public, but `name` and `webUrl` fields (which contain the uploader's filename and therefore PII) are stripped from public responses. Write operations require Check In+.

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/media` | GET | Public | List media files in a session folder (`?groupKey=&date=`) |
| `/api/media/counts` | GET | Public | Batch photo counts by session folder |
| `/api/media/:itemId/download` | GET | Public | Download a media file |
| `/api/media/:itemId/stream` | GET | Public | Stream a media file (video playback) |
| `/api/media/:itemId` | PATCH | Check In+ | Update media item metadata |
| `/api/media/:itemId` | DELETE | Admin | Delete media item |

## Eventbrite Sync

All write endpoints also accept `X-Api-Key` authentication for the scheduled Azure Logic App sync.

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/eventbrite/nightly-update` | POST | Admin / API key | Full nightly run: sync, stats refresh, backup, cache warmup |
| `/api/eventbrite/sync-sessions` | POST | Admin / API key | Sync Eventbrite events → sessions |
| `/api/eventbrite/sync-attendees` | POST | Admin / API key | Sync Eventbrite attendees → profiles/entries |
| `/api/eventbrite/unmatched-events` | GET | Trusted | List Eventbrite events with no matching group |
| `/api/eventbrite/event-config-check` | GET | Trusted | Check event config (child ticket, consent questions) |

## Backup

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/backup/export-all` | POST | Admin / API key | Export all 6 lists + taxonomy + schema to SharePoint Backups folder |

## Email

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/email/render` | POST | Admin | Render email template with provided variables |

## Auth

Auth routes are not under `/api/` and are not subject to `requireAuth` or `requireAdmin`.

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/auth/providers` | GET | Public | Available auth providers |
| `/auth/me` | GET | Public | Current session user |
| `/auth/logout` | GET | Public | Clear session and cookie |
| `/auth/login` | GET | Public | Initiate Microsoft Entra ID login |
| `/auth/callback` | GET | Public | Microsoft OAuth callback |
| `/auth/magic/send` | POST | Public | Send magic link email |
| `/auth/magic/callback` | GET | Public | Redeem magic link token |
| `/auth/verify/send` | POST | Public | Send verification code email |
| `/auth/verify/check` | POST | Public | Verify code and set session |

---

## Pages

All pages are Vue 3 SPA routes served at `/`.

| Page | URL | Description |
|---|---|---|
| Dashboard | `/` | FY stats, next session, personalised calendar |
| Admin | `/admin` | Eventbrite sync buttons, exports, site links |
| Groups | `/groups` | Groups listing with FY filter |
| Group Detail | `/groups/:key` | Stats, regulars, sessions, edit/delete |
| Sessions | `/sessions` | Sessions listing with FY filter, search, term filters |
| Session Detail | `/sessions/:group/:date` | Entries, check-in, set hours, gallery, edit/delete |
| Volunteers | `/profiles` | Profiles with FY filter, sort, group filter, search |
| Profile Detail | `/profiles/:slug` | FY stats, group hours, entries, records |
| Entries | `/entries` | Admin-only: all entries with filters and edit modal |
| Login | `/login` | Magic link + verification code (self-service) and Microsoft (trusted users) |
| Upload | `/upload` | Volunteer photo upload (authenticated, `?entryId=` param) |
| Consent | `/profiles/:slug/consent` | Privacy and photo consent collection |
