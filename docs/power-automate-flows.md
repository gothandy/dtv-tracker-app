# Power Automate Flows

Documents the existing Power Automate flows in the "DTV [Eventbrite]" solution. These flows sync Eventbrite event data into SharePoint lists. The goal is to migrate this logic into the Node.js app as an `eventbrite-service.ts`.

## Solution Overview

The Power Platform solution contains:
- 1 scheduled orchestrator flow
- 8 child flows (called by the orchestrator or each other)
- 2 environment variables (API Key, Organisation ID)
- 1 core flow (Entry Create or Update, shared with non-Eventbrite use)

## Orchestrator: Run All and Email [Scheduled]

**Trigger**: Recurrence (scheduled)

```
Main Scope (try):
  1. Run New Groups and Sessions (child flow)
  2. Run Entries from Future Sessions (child flow)
  3. Send Success Email

Error Scope (catch):
  Send Failure Email
```

Simple try/catch wrapper. The real logic lives in the two child flows.

## Child Flow: Entries from Session

**Trigger**: Manual (called by parent flow)
**Input**: Eventbrite Event ID

This is the core sync flow. Given an Eventbrite event ID, it fetches attendees and creates entries in SharePoint.

### Steps

1. **Initialize variables**: `NewEntryCount` (integer), `Attendees` (array)
2. **Call Eventbrite API**: `GET /v3/events/{eventId}/attendees/?status=attending&expand=profile`
   - Bearer token auth using environment variable
   - `status=attending` filters out cancelled attendees
3. **Parse response** and loop through attendees (handles pagination)
4. **For each attendee**:
   - Extract attendee name
   - **Skip if "Info Requested"** — placeholder attendees in group orders who haven't provided details yet
   - Extract email (when available)
   - **Run Profile Get or Create** (child flow) — matches by MatchName
   - Determine **IsChild** from ticket type (Adult vs Child)
   - Build attendee JSON object
   - Append to Attendees array
5. **Convert and parse** the attendees array (Power Automate workaround for array typing)
6. **For each attendee** (second loop, over parsed array):
   - Look up Profile ID
   - **Filter** to check if entry already exists for this volunteer + session
   - Get entry count
   - Determine IsChild flag
   - **Run Entry Create or Update** (child flow) — only creates, never updates or deletes
   - Increment `NewEntryCount`
7. **Return** success with count

### Key Design Decisions

| Decision | Reason |
|----------|--------|
| **MatchName as identifier** (lowercase name) | Emails unreliable: missing on walk-in registrations, multiple per Eventbrite order, volunteers use different emails over time |
| **Never update or delete entries** | Append-only is simple and safe; rarely causes problems in practice |
| **Skip "Info Requested"** | Placeholder attendees in group orders who haven't filled in their details |
| **Ticket type → IsChild** | Two Eventbrite ticket types: Adult and Child. Maps to `#Child` tag on entries |

## Child Flow: New Groups and Sessions

**Trigger**: Manual (called by orchestrator)
**Input**: Eventbrite events JSON (from organisation API)

Discovers new Eventbrite events and creates corresponding Groups and Sessions in SharePoint. Add-only — never updates or deletes existing records.

### Steps

1. **Initialize variables**: `NewSessionCount` (integer), `NewGroupCount` (integer)
2. **Get Events JSON** from Eventbrite API (organisation events endpoint)
3. **Parse JSON** response
4. **For each Event**:
   - Extract: Event ID, Date, Name, Description, Series ID, URL
   - **If Series ID is null** (standalone event, not part of a series):
     - Run **Session Get or Create** (no Group) — creates session without a group link
   - **If Series ID exists** (event belongs to a recurring series):
     - Run **Group Get or Create** — finds or creates Group by Eventbrite Series ID
     - Increment `NewGroupCount`
     - Run **Session Get or Create** (with Group) — creates session linked to the group
   - Increment `NewSessionCount`
5. **Return** response with counts

### Key Design Decisions

| Decision | Reason |
|----------|--------|
| **Series ID → Group mapping** | Eventbrite recurring series map to volunteer groups/crews |
| **Standalone events have no group** | One-off events don't belong to a series, so no group link |
| **Add-only, no updates** | If a group or session already exists, skip it |

## Child Flow: Entries from Future Sessions

**Trigger**: Manual (called by orchestrator)

Queries SharePoint for future sessions that have an Eventbrite Event ID, then calls "Entries from Session" for each one.

### SharePoint Query

```
List: Sessions (857fc298-6eba-49ab-99bf-9712ef6b8448)
Filter: EventbriteEventID ne null and Date ge '{utcNow()}'
Pagination: minimumItemCount 500
```

Only syncs **future** sessions — past sessions are left alone. Only sessions with an `EventbriteEventID` are synced (sessions created manually in the app have no Eventbrite link).

For each matching session, calls **Entries from Session** (child flow) with the Eventbrite Event ID.

## Child Flows: Get or Create Pattern

Three child flows follow the same pattern — look up a SharePoint item by an Eventbrite identifier, create it if it doesn't exist, return the ID. Add-only, never update or delete.

| Flow | Matches on | Creates in | Key fields |
|------|-----------|------------|------------|
| **Group Get or Create** | `EventbriteSeriesID` | Groups list | Name, Description, EventbriteSeriesID |
| **Session Get or Create** | `EventbriteEventID` | Sessions list | Title, Date, Crew (group lookup), EventbriteEventID, Url |
| **Profile Get or Create** | `MatchName` (lowercase) | Profiles list | Title (display name), Email, MatchName |

## Other Flows

- **Empty Attendee Name (Trigger)** — handles attendees with missing names
- **Session Update (PowerApp)** — updates session details (triggered from PowerApp, legacy)

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `dtv_EventbriteAPIKey` | Bearer token for Eventbrite API authentication |
| `dtv_EventbriteOrganisationID` | Eventbrite organisation ID for API queries |

## MatchName Design

The `MatchName` field on Profiles is a **lowercase version of the volunteer's name**, used as a unique identifier for matching Eventbrite attendees to SharePoint profiles.

Why not email?
- **Walk-in/on-the-day registrations** don't capture email
- **Group orders** on Eventbrite can have multiple different emails
- **Volunteers change emails** over time

MatchName allows:
- Reliable matching across Eventbrite syncs
- The display name (`Title`) to be updated independently
- Case-insensitive comparison (stored as lowercase)

## Eventbrite API Usage

### Organisation Events Endpoint
```
GET https://www.eventbriteapi.com/v3/organizations/{orgId}/events/?status=live&page_size=100
Authorization: Bearer {API_KEY}
```

Returns live events for the organisation. Used by "New Groups and Sessions" to discover new events. Notes from the flow: `?page_size=200&order_by=start_desc` can be used for back-dating, `?status=live` for scheduled use.

### Attendees Endpoint
```
GET https://www.eventbriteapi.com/v3/events/{eventId}/attendees/?status=attending&expand=answers
Authorization: Bearer {API_KEY}
```

Returns paginated list of attendees for an event. The `status=attending` filter excludes cancelled orders. Use `expand=answers` to include custom question responses inline.

### Custom Questions

Two waiver-type custom questions are configured on events (currently Wednesday group, rolling out to others):

| Question ID | Question | Type |
|-------------|----------|------|
| `315115173` | Personal Data Consent | waiver (required) |
| `315115803` | Photo and Video Consent | waiver (required) |

Answers appear in each attendee's `answers` array:

```json
{
  "answers": [
    { "answer": "accepted", "question": "Personal Data Consent", "question_id": "315115173" },
    { "answer": "accepted", "question": "Photo and Video Consent", "question_id": "315115803" }
  ]
}
```

### Consent Handling

- **Always overwrite** the profile's consent fields with the most recent Eventbrite response. No need to track history — latest answer wins.
- If a profile has Photo/Video consent declined, entries for that volunteer get a `#NoPhoto` tag.
- Ticket type comes through as `ticket_class_name` (e.g. `"Adult  with Free Parking"`) — check for `"Child"` substring to determine IsChild.

## Migration to Node.js

### Mapping to Existing Architecture

```
Power Automate Flow              →  Node.js Equivalent
─────────────────────────────────────────────────────────
Eventbrite API calls             →  eventbrite-client.ts (new)
New Groups and Sessions          →  syncGroupsAndSessions() — loop org events, create groups/sessions
Entries from Future Sessions     →  syncAllEntries() — loop upcoming sessions, call syncEntriesFromSession
Entries from Session             →  syncEntriesFromSession() — fetch attendees, create profiles/entries
Profile Get or Create            →  profiles-repository.ts (findOrCreate by matchName)
Entry Create or Update           →  entries-repository.ts (create if not exists)
Group Get or Create              →  groups-repository.ts (findOrCreate by seriesId)
Session Get or Create            →  sessions-repository.ts (findOrCreate by eventId)
Run All and Email [Scheduled]    →  Scheduled task or manual API endpoint
```

### Pseudo-code for Core Sync

```typescript
async function syncEntriesFromSession(eventbriteEventId: string, sessionId: number) {
  const attendees = await eventbriteClient.getAttendees(eventbriteEventId);

  for (const attendee of attendees) {
    if (attendee.isInfoRequested) continue;

    const matchName = attendee.name.toLowerCase();
    const profile = await profilesRepo.findOrCreate(matchName, attendee.email);
    const isChild = attendee.ticketClassName.includes('Child');

    // Always overwrite consent fields with latest response
    await profilesRepo.updateConsent(profile.id, {
      dataConsent: attendee.answers.find(a => a.question_id === DATA_CONSENT_QID)?.answer,
      photoConsent: attendee.answers.find(a => a.question_id === PHOTO_CONSENT_QID)?.answer,
    });

    const existing = await entriesRepo.findBySessionAndVolunteer(sessionId, profile.id);
    if (!existing) {
      const tags = [isChild && '#Child', !profile.photoConsent && '#NoPhoto'].filter(Boolean);
      await entriesRepo.create({
        sessionId,
        volunteerId: profile.id,
        notes: tags.join(' '),
        checked: false,
        count: 1,
        hours: 0,
      });
    }
  }
}
```

---

*Created: 2026-02-15*
*Last Updated: 2026-02-15*
