# Eventbrite Integration

## ID Storage

Eventbrite IDs are stored at the same level as the DTV object they identify.

| DTV Entity | SharePoint Field | Eventbrite Object |
|------------|------------------|-------------------|
| Group | `EventbriteSeriesID` | Recurring series |
| Session | `EventbriteEventID` | Specific event instance |
| Entry | _not currently stored_ | Attendee / ticket holder |

We do not store `EventbriteOrderID` on Entries. Orders belong to Eventbrite’s booking/payment layer, while DTV Entries represent one Profile booked onto one Session.

## Volunteer Matching

In the current implementation, Eventbrite attendees are matched to Profiles via `Profile.MatchName`, a lowercase normalised name field.

No direct Eventbrite attendee ID is stored on the Entry yet, so re-sync and deduplication still rely on matching attendee details back to Profiles and Sessions.

## Nightly Sync

Triggered by Azure Logic App via:

`POST /api/eventbrite/nightly-update`

This runs two steps in sequence:

1. **sync-sessions** — finds Eventbrite events by `EventbriteSeriesID` and creates missing Sessions.
2. **sync-entries** — fetches attendees for Eventbrite-linked Sessions, matches them to Profiles, and creates missing Entries.

Both steps are also available individually for manual runs from the Admin page.

## Future Work

- Add `Entry.EventbriteAttendeeID` to store the Eventbrite attendee ID directly on each Entry.
- Use `Session.EventbriteEventID + Entry.EventbriteAttendeeID` as the hard link back to Eventbrite.
- Replace the `#eventbrite` tag in `Entry.Notes` with a derived label based on `EventbriteAttendeeID` being present.
- Do not add `Entry.EventbriteOrderID` unless a proven reporting need appears.
- Current eventbrite sync does the checks for possible duplicates. Going forward that will be a dervived warning in the stats json.