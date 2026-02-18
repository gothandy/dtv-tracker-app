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
| **Modified** | Modified | Date and Time | Auto | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | Creation timestamp (read-only) |

### Lookup Fields
- **Group** / **GroupLookupId**: Lookup to Groups list — associates the session with a volunteer group

### Calculated Fields (not stored)
- **Registrations**: Calculated from Entries list (count of entries for this session)
- **Hours**: Calculated from Entries list (sum of entry hours)
- **Financial Year**: Calculated from Date field (April–March rule)

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
| **Notes** | Notes | Single line of text | No | - | Tags: #New #Child #DofE #DigLead #FirstAider #Regular #NoPhoto |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |

### Lookup Fields
- **Session** / **SessionLookupId**: Lookup to Sessions list (indexed for performance)
- **Profile** / **ProfileLookupId**: Lookup to Profiles list

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
| **Email** | Email | Single line of text | No | - | Volunteer email address |
| **MatchName** | MatchName | Single line of text | No | - | Lowercase name for Eventbrite matching |
| **User** | User | Single line of text | No | - | DTV Entra ID username (e.g. andrew.davies@dtv.org.uk) |
| **IsGroup** | IsGroup | Yes/No | No | No | Flag indicating if this is a group profile |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |

### Calculated Fields (not stored)
- **Hours**: Calculated from Entries list per financial year
- **Membership**: Determined from Records list (Charity Membership record with Status "Accepted")

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
| **Modified** | Modified | Date and Time | Auto | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | Creation timestamp (read-only) |

### Lookup Fields
- **Profile** / **ProfileLookupId**: Lookup to Profiles list
- **Group** / **GroupLookupId**: Lookup to Groups list

### Data Model Notes
This is a **many-to-many junction table** that creates the relationship between:
- One Profile can be a Regular of many Groups
- One Group can have many Regular volunteers

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

*Last Updated: 2026-02-16*
