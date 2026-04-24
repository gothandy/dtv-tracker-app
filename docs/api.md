# API Reference

All endpoints are prefixed with `/api`. Authentication is required unless stated otherwise.

## Stats & Config

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check (unauthenticated) |
| `/api/stats` | GET | Dashboard statistics (current + last FY) |
| `/api/stats/history` | GET | Historical stats by FY |
| `/api/config` | GET | App configuration (SharePoint site URL) |
| `/api/cache/clear` | POST | Clear server-side data cache |
| `/api/cache/stats` | GET | Cache hit/miss statistics |

## Groups

| Endpoint | Method | Description |
|---|---|---|
| `/api/groups` | GET | All groups with regulars count |
| `/api/groups` | POST | Create new group |
| `/api/groups/:key` | GET | Group detail with sessions and stats |
| `/api/groups/:key` | PATCH | Update group |
| `/api/groups/:key` | DELETE | Delete group |

## Sessions

| Endpoint | Method | Description |
|---|---|---|
| `/api/sessions` | GET | All sessions with calculated hours and registrations |
| `/api/sessions` | POST | Create new session |
| `/api/sessions/export` | GET | Export this FY sessions as CSV |
| `/api/sessions/refresh-stats` | POST | Bulk refresh pre-computed stats for all sessions |
| `/api/sessions/bulk-tag` | POST | Apply taxonomy terms to multiple sessions |
| `/api/sessions/:group/:date` | GET | Session detail with entries |
| `/api/sessions/:group/:date` | PATCH | Update session (name, description, date, cover) |
| `/api/sessions/:group/:date` | DELETE | Delete session |
| `/api/sessions/:group/:date/entries` | POST | Create entry (register volunteer) |
| `/api/sessions/:group/:date/add-regulars` | POST | Bulk add regulars as entries |
| `/api/sessions/:group/:date/refresh` | POST | Refresh session entry data |
| `/api/sessions/:group/:date/stats` | POST | Recompute and save stats for a single session |
| `/api/sessions/:group/:date/unchecked-entries` | DELETE | Remove all unchecked entries from a session |

## Entries

| Endpoint | Method | Description |
|---|---|---|
| `/api/entries` | GET | All entries across all sessions (admin only) |
| `/api/entries/recent` | GET | Recent entries |
| `/api/entries/refresh-stats` | POST | Bulk refresh entry stats |
| `/api/entries/:id` | GET | Entry detail with FY hours |
| `/api/entries/:id` | PATCH | Update entry (check-in, hours, notes) |
| `/api/entries/:id` | DELETE | Delete entry |
| `/api/entries/:id/upload-context` | GET | Upload context for entry (volunteer name + session) |
| `/api/entries/:id/photos` | POST | Upload photos to entry |
| `/api/entries/:id/notify` | POST | Send pre-session notification email to volunteer |

## Profiles

| Endpoint | Method | Description |
|---|---|---|
| `/api/profiles` | GET | All profiles with FY stats (optional `?group=` filter) |
| `/api/profiles` | POST | Create new profile |
| `/api/profiles/export` | GET | Export profiles as CSV |
| `/api/profiles/refresh-stats` | POST | Bulk refresh pre-computed stats for all profiles |
| `/api/profiles/records/options` | GET | Available record types and statuses |
| `/api/profiles/:slug` | GET | Profile detail with entries and group hours |
| `/api/profiles/:slug` | PATCH | Update profile |
| `/api/profiles/:slug` | DELETE | Delete profile (only if no entries) |
| `/api/profiles/:slug/regulars` | POST | Add as regular to group |
| `/api/profiles/:slug/transfer` | POST | Transfer entries between profiles |
| `/api/profiles/:id/records` | POST | Create consent/governance record |
| `/api/profiles/:id/consent` | POST | Upsert privacy and photo consent records |

## Records

| Endpoint | Method | Description |
|---|---|---|
| `/api/records/export` | GET | Export records as CSV |
| `/api/records/bulk` | POST | Bulk create or update records |
| `/api/records/:id` | PATCH | Update record |
| `/api/records/:id` | DELETE | Delete record |

## Regulars

| Endpoint | Method | Description |
|---|---|---|
| `/api/regulars/:id` | PATCH | Update regular assignment |
| `/api/regulars/:id` | DELETE | Remove regular assignment |

## Taxonomy

| Endpoint | Method | Description |
|---|---|---|
| `/api/tags/taxonomy` | GET | Full term store tree (term labels, GUIDs, hierarchy) |
| `/api/tags/hours-by-taxonomy` | GET | Hours aggregated by term with ancestor rollup |

Session terms are read from the `metadata` field in `GET /api/sessions/:group/:date` and written via `PATCH /api/sessions/:group/:date` (`metadataTags` body field). Bulk application across multiple sessions uses `POST /api/sessions/bulk-tag`.

## Media

| Endpoint | Method | Description |
|---|---|---|
| `/api/media` | GET | List media files in a session folder (`?groupKey=&date=`) |
| `/api/media/counts` | GET | Batch photo counts by session folder (`?paths=gk/date,...`) |
| `/api/media/:itemId/download` | GET | Download a media file |
| `/api/media/:itemId/stream` | GET | Stream a media file (video playback) |
| `/api/media/:itemId` | PATCH | Update media item metadata (admin only) |
| `/api/media/:itemId` | DELETE | Delete media item (admin only) |

## Eventbrite Sync

| Endpoint | Method | Description |
|---|---|---|
| `/api/eventbrite/nightly-update` | POST | Full nightly run: sync, stats refresh, backup, cache warmup |
| `/api/eventbrite/quick-sync` | POST | Quick sync without full stats refresh |
| `/api/eventbrite/sync-sessions` | POST | Sync Eventbrite events → sessions |
| `/api/eventbrite/sync-attendees` | POST | Sync Eventbrite attendees → profiles/entries |
| `/api/eventbrite/unmatched-events` | GET | List Eventbrite events with no matching group |
| `/api/eventbrite/event-config-check` | GET | Check event config (child ticket, consent questions) |

## Backup

| Endpoint | Method | Description |
|---|---|---|
| `/api/backup/export-all` | POST | Export all 6 lists + taxonomy + schema to SharePoint Backups folder |

## Email

| Endpoint | Method | Description |
|---|---|---|
| `/api/email/render` | POST | Render email template with provided variables |

## Auth

| Endpoint | Method | Description |
|---|---|---|
| `/auth/providers` | GET | Available auth providers |
| `/auth/me` | GET | Current session user |
| `/auth/logout` | GET | Clear session and cookie |
| `/auth/login` | GET | Initiate Microsoft Entra ID login |
| `/auth/callback` | GET | Microsoft OAuth callback |
| `/auth/magic/send` | POST | Send magic link email |
| `/auth/magic/callback` | GET | Redeem magic link token |
| `/auth/verify/send` | POST | Send verification code email |
| `/auth/verify/check` | POST | Verify code and set session |

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
