# Backend Features

## Core CRUD

Full create/read/update/delete for all entities via TypeScript API routes:

- **Groups** — volunteer crews; key used as URL slug and folder prefix
- **Sessions** — events linked to a group; date required; hours and registrations calculated from entries
- **Entries** — volunteer↔session junction; check-in (`Checked`), `Hours`, `Count`, `Notes` (hashtags)
- **Profiles** — volunteer records; `Email` comma-separated for multi-address matching
- **Records** — consents and governance items per profile (Privacy, Photo, Newsletter, Membership, Discount Card)
- **Regulars** — profile↔group regular assignments

## Volunteer Tracking

- **Registration**: create an Entry linking a volunteer to a future session
- **Check-in**: mark Entry as `Checked`; triggers stats recalculation
- **Hours**: set per entry or bulk-set across a session
- **Bulk add regulars**: add all regulars for a group to a session in one action
- **Profile transfer**: merge duplicate profiles — moves all entries to the target profile

## Eventbrite Integration

Sync routes in [routes/eventbrite.ts](../../routes/eventbrite.ts):

- **Session sync**: matches Eventbrite events to groups by `EventbriteSeriesID`; creates missing sessions
- **Attendee sync**: fetches attendees for upcoming sessions; creates profiles, entries, and consent records; tags `#Duplicate` when same name + different email detected
- **Nightly update** (`POST /api/eventbrite/nightly-update`): full run — session sync → attendee sync → stats refresh → backup export → cache warmup; returns human-readable summary for email notification
- **Azure Logic App** triggers nightly update daily at 05:30 UTC via `X-Api-Key` auth

## Session Taxonomy

Terms stored as managed metadata on the Sessions list via SharePoint Term Store (Graph beta). Term set configured via `TAXONOMY_TERM_SET_ID` env var. Hierarchical — hours aggregate up to ancestor terms. Bulk application supported via `POST /api/sessions/bulk-tag`. See [docs/features/tagging.md](tagging.md) for write mechanism detail (hidden companion field workaround).

## Media

Upload, storage, and serving — see [docs/features/media.md](media.md).

## Server-Side Caching

Four independent caches (NodeCache, column schema, taxonomy tree, cover image). Targeted invalidation on writes — only the affected keys are evicted. Session listing performance relies on pre-computed `Stats` JSON field on Sessions list, refreshed after every entry write and via nightly bulk refresh. See [AGENTS.md](../../AGENTS.md#caching-architecture) for TTL table.

## Pre-Session Email Notifications

Handlebars template system (`templates/email/`). `renderEmail(template, vars)` renders templates with MSO-safe table structure via `{{#section}}` block helper. Sent via Microsoft Graph Mail using app credentials (`MAIL_SENDER` env var). Sandbox preview at `POST /api/email/render`.

## Nightly Backup Export

`POST /api/backup/export-all` exports all 6 lists + taxonomy + schema to `Backups/` in SharePoint Shared Documents as JSON. SHA-256 diff check skips unchanged files. Also runs as the final step of the nightly Eventbrite sync. `BACKUP_DRIVE_ID` env var required.

## Stats Pipeline

Pre-computed `Stats` field on Sessions list stores aggregate JSON (count, hours, new, child, regular, eventbrite, media). Kept fresh by `computeAndSaveSessionStats()` after every entry/record/media write. Profiles list has a similar `Stats` field used by the dashboard. Detail pages always fetch live entry data — Stats used only by listing and aggregate views.

## Planned

- Sync logging to a SharePoint Logs list
- Report generation with custom date ranges and export
