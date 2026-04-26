# Eventbrite Integration

## Design Principles

**Add, never delete.** The sync only creates new Sessions, Profiles, Entries, and consent Records. It never removes data. Cancellations set a `Cancelled` date on an Entry; the Entry itself is kept.

**Targeted patches only.** When updating existing data, the sync writes only the specific field that changed — `EventbriteAttendeeID` (only if not already set), `Cancelled` (only if null), consent record status (only if changed). It never overwrites existing field values.

**Err on the side of a duplicate profile.** When matching an Eventbrite attendee to a Profile, the sync requires name plus compatible email to be confident. If the name matches but emails differ, a new Profile is created rather than risk exposing one person's data to another. Duplicate profiles surface as a warning badge via the profile stats system.

## ID Storage

Eventbrite IDs are stored at the same level as the DTV object they identify.

| DTV Entity | SharePoint Field | Eventbrite Object |
|------------|------------------|-------------------|
| Group | `EventbriteSeriesID` | Recurring series |
| Session | `EventbriteEventID` | Specific event instance |
| Entry | `EventbriteAttendeeID` | Attendee / ticket holder |

We do not store `EventbriteOrderID` on Entries. Orders belong to Eventbrite's booking/payment layer, while DTV Entries represent one Profile booked onto one Session.

## Volunteer Matching

Attendees are matched to existing Entries and Profiles via a priority chain:

1. **`EventbriteAttendeeID` match** (deterministic) — if an Entry already carries the attendee ID, only consent records are updated. No entry data is changed.
2. **Profile ID match** — if no AttendeeID match but the Profile is already booked on this session, `EventbriteAttendeeID` is stamped onto the existing Entry (only if not already set). Consent records are updated.
3. **Name + email match** — `Profile.MatchName` / `Profile.Title` normalised to lowercase, combined with booking email. High confidence — a new Entry is created with `EventbriteAttendeeID`.
4. **Name-only match** — used when emails are compatible (absent on one or both sides). A new Entry is created.
5. **No match, or name match with conflicting emails** — a new Profile and Entry are created. Conflicting emails mean a different person; creating a duplicate is safer than a wrong match.

`Entry.EventbriteAttendeeID` is the source of truth for the Eventbrite icon on entry cards. The legacy `#Eventbrite` Notes tag and `stats.manual.eventbrite` field remain on pre-migration entries but are no longer used or written by the sync.

## Nightly Sync

Triggered by Azure Logic App via:

`POST /api/eventbrite/nightly-update`

This runs two steps in sequence:

1. **sync-sessions** — finds Eventbrite events by `EventbriteSeriesID` and creates missing Sessions.
2. **sync-entries** — fetches attendees for Eventbrite-linked Sessions (today or future), matches them to Profiles, and creates missing Entries. Uses the shared `syncAttendeesForSession()` function. Also processes cancellations: sets `Cancelled` to the sync run timestamp on any Entry whose `EventbriteAttendeeID` matches a cancelled attendee, but only if `Cancelled` is not already set (preserving any earlier manual cancellation date). The Eventbrite API does not expose a cancellation date on the attendee object, so the sync timestamp is used.

Both steps are also available individually for manual runs from the Admin page.

## Per-Session Refresh

`POST /sessions/:group/:date/refresh`

Manual trigger from the session detail page. Syncs regulars and Eventbrite attendees for a single session using the same `syncAttendeesForSession()` function.

## Historic Backfill

A one-time backfill was run to populate `EventbriteAttendeeID` on existing Entries that predate the field. It matched by profile name against Eventbrite attendees for each session, updating 680 entries across 227 sessions. The endpoint has been removed.

## Duplicate Detection

Duplicate detection is handled entirely by the profile stats warnings system (`profile-stats.ts`). Profiles sharing the same `Title` or `MatchName` key gain a `"Possible Duplicate"` warning in `Profile.Stats.warnings`. This warning surfaces as a badge on entry cards. The sync no longer tags entries with `#Duplicate` or `stats.manual.duplicate`.
