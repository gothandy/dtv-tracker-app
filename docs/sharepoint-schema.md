# SharePoint List Structure Documentation

This document describes the SharePoint list schema for the Tracker site (`/sites/tracker`).

---

## 1. Groups List

**Purpose**: Stores volunteer group information

**Address**: `Lists/Groups` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

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

## 1a. Projects List

**Purpose**: Stores cross-group volunteer projects (funded work, trails, etc.)

**Address**: `Lists/Projects` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

### Columns

| Column Name | Internal Name | Type | Required | Description |
|------------|---------------|------|----------|-------------|
| **ID** | ID | Counter | Auto | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | Yes | Shorthand key (slug, e.g. `bridge`) — used in URLs |
| **Name** | Name | Single line of text | No | Display name |
| **Description** | Description | Multiple lines of text | No | Project description |
| **Metadata** | Metadata | Managed metadata | No | Taxonomy tags (same term set as Sessions) |
| **Status** | Status | Choice | No | The project's status. The tracker reads the choices from the column (`GET /api/projects/options`), so adding a choice here adds it to the filter and the Add/Edit modals |
| *(documents)* | — | — | — | Project files in Documents library: `Projects/{Title}/` (top level, beside `Backups/`) |

---

## 2. Sessions List

**Purpose**: Stores volunteer session information with dates and planning notes

**Address**: `Lists/Sessions` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

### Columns

| Column Name | Internal Name | Type | Required | Description |
|------------|---------------|------|----------|-------------|
| **ID** | ID | Counter | Auto | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | Lookup key (e.g., "2026-02-15 Sat") |
| **Name** | Name | Single line of text | No | Display name for the session |
| **Date** | Date | Date (Date only) | Yes | Session date |
| **Time** | Time | Single line of text | No | Start time HH:MM (24-hour); app defaults to 09:30 when blank |
| **Length** | Length | Number | No | Session duration in hours; app defaults to 3 when blank |
| **Notes** | Notes | Multiple lines of text | No | Planning notes, work done, and actions |
| **Group** | Group | Lookup | No | Links to Groups list (shows Title) |
| **Project** | Project | Lookup | No | Links to Projects list (shows Title) |
| **EventbriteEventID** | EventbriteEventID | Single line of text | No | Eventbrite Event identifier |
| **Limits** | Limits | Single line of text | No | JSON capacity config e.g. `{"new":4,"total":20}` |
| **CoverMedia** | CoverMedia | Number | No | Media library item ID used as session cover photo |
| **Stats** | Stats | Multiple lines of text | No | Pre-computed JSON: `{ "count": N, "hours": N, "media": N, "new": N, "child": N, "regular": N, "cancelledRegular": N, "eventbrite": N }` |
| **Modified** | Modified | Date and Time | Auto | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | Creation timestamp (read-only) |

### Lookup Fields
- **Group** / **GroupLookupId**: Lookup to Groups list — associates the session with a volunteer group
- **Project** / **ProjectLookupId**: Lookup to Projects list — optional cross-group project link (Phase 1: set in SharePoint; app reads only)

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

**Address**: `Lists/Entries` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

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
| **Notes** | Notes | Single line of text | No | - | Free-form field; historic #tags (#Regular, #CSR, #Late, #DigLead, #FirstAider, #NoPhoto, #Eventbrite, #New etc.) from pre-Labels entries — app no longer writes to this field |
| **Stats** | Stats | Multiple lines of text | No | - | **Retired** — legacy snapshot JSON; no longer written by the app; will be deleted from SharePoint after the Labels migration is complete |
| **Labels** | Labels | Multi-select choice | No | - | Operational tags set per-entry: `Regular` \| `CSR` \| `Late` \| `FirstAider` \| `DigLead` |
| **BookedBy** | BookedBy | Single line of text | No | - | Order contact email from Eventbrite (whoever made the booking); historic audit trail |
| **EventbriteAttendeeID** | EventbriteAttendeeID | Single line of text | No | - | Eventbrite attendee ID; presence means this entry originated via Eventbrite and is the source of truth for the Eventbrite icon |
| **AccompanyingAdult** | AccompanyingAdult | Lookup (Profiles) | No | - | For child entries: the adult responsible on the day; derived from same Eventbrite order |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |

### Entry Labels

`Labels` is a SharePoint multi-select choice field. Valid values: `Regular` | `CSR` | `Late` | `FirstAider` | `DigLead`.

- `Regular` — set automatically by session refresh when a regular volunteer's entry is created/confirmed for a future session
- `CSR`, `Late`, `DigLead`, `FirstAider` — set manually via the entry edit modal on the day
- `FirstAider` specifically means "took on the first aider role on the day"; the qualified/available state comes from `profile.stats.isFirstAider`

The `Stats` field and Notes #tags are retained as read-only historic data. The `Stats` field will be deleted from SharePoint once the Labels migration is confirmed complete.

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

**Address**: `Lists/Profiles` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

### Columns

| Column Name | Internal Name | Type | Required | Default | Description |
|------------|---------------|------|----------|---------|-------------|
| **ID** | ID | Counter | Auto | - | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | - | Volunteer name |
| **Email** | Email | Single line of text | No | - | Comma-separated email addresses; first is primary. All used for OAuth login matching and Eventbrite sync |
| **MatchName** | MatchName | Single line of text | No | - | Lowercase name for Eventbrite matching |
| **User** | User | Single line of text | No | - | DTV Entra ID username (e.g. andrew.davies@dtv.org.uk) |
| **IsGroup** | IsGroup | Yes/No | No | No | Flag indicating if this is a group profile |
| **Stats** | Stats | Multiple lines of text | No | - | Pre-computed JSON: `{ "hoursByFY": { "FY2025": N }, "sessionsByFY": { "FY2025": N }, "sessionIds": [N, ...], "isMember": bool, "cardStatus": "Accepted"\|"Invited"\|null, "isFirstAider": bool, "noPhoto": bool }` |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |

### Pre-computed Stats (stored in Stats field)
The `Stats` JSON field caches values derived from the Entries and Records lists so that listing and aggregate views don't need to fetch all entries on every request:
- **hoursByFY**: dictionary of hours per financial year (e.g. `{ "FY2025": 120.0, "FY2026": 45.5 }`)
- **sessionsByFY**: dictionary of session count per financial year
- **sessionIds**: ordered list of session IDs the volunteer has attended; `sessionIds[0]` is their first-ever session (used to derive `isNew`)
- **isMember**: true if the profile has a Charity Membership record with Status "Accepted"
- **cardStatus**: discount card status — "Accepted", "Invited", or null
- **isFirstAider**: true if the profile holds a valid (non-expired) First Aid Certificate record
- **noPhoto**: true if the profile has no Accepted Photo Consent record (always reflects current state — GDPR)

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

**Address**: `Lists/Regulars` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

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

**Purpose**: One row per sign-in, for volunteers (email code) and staff (Microsoft), so sign-ins survive restarts and deploys. Each row matches a `dtv-auth` cookie. Rows expire after `LOGIN_HOURS` (72h, `backend/config.ts`) and are deleted by the nightly job. Sign-out deletes the row. Emergency revocation: delete all items (everyone signs in again); one person: delete their rows.

**Permissions**: restricted to site **Owners** (inheritance stopped). Anyone who could add rows could forge a sign-in. The tracker isn't affected: its access is the site grant.

**Address**: `Lists/Logins` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

### Columns

| Column Name | Internal Name | Type | Required | Description |
|-------------|---------------|------|----------|-------------|
| Title | Title | Single line of text | Yes | SHA-256 hex hash of the raw 128-bit token; built-in, indexed by default |
| Profile | Profile | Lookup (→ Profiles) | Yes | Profile at sign-in, for people reading the list; not used for access |
| Email | Email | Single line of text | No | The address the person proved: the `@dtv.org.uk` account Microsoft confirmed, or the address the code was sent to. **Access is worked out from this**, with the same check as sign-in; rows without it are ignored (sign in again) |
| Method | Method | Choice: `Email Code`, `Microsoft` | No | How the person signed in. Microsoft: the Email must be a profile's `User`, role from `TRACKER_ADMIN_USERS`. Email Code: profiles whose `Email` includes it |
| Agent | Agent | Single line of text | No | Browser user agent at sign-in |
| Created | Created | Date (auto) | — | Sign-in time; used for the 72h expiry query (`Created ge '<since>'`); auto-managed by SharePoint |

### Notes
- `Title` stores only the SHA-256 hash — the raw token is never persisted
- Multiple rows per profile are normal (multiple devices / multiple logins)
- `validateAuthToken` queries: `fields/Title eq '<hash>' and fields/Created ge '<now-minus-TTL>'`
- Expired rows are deleted by the nightly job (`deleteExpiredLogins`); never backed up, never copied to a test site

---

## 6. Records List

**Purpose**: Tracks consents, benefits, and governance items per volunteer profile

**Address**: `Lists/Records` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

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

## 8. Templates List

**Purpose**: Email templates, shown in the tracker as *Email templates*. Admins edit them here in SharePoint; changes show in the tracker within 5 minutes (or straight away after *Clear all server caches* on the Tools page). Each row is Handlebars, wrapped in `templates/email/base.hbs` with the `{{#section}}` and `{{{nl2br}}}` helpers (`backend/services/email-renderer.ts`).

**Address**: `Lists/Templates` (the tracker finds the list by address; `SHAREPOINT_ADDRESSES` in `backend/config.ts`)

### Columns

| Column Name | Internal Name | Type | Required | Description |
|-------------|---------------|------|----------|-------------|
| Title | Title | Single line of text | Yes | The name shown in *Send Email*, e.g. *Pre-Dig* |
| Context | Context | Choice: `Session`, `Profile` | Yes | What the email is about, which decides its variables, recipients and where it's offered. Defined once in `types/email-template.ts` |
| Subject | Subject | Single line of text | Yes | Handlebars, not HTML-escaped |
| HTML | HTML | Multiple lines of text (plain text) | No | Handlebars body; must be plain text, as rich text would rewrite it |
| Text | Text | Multiple lines of text (plain text) | No | Handlebars plain-text version |

### Contexts and their variables

- **Session**: sent from a session's *Send Email* to its entries, one personalised email each. Variables: `buildSessionTemplateVars` in `backend/services/email-vars.ts` (the session's date, time, description and tags, the volunteer's name, Regular and member status, accompanied children, links).
- **Profile**: sent from the Profiles page's *Send Email* to the ticked profiles. Variables: `buildProfileTemplateVars` (name, email, sign-in link, charity membership date).

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
