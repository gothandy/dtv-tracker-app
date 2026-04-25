# Eventbrite Integration

## ID Storage

Eventbrite IDs are stored at the same level as the DTV object they identify.

| DTV Entity | SharePoint Field | Eventbrite Object |
|------------|------------------|-------------------|
| Group | `EventbriteSeriesID` | Recurring series |
| Session | `EventbriteEventID` | Specific event instance |
| Entry | `EventbriteAttendeeID` | Attendee / ticket holder |

We do not store `EventbriteOrderID` on Entries. Orders belong to Eventbrite's booking/payment layer, while DTV Entries represent one Profile booked onto one Session.

## Volunteer Matching

Eventbrite attendees are matched to Profiles via a priority chain:

1. **`EventbriteAttendeeID` match** (deterministic) — if an existing entry already carries the attendee ID, that entry is updated in-place.
2. **Name + email match** — `Profile.MatchName` / `Profile.Title` normalised to lowercase, combined with booking email.
3. **Name-only match** — used when emails are compatible (absent on one or both sides).
4. **No match** — a new Profile is created.

`Entry.EventbriteAttendeeID` is the source of truth for the Eventbrite icon on entry cards. The legacy `#Eventbrite` Notes tag and `stats.manual.eventbrite` field remain on pre-migration entries as fallbacks but are no longer written by the sync.

## Nightly Sync

Triggered by Azure Logic App via:

`POST /api/eventbrite/nightly-update`

This runs two steps in sequence:

1. **sync-sessions** — finds Eventbrite events by `EventbriteSeriesID` and creates missing Sessions.
2. **sync-entries** — fetches attendees for Eventbrite-linked Sessions (today or future), matches them to Profiles, and creates missing Entries. Uses the shared `syncAttendeesForSession()` function.

Both steps are also available individually for manual runs from the Admin page.

## Quick Sync

`POST /api/eventbrite/quick-sync?since=24h|48h|7d`

Fetches org-wide attendees changed in the given window using `getOrgAttendees(changedSince)` — much faster than a full scan. Uses the same `syncAttendeesForSession()` function per session.

## Per-Session Refresh

`POST /sessions/:group/:date/refresh`

Manual trigger from the session detail page. Syncs regulars and Eventbrite attendees for a single session using the same `syncAttendeesForSession()` function.

## Historic Backfill

`POST /api/eventbrite/backfill-attendee-ids`

One-time endpoint to populate `EventbriteAttendeeID` on existing Entries that predate this field. Matches by profile name against Eventbrite attendees for each session. Safe to run multiple times — skips entries that already have the field set.

## Duplicate Detection

Duplicate detection is handled entirely by the profile stats warnings system (`profile-stats.ts`). Profiles sharing the same `Title` or `MatchName` key gain a `"Possible Duplicate"` warning in `Profile.Stats.warnings`. This warning surfaces as a badge on entry cards. The sync no longer tags entries with `#Duplicate` or `stats.manual.duplicate`.
