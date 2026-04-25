# SharePoint List Structure Documentation

This document describes the SharePoint list schema for the Tracker site (`/sites/tracker`).

---

## 1. Groups List

**Purpose**: Stores volunteer group information

**List GUID**: `6e86cef7-a855-41a4-93e8-6e01a80434a2`

### Columns

| Column Name | Internal Name | Type | Required | Description |
|------------|---------------|------|----------|-------------|
| **ID** | ID | Counter | Auto | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | Shorthand identifier (e.g., "Sat") — used as lookup key |
| **Name** | Name | Single line of text | No | Full display name (e.g., "Saturday Dig") — used in UI |
| **Description** | Description | Single line of text | No | Group description |
| **EventbriteSeriesID** | EventbriteSeriesID | Single line of text | No | Eventbrite Series identifier for the group |
| **Modified** | Modified | Date and Time | Auto | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | Creation timestamp (read-only) |

---

## 2. Sessions List

**Purpose**: Stores volunteer session information with dates and planning notes

**List GUID**: `583867bd-e032-4940-89b5-aa2d5158c5d0`

### Columns

| Column Name | Internal Name | Type | Required | Description |
|------------|---------------|------|----------|-------------|
| **ID** | ID | Counter | Auto | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | Lookup key (e.g., "2026-02-15 Sat") |
| **Name** | Name | Single line of text | No | Display name for the session |
| **Date** | Date | Date (Date only) | Yes | Session date |
| **Notes** | Notes | Multiple lines of text | No | Planning notes, work done, and actions |
| **Group** | Group | Lookup | No | Links to Groups list (shows Title) |
| **EventbriteEventID** | EventbriteEventID | Single line of text | No | Eventbrite Event identifier |
| **Stats** | Stats | Multiple lines of text | No | Pre-computed JSON: `{ "count": N, "hours": N, "media": N, "new": N, "child": N, "regular": N, "cancelledRegular": N, "eventbrite": N }` |
| **Modified** | Modified | Date and Time | Auto | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | Creation timestamp (read-only) |

### Lookup Fields
- **Group** / **GroupLookupId**: Lookup to Groups list — associates the session with a volunteer group

### Calculated Fields (not stored)
- **Financial Year**: Calculated from Date field (April–March rule)

### Pre-computed Stats (stored in Stats field)
The `Stats` JSON field caches values derived from the Entries list and SharePoint Media Library so that listing and aggregate views don't need to fetch all entries on every request:
- **count**: number of entries (registrations) for this session
- **hours**: sum of entry hours for this session
- **media**: count of uploaded photos/videos in the SharePoint Media Library folder for this session
- **new**: count of entries tagged `#New`
- **child**: count of entries tagged `#Child`
- **regular**: count of active (non-cancelled) entries tagged `#Regular`
- **cancelledRegular**: count of cancelled entries tagged `#Regular` — used to derive effective regular capacity (regularsCount - cancelledRegular)
- **eventbrite**: count of entries created via Eventbrite sync

Stats are written by:
- `POST /api/sessions/refresh-stats` (bulk nightly refresh, also manually triggered from admin page)
- `computeAndSaveSessionStats()` helper (targeted update after each entry write/delete or media upload)

Fall back to zeros if the field is empty (e.g. before first refresh run).

---

## 3. Entries List

**Purpose**: Junction table linking volunteers to sessions — tracks registrations, check-ins, and hours per volunteer per session

**List GUID**: `7146b950-94e3-4c94-a0d7-310cf2fbd325`

### Columns

| Column Name | Internal Name | Type | Required | Default | Description |
|------------|---------------|------|----------|---------|-------------|
| **ID** | ID | Counter | Auto | - | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | - | Entry title |
| **Session** | Session | Lookup (indexed) | No | - | Links to Sessions list (shows Title) |
| **Profile** | Profile | Lookup | No | - | Links to Profiles list (shows Title) |
| **Count** | Count | Number | No | 1 | For group registrations |
| **Checked** | Checked | Yes/No | No | No | Check-in status for the volunteer |
| **Hours** | Hours | Number | No | - | Hours worked at this session |
| **Notes** | Notes | Single line of text | No | - | Manual operational tags: #Child (also sets AccompanyingAdult), #CSR, #Late, #DigLead (role taken), #FirstAider (role taken); legacy tags (#Eventbrite, #New, #Regular, #NoPhoto etc.) remain on pre-migration entries |
| **Stats** | Stats | Multiple lines of text | No | - | Snapshot JSON (`EntryStats`); frozen once session date passes and field is non-empty — see schema below |
| **BookedBy** | BookedBy | Single line of text | No | - | Order contact email from Eventbrite (whoever made the booking); historic audit trail |
| **EventbriteAttendeeID** | EventbriteAttendeeID | Single line of text | No | - | Eventbrite attendee ID; presence means this entry originated via Eventbrite and is the source of truth for the Eventbrite icon |
| **AccompanyingAdult** | AccompanyingAdult | Lookup (Profiles) | No | - | For child entries: the adult responsible on the day; derived from same Eventbrite order |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |

### Pre-computed Stats (stored in Stats field)

The `Stats` JSON field is a snapshot of the entry's computed state at the time of the last stats refresh. It is frozen (never recomputed) once the session date has passed and the field is already populated — preserving a record of the volunteer's status at the time of that session.

```json
{
  "booking": "New | Regular | Repeat",
  "isGroup": false,
  "isChild": false,
  "isMember": false,
  "hasDiscountCard": false,
  "isDuplicate": false,
  "noPhoto": false,
  "noConsent": false,
  "isDigLead": false,
  "isFirstAider": false
}
```

| Field | Meaning |
|-------|---------|
| `booking` | `"New"` = first session ever; `"Regular"` = on the regulars list for this group; `"Repeat"` = attended before but not a regular |
| `isGroup` | Profile is a group account (not an individual) |
| `isChild` | Child entry (AccompanyingAdult is set, or #Child in Notes) |
| `isMember` | Has an Accepted Charity Membership record at the time of the session |
| `hasDiscountCard` | Has an Accepted or Invited Discount Card record |
| `isDuplicate` | Profile shares an email with another profile (`linkedProfileIds` non-empty) |
| `noPhoto` | No Accepted Photo Consent record |
| `noConsent` | No Accepted Privacy Consent record |
| `isDigLead` | Qualified/available for dig lead role |
| `isFirstAider` | Holds a valid (non-expired) first aid certificate |

**Freeze rule**: stats are recomputed freely while `session.Date >= today`. Once `session.Date < today` AND the field is non-empty, the field is frozen and no further updates are written. Pre-migration entries (Stats field empty) fall back to Notes hashtag parsing everywhere.

### Lookup Fields
- **Session** / **SessionLookupId**: Lookup to Sessions list (indexed for performance)
- **Profile** / **ProfileLookupId**: Lookup to Profiles list (indexed for performance)

### Indexes
- **SessionLookupId** — enables `getBySessionIds()` targeted query (session detail page)
- **ProfileLookupId** — enables `getByProfileId()` targeted query (profile detail, targeted stats updates)
- **Created** — enables `getRecent()` targeted query (recent signups homepage widget)
- **Modified** — added alongside Created (auto-added by SharePoint)

### Data Model Notes
This is a **many-to-many junction table** that creates the relationship between:
- One Session can have many Entries (many volunteers)
- One Profile can have many Entries (attend many sessions)

---

## 4. Profiles List

**Purpose**: Stores volunteer profile information including contact details

**List GUID**: `84649143-9e10-42eb-b6ee-2e1f57033073`

### Columns

| Column Name | Internal Name | Type | Required | Default | Description |
|------------|---------------|------|----------|---------|-------------|
| **ID** | ID | Counter | Auto | - | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | - | Volunteer name |
| **Email** | Email | Single line of text | No | - | Comma-separated email addresses; first is primary. All used for OAuth login matching and Eventbrite sync |
| **MatchName** | MatchName | Single line of text | No | - | Lowercase name for Eventbrite matching |
| **User** | User | Single line of text | No | - | DTV Entra ID username (e.g. andrew.davies@dtv.org.uk) |
| **IsGroup** | IsGroup | Yes/No | No | No | Flag indicating if this is a group profile |
| **Stats** | Stats | Multiple lines of text | No | - | Pre-computed JSON: `{ "hoursByFY": { "FY2025": N }, "sessionsByFY": { "FY2025": N }, "isMember": bool, "cardStatus": "Accepted"\|"Invited"\|null }` |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |

### Pre-computed Stats (stored in Stats field)
The `Stats` JSON field caches values derived from the Entries and Records lists so that listing and aggregate views don't need to fetch all entries on every request:
- **hoursByFY**: dictionary of hours per financial year (e.g. `{ "FY2025": 120.0, "FY2026": 45.5 }`)
- **sessionsByFY**: dictionary of session count per financial year
- **isMember**: true if the profile has a Charity Membership record with Status "Accepted"
- **cardStatus**: discount card status — "Accepted", "Invited", or null

`thisFY` and `lastFY` totals are derived at request time from the dictionaries using `calculateCurrentFY()`. This avoids stale data at financial year boundaries.

Stats are written by:
- `POST /api/profiles/refresh-stats` (bulk nightly refresh, also manually triggered from admin page)
- `computeAndSaveProfileStats()` helper (targeted update after each entry write/delete or record write)

Fall back to zeros/false if the field is empty (e.g. before first refresh run).

### Integration Points
- **Eventbrite**: Uses MatchName field (lowercase name) to sync with external Eventbrite registrations

---

## 5. Regulars List

**Purpose**: Tracks which volunteers are regular members of specific groups

**List GUID**: `925c96fd-9b3a-4f55-b179-ed51fc279d39`

### Columns

| Column Name | Internal Name | Type | Required | Description |
|------------|---------------|------|----------|-------------|
| **ID** | ID | Counter | Auto | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | Regular membership title |
| **Profile** | Profile | Lookup | No | Links to Profiles list (shows Title) |
| **Group** | Group | Lookup | No | Links to Groups list (shows Title) |
| **AccompanyingAdult** | AccompanyingAdult | Lookup | No | For child regulars: the adult responsible on the day; copied to entry when regulars are added to a session |
| **Modified** | Modified | Date and Time | Auto | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | Creation timestamp (read-only) |

### Lookup Fields
- **Profile** / **ProfileLookupId**: Lookup to Profiles list
- **Group** / **GroupLookupId**: Lookup to Groups list
- **AccompanyingAdult** / **AccompanyingAdultLookupId**: Lookup to Profiles list

### Data Model Notes
This is a **many-to-many junction table** that creates the relationship between:
- One Profile can be a Regular of many Groups
- One Group can have many Regular volunteers

---

## 7. Logins List

**Purpose**: Persistent auth token store for magic link sessions. Each row represents a valid `dtv-auth` cookie issued to a volunteer. Tokens expire after `AUTH_BASIC_TTL_HOURS` (default 72h). Emergency revocation: delete all items.

**List GUID**: `e3b5c7fb-313a-44b4-9363-a4e4d2b65a57`

### Columns

| Column Name | Internal Name | Type | Required | Description |
|-------------|---------------|------|----------|-------------|
| Title | Title | Single line of text | Yes | SHA-256 hex hash of the raw 128-bit token; built-in, indexed by default |
| Profile | Profile | Lookup (→ Profiles) | Yes | Profile the token was issued for |
| Created | Created | Date (auto) | — | Token issue date; used for 72h TTL query (`Created ge '<since>'`); auto-managed by SharePoint |

### Notes
- `Title` stores only the SHA-256 hash — the raw token is never persisted
- Multiple rows per profile are normal (multiple devices / multiple logins)
- `validateAuthToken` queries: `fields/Title eq '<hash>' and fields/Created ge '<now-minus-TTL>'`
- Rows are not automatically pruned; clear the list for emergency revocation

---

## 6. Records List

**Purpose**: Tracks consents, benefits, and governance items per volunteer profile

**List GUID**: `2666a819-1275-4fce-83a3-5bb67b4da83a`

### Columns

| Column Name | Internal Name | Type | Required | Description |
|------------|---------------|------|----------|-------------|
| **ID** | ID | Counter | Auto | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | Auto-generated or unused |
| **Profile** | Profile | Lookup | No | Links to Profiles list (shows Title) |
| **Type** | Type | Choice | No | Record type (see choices below) |
| **Status** | Status | Choice | No | Record status (see choices below) |
| **Date** | Date | Date (Date only) | No | Date of the record |
| **Modified** | Modified | Date and Time | Auto | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | Creation timestamp (read-only) |

### Choice Values

**Type**: Privacy Consent, Photo Consent, Newsletter Consent, Charity Membership, Discount Card

**Status**: Accepted, Declined, Invited, Expired

### Lookup Fields
- **Profile** / **ProfileLookupId**: Lookup to Profiles list

### Data Model Notes
One profile can have multiple records of different types. Consent records (Privacy, Photo) are upserted during Eventbrite attendee sync — one per profile+type, latest answer wins.

A volunteer becomes a **member** when they have a "Charity Membership" record with Status "Accepted".

---

## Data Model Overview

### Entity Relationship Diagram

```
┌─────────────┐
│   Groups    │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────┐           ┌──────────────┐
│    Sessions     │           │   Regulars   │
└──────┬──────────┘           └──┬───────┬───┘
       │                         │       │
       │ 1:N                     │       │
       │                         │       │
┌──────▼──────────┐              │       │
│     Entries     │              │       │
└──────┬──────────┘              │       │
       │                         │       │
       │ N:1                N:1  │       │ N:1
       │                         │       │
       └──────────────┬──────────┘       │
                      │                  │
               ┌──────▼──────┐           │
               │   Profiles  │───────────┘
               └──────┬──────┘
                      │ 1:N
               ┌──────▼──────┐
               │   Records   │
               └─────────────┘
```

### Key Relationships

1. **Groups → Sessions**: One group can have many sessions
2. **Sessions → Entries**: One session can have many entries
3. **Profiles → Entries**: One volunteer can have many entries
4. **Profiles → Regulars**: One volunteer can be regular for many groups
5. **Groups → Regulars**: One group can have many regular volunteers
6. **Profiles → Records**: One volunteer can have many consent/governance records

---

## Notes

### Lookup Field Conventions
- Graph API returns both display values and lookup IDs (e.g., `Group` and `GroupLookupId`). Use lookup IDs for joins and filtering.
- Field name constants are defined in `services/field-names.ts` — use these instead of hardcoded strings.

### Calculated Fields
- The app calculates all derived values (hours, registrations, financial year, membership) from source entries at query time.
- No Power Automate flows update fields. The app is the sole source of truth for derived data.
- Server-side caching (5-minute TTL) keeps this performant despite recalculating on each request.

### Pagination
- Microsoft Graph API returns a maximum of 999 items per request. Always follow `@odata.nextLink` to retrieve all items from large lists.

### Single Line of Text Fields
- 255 character max length.

---

*Last Updated: 2026-03-29*
