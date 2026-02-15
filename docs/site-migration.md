# SharePoint Site Migration: Members → Tracker

## Overview

Migrate from the existing `members` SharePoint site to a new standalone `tracker` site. This runs in parallel with the existing site while we develop the Eventbrite sync replacement, then cut over once everything is working.

## Why Migrate?

- **Clean slate for column names** — fix all the naming inconsistencies documented in [sharepoint-refactoring.md](sharepoint-refactoring.md) (Crew→Group, Event→Session, etc.)
- **Separate concerns** — the tracker app gets its own site rather than living inside the members site
- **Parallel development** — existing Power Automate flows keep running against the old site while we build the Node.js sync against the new one
- **Second deployment target** — a separate app instance pointing at the new Tracker site

## Column Naming Cleanup

The new site is an opportunity to fix internal names to match what the app actually calls things:

### Groups List
| Old Internal Name | New Internal Name | Notes |
|-------------------|-------------------|-------|
| `Title` | `Title` | Keep — used as shorthand/key |
| `Name` | `Name` | Keep — full display name |
| `EventbriteSeriesID` | `EventbriteSeriesID` | Keep |

### Sessions List
| Old Internal Name | New Internal Name | Notes |
|-------------------|-------------------|-------|
| `Crew` / `CrewLookupId` | `Group` / `GroupLookupId` | Rename to match UI terminology |
| `Description` | `Notes` | Align with UI label |
| `Registrations` | `Registrations` | Keep |
| `FinancialYearFlow` | Drop | App calculates from Date — no longer needed |
| `EventbriteEventID` | `EventbriteEventID` | Keep |
| `Url` | `Url` | Keep |

### Entries List
| Old Internal Name | New Internal Name | Notes |
|-------------------|-------------------|-------|
| `Event` / `EventLookupId` | `Session` / `SessionLookupId` | Rename to match domain |
| `Volunteer` / `VolunteerLookupId` | `Profile` / `ProfileLookupId` | Rename to match domain |
| `Checked` | `Checked` | Keep |
| `FinancialYearFlow` | Drop | Was already stale |

### Profiles List
| Old Internal Name | New Internal Name | Notes |
|-------------------|-------------------|-------|
| `HoursLastFY` | Drop | App calculates from entries |
| `HoursThisFY` | Drop | App calculates from entries |
| `MatchName` | `MatchName` | Keep |
| `IsGroup` | `IsGroup` | Keep |
| ~~`DataConsent`~~ | — | Moved to Records list (see below) |
| ~~`PhotoConsent`~~ | — | Moved to Records list (see below) |

### Regulars List
| Old Internal Name | New Internal Name | Notes |
|-------------------|-------------------|-------|
| `Volunteer` / `VolunteerLookupId` | `Profile` / `ProfileLookupId` | Rename to match domain |
| `Crew` / `CrewLookupId` | `Group` / `GroupLookupId` | Rename to match domain |
| Denormalized fields (email, hours) | Drop | App doesn't use them |

## Environment Configuration

The new site means more config moves to `.env`. Each deployment points at a different site:

```env
# Current (Members site)
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/members

# New (Tracker site)
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/tracker
```

List GUIDs will be different on the new site since they're auto-generated on list creation. The app already reads these from `.env` so no code changes needed — just different values per deployment.

If column internal names change, the repositories need updating. Only 4 field names actually change:

| Old | New | Used in |
|-----|-----|---------|
| `CrewLookupId` | `GroupLookupId` | Sessions, Regulars |
| `EventLookupId` | `SessionLookupId` | Entries |
| `VolunteerLookupId` | `ProfileLookupId` | Entries, Regulars |
| `Description` | `Notes` | Sessions |

### Approach: Detect from site URL, constants in code

No new env vars — derive legacy mode from the existing `SHAREPOINT_SITE_URL`:

```typescript
// services/field-names.ts
const legacy = process.env.SHAREPOINT_SITE_URL?.endsWith('/members') ?? true;

export const SP = {
  groupLookup:   legacy ? 'CrewLookupId'      : 'GroupLookupId',
  sessionLookup: legacy ? 'EventLookupId'     : 'SessionLookupId',
  profileLookup: legacy ? 'VolunteerLookupId' : 'ProfileLookupId',
  sessionNotes:  legacy ? 'Description'       : 'Notes',
};
```

Repositories use `SP.groupLookup` instead of hardcoded strings. Single codebase, single branch. When you point `.env` at the new Tracker site, field names switch automatically. Once the old site is retired, delete the ternaries and keep the clean names.

## Migration Steps

1. **Create new SharePoint site** manually in SharePoint admin (`/sites/tracker`)
2. **Run list creation scripts** to build all 6 lists with clean column names
3. **Paste generated GUIDs** into `.env.tracker`
4. **Run data migration scripts** to copy data from Members → Tracker
5. **Start Tracker instance** (`npm run dev:tracker`) and validate
6. **Build Eventbrite sync** in Node.js against new site
7. **Cut over** — retire old site and Power Automate flows

## Scripts

All migration scripts live in `scripts/migration/` and use the Graph API via axios (not the app's SharePoint client, so they can target either site independently).

Each script is standalone and can be run individually. They read credentials from `.env.tracker` (via dotenv).

### List Creation Scripts

Create the 6 lists on the Tracker site with clean column names. **Order matters** because lookup columns require the target list to exist first.

```
scripts/migration/
├── create-lists.js            # Orchestrator — runs all 6 in order
├── create-groups-list.js      # Step 1: Groups (no dependencies)
├── create-profiles-list.js    # Step 2: Profiles (no dependencies)
├── create-sessions-list.js    # Step 3: Sessions (lookup → Groups)
├── create-entries-list.js     # Step 4: Entries (lookup → Sessions, Profiles)
├── create-regulars-list.js    # Step 5: Regulars (lookup → Groups, Profiles)
└── create-records-list.js     # Step 6: Records (lookup → Profiles, choice Type)
```

**Run all at once:**
```bash
node scripts/migration/create-lists.js
```

**Or run individually:**
```bash
node scripts/migration/create-groups-list.js
node scripts/migration/create-profiles-list.js
# etc.
```

Each script:
1. Authenticates using `.env.tracker` credentials
2. Creates the list via `POST /sites/{site-id}/lists`
3. Adds custom columns via `POST /sites/{site-id}/lists/{list-id}/columns`
4. Prints the generated list GUID for pasting into `.env.tracker`

**Re-running**: If something goes wrong or you want to change the schema, delete the lists in SharePoint admin (or delete the whole site and recreate it), then run the scripts again and paste the new GUIDs. There's no state to preserve on a fresh site.

#### Column Definitions by List

**Groups** — no lookups, created first:
| Column | Type | Notes |
|--------|------|-------|
| Title | text | Built-in, shorthand key |
| Name | text | Display name |
| Description | text | |
| EventbriteSeriesID | text | |

**Profiles** — no lookups, created first:
| Column | Type | Notes |
|--------|------|-------|
| Title | text | Built-in, volunteer name |
| Email | text | |
| MatchName | text | Eventbrite matching |
| IsGroup | boolean | |

**Sessions** — lookup to Groups:
| Column | Type | Notes |
|--------|------|-------|
| Title | text | Built-in |
| Name | text | Display name |
| Date | dateTime | Required, date only |
| Group | lookup → Groups | Clean name (was "Crew") |
| Notes | text (multiline) | Clean name (was "Description") |
| Registrations | number | |
| Hours | number | |
| EventbriteEventID | text | |
| Url | hyperlinkOrPicture | |

**Entries** — lookups to Sessions and Profiles:
| Column | Type | Notes |
|--------|------|-------|
| Title | text | Built-in |
| Session | lookup → Sessions | Clean name (was "Event"), indexed |
| Profile | lookup → Profiles | Clean name (was "Volunteer") |
| Count | number | Default: 1 |
| Checked | boolean | |
| Hours | number | |
| Notes | text | Hashtags |

**Regulars** — lookups to Groups and Profiles:
| Column | Type | Notes |
|--------|------|-------|
| Title | text | Built-in |
| Group | lookup → Groups | Clean name (was "Crew") |
| Profile | lookup → Profiles | Clean name (was "Volunteer") |

**Records** — lookup to Profiles, choice Type:
| Column | Type | Notes |
|--------|------|-------|
| Title | text | Built-in |
| Profile | lookup → Profiles | Who |
| Type | choice | Privacy Consent, Photo Consent (extensible via Graph API) |
| Date | dateTime | When (from Eventbrite order timestamp) |

#### Graph API Column Creation

Columns are created via `POST /sites/{site-id}/lists/{list-id}/columns`:

```json
// Text column
{ "name": "Name", "text": {} }

// Number column
{ "name": "Hours", "number": {} }

// Boolean column
{ "name": "IsGroup", "boolean": {} }

// Date column (date only, no time)
{ "name": "Date", "dateTime": { "format": "dateOnly" } }

// Lookup column (requires target list ID)
{ "name": "Group", "lookup": { "listId": "<groups-list-guid>", "columnName": "Title" } }

// Multiline text
{ "name": "Notes", "text": { "allowMultipleLines": true } }

// Hyperlink
{ "name": "Url", "hyperlinkOrPicture": { "isPicture": false } }
```

### Data Migration Scripts

Copy data from the Members site to the Tracker site. Same modular pattern — one script per list, plus an orchestrator.

```
scripts/migration/
├── migrate-data.js          # Orchestrator — runs all 5 in order
├── migrate-groups.js        # Step 1: Groups
├── migrate-profiles.js      # Step 2: Profiles
├── migrate-sessions.js      # Step 3: Sessions (needs Groups ID map)
├── migrate-entries.js       # Step 4: Entries (needs Sessions + Profiles ID maps)
└── migrate-regulars.js      # Step 5: Regulars (needs Groups + Profiles ID maps)
```

**Run all at once:**
```bash
node scripts/migration/migrate-data.js
```

**Or run individually:**
```bash
node scripts/migration/migrate-groups.js
node scripts/migration/migrate-profiles.js
# etc.
```

#### Migration Logic

Each migration script:
1. Reads all items from the source list (Members site, using `.env.members` credentials)
2. Maps fields from old names to new names (e.g., `Description` → `Notes`)
3. Creates items on the target list (Tracker site, using `.env.tracker` credentials)
4. Builds an **ID map** (old ID → new ID) and saves it to `scripts/migration/id-maps/`
5. Drops fields that are no longer needed (`FinancialYearFlow`, `HoursLastFY`, etc.)

**Re-running**: Migration scripts are append-only — they don't check for existing data. To re-run, delete and recreate the lists first (run the create scripts again), then re-run migration. This keeps the scripts simple and means you can always start clean.

#### ID Mapping

SharePoint auto-generates new IDs on the Tracker site, so lookup references need remapping. The migration scripts save JSON maps:

```
scripts/migration/id-maps/
├── groups.json      # { "33": 1, "34": 2, ... }  (old ID → new ID)
├── profiles.json
└── sessions.json
```

Lists with lookups read these maps to translate references:
- **Sessions**: `CrewLookupId` → look up old group ID in `groups.json` → write new group ID as `GroupLookupId`
- **Entries**: `EventLookupId` → `sessions.json`, `VolunteerLookupId` → `profiles.json`
- **Regulars**: `CrewLookupId` → `groups.json`, `VolunteerLookupId` → `profiles.json`

#### Field Mapping per List

**Groups**: Direct copy — Title, Name, Description, EventbriteSeriesID

**Profiles**: Copy Title, Email, MatchName, IsGroup. Drop HoursLastFY/HoursThisFY.

**Sessions**: Copy Title, Name, Date, Registrations, Hours, EventbriteEventID, Url. Remap `CrewLookupId` → `GroupLookupId` via groups ID map. Rename `Description` → `Notes`. Drop `FinancialYearFlow`.

**Entries**: Copy Title, Count, Checked, Hours, Notes. Remap `EventLookupId` → `SessionLookupId` via sessions ID map. Remap `VolunteerLookupId` → `ProfileLookupId` via profiles ID map. Drop `FinancialYearFlow`.

**Regulars**: Copy Title. Remap `CrewLookupId` → `GroupLookupId` via groups ID map. Remap `VolunteerLookupId` → `ProfileLookupId` via profiles ID map.

**Records**: New list — no migrated data. Backfilled from historic Eventbrite events via one-off import script.

## Parallel Running

During migration, two instances run side by side:

| | Old (Members) | New (Tracker) |
|---|---|---|
| **Site** | `/sites/members` | `/sites/tracker` |
| **Port** | 3000 | 3001 |
| **Sync** | Power Automate flows | Node.js eventbrite-service |
| **Field names** | Legacy (Crew, Event, Volunteer) | Clean (Group, Session, Profile) |
| **Records** | Not present | Consent tracking (Privacy, Photo) from Eventbrite |
| **Calculated fields** | Some stale PA-maintained fields | All calculated from entries |

---

*Created: 2026-02-15*
