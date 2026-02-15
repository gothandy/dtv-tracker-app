# DTV Tracker App - Project Context

## Project Overview

This is a volunteer hours tracking and registration system for managing volunteer crews, events/sessions, and volunteer profiles. The application integrates with SharePoint for data storage and Eventbrite for event management.

## Tech Stack

- **Backend**: Node.js with Express 5, TypeScript for services/types
- **Frontend**: Vanilla HTML/CSS/JavaScript (mobile-first, served statically)
- **Data Storage**: SharePoint Online lists via Microsoft Graph API
- **External Integration**: Eventbrite API
- **Server**: Express server running on http://localhost:3000

## Current State

**Last Updated**: 2026-02-14

Feature-complete volunteer tracking application with:
- Express server entry point ([app.js](app.js)) loading compiled TypeScript routes
- Microsoft Entra ID authentication with session management ([routes/auth.ts](routes/auth.ts))
- TypeScript API routes with clean domain naming ([routes/api.ts](routes/api.ts)) — 25 endpoints
- API response types defining the HTTP contract ([types/api-responses.ts](types/api-responses.ts))
- TypeScript service layer with Graph API client ([services/sharepoint-client.ts](services/sharepoint-client.ts))
- Data layer handling SharePoint quirks, enrichment, and FY stats ([services/data-layer.ts](services/data-layer.ts))
- Repository pattern for each SharePoint list ([services/repositories/](services/repositories/))
- Auth middleware protecting all API and page routes ([middleware/require-auth.ts](middleware/require-auth.ts))
- Server-side caching with 5-minute TTL
- Comprehensive SharePoint schema documentation ([docs/sharepoint-schema.md](docs/sharepoint-schema.md))

### Pages
- Dashboard with FY stats, progress bar, next session card ([public/index.html](public/index.html))
- Groups listing with FY filter ([public/groups.html](public/groups.html))
- Group detail with stats, regulars, sessions, edit/create modals ([public/group-detail.html](public/group-detail.html))
- Sessions listing with FY filtering ([public/sessions.html](public/sessions.html))
- Session detail with entries, check-in, set hours, add regulars ([public/session-detail.html](public/session-detail.html))
- Volunteers listing with FY filter, sort, group filter, search ([public/volunteers.html](public/volunteers.html))
- Profile detail with FY stats, group hours, entries, regulars ([public/profile-detail.html](public/profile-detail.html))
- Entry edit page with tag buttons, auto-fields, delete ([public/entry-detail.html](public/entry-detail.html))
- Add entry page with volunteer search and create ([public/add-entry.html](public/add-entry.html))
- Shared utilities: header, footer, breadcrumbs, date formatting ([public/js/common.js](public/js/common.js))

## Data Model

The application uses 5 SharePoint lists as the backend data store:

### 1. Groups (Crews) List
**GUID**: `68f9eb4a-1eea-4c1f-88e5-9211cf56e002`
- Stores volunteer group/crew information
- Key fields: Name, Description, EventbriteSeriesID

### 2. Sessions (Events) List
**GUID**: `857fc298-6eba-49ab-99bf-9712ef6b8448`
- Stores volunteer event/session information
- Key fields: Title, Date (required), Crew (lookup to Groups), Registrations count, Hours, EventbriteEventID
- Links to Groups via Crew lookup field

### 3. Entries List
**GUID**: `8a362810-15ea-4210-9ad0-a98196747866`
- Junction table linking volunteers to sessions
- Key fields: Event (indexed lookup to Sessions), Volunteer (lookup to Profiles), Checked (check-in status), Hours, Count
- Tracks registrations, check-ins, and individual hours per volunteer per session
- Notes field supports hashtags: #New #Child #DofE #DigLead #FirstAider #Regular
- **Naming**: "Entry" is the preferred term in the UI. An entry starts as a registration (before the session) and becomes an attendance record (after check-in). Avoid "registration" or "attendee" as labels since the same record serves both purposes.

### 4. Profiles (Volunteers) List
**GUID**: `f3d3c40c-35cb-4167-8c83-c566edef6f29`
- Stores volunteer profile information
- Key fields: Title (name), Email, MatchName (for Eventbrite matching), IsGroup, HoursLastFY, HoursThisFY

### 5. Regulars List
**GUID**: `34b535f1-34ec-4fe6-a887-3b8523e492e1`
- Junction table linking volunteers to crews they regularly attend
- Links Volunteer (Profiles) to Crew (Groups)
- Includes denormalized fields for quick access to email and hours

## Entity Relationships

```
Groups (Crews) 1:N Sessions (Events)
Sessions 1:N Entries (Registrations) N:1 Profiles (Volunteers)
Groups N:N Regulars N:N Profiles
```

## Membership Rules

A volunteer becomes a **member** by completing 15 or more hours in a financial year. Groups cannot be members.

- **Last FY membership carries forward**: Anyone who completed >=15h in the previous FY is a member for the whole of the current FY.
- **Current FY achievement**: Anyone who reaches >=15h in the current FY becomes a member at that point.
- **Overall member status**: A volunteer is a member if `hoursLastFY >= 15` OR `hoursThisFY >= 15`.

### Member badge and highlighting
- **MEMBER badge**: Always shows based on overall member status (either FY), regardless of filter. A member is a member.
- **Card highlighting** (green background on volunteers list): Changes with the FY filter — only highlights if the volunteer meets 15h in the selected FY.
- This separation makes at-risk members easy to spot: when filtering "This FY", a volunteer with a MEMBER badge but no green highlight hasn't yet reached 15h this year and may lose membership next FY.

The threshold constant is `MEMBER_HOURS = 15` in `volunteers.html`. Profile and entry detail pages use the literal `15`.

## Key Workflows

1. **Create Groups**: Set up volunteer crews/groups
2. **Schedule Sessions**: Create events/sessions for each group with dates
3. **Volunteer Registration**: Create Entries linking volunteers (Profiles) to Sessions
4. **Check-in**: Mark Entries as Checked when volunteers show up
5. **Hours Tracking**: Record hours at session level and individual entry level
6. **Regular Tracking**: Assign core volunteers as Regulars for specific crews

## External Integrations

### Eventbrite
- Groups have `EventbriteSeriesID` for linking to Eventbrite series
- Sessions have `EventbriteEventID` and `Url` for linking to specific events
- Profiles use `MatchName` field (lowercase name) to sync with Eventbrite registrations
- Currently synced via Power Automate flows — see [docs/power-automate-flows.md](docs/power-automate-flows.md)
- Migration to Node.js `eventbrite-service.ts` is planned

### SharePoint
- All data stored in SharePoint Online lists
- Access via Microsoft Graph API
- Lists have specific GUIDs for API access

## Development Guidelines

### Comments and Documentation Philosophy
- **Readable code over comments**: Use clear naming conventions so the code explains itself
- **Comments explain why, not what**: Use comments for things developers need to know that aren't obvious from the code (SharePoint quirks, business rules, workarounds)
- **Comments as a tech debt flag**: If you need a comment to explain what code does, consider whether the code itself could be clearer
- **Keep readme/docs updated on commits**: Documentation should reflect the current state of the project

### Code Style
- TypeScript for services, types, and routes; CommonJS for entry point (`app.js`)
- Lowercase-hyphen naming for files (e.g., `data-layer.ts`, `test-auth.js`)
- Keep code simple and maintainable
- Follow existing patterns in the codebase

### Documentation
- Keep [readme.md](readme.md) updated with setup instructions when dependencies or configuration change
- Update [docs/progress.md](docs/progress.md) at the end of each development session
- Update [docs/sharepoint-schema.md](docs/sharepoint-schema.md) if SharePoint lists or fields change

### Calculated Fields Over Stored Fields
- **Always calculate derived values** (hours totals, membership status, counts) from source entries at query time rather than reading denormalized SharePoint columns.
- SharePoint lists contain legacy fields (e.g. `HoursLastFY`, `HoursThisFY` on Profiles) that were maintained by Power Automate flows. These are stale and unreliable — do not use them.
- The goal is to retire all Power Automate flows that auto-update fields. The app should be the source of truth for all derived data.
- Cached data (5-minute TTL) keeps this performant despite recalculating on each request.

### SharePoint Integration
- Use the documented GUIDs and internal field names from [docs/sharepoint-schema.md](docs/sharepoint-schema.md)
- Remember SharePoint internal names are different from display names (e.g., "Crew" vs "Group")
- Indexed fields: `Event` in Entries list for performance

### Data Validation
- Sessions require a Date field
- Entries default Count to 1
- Entries default Checked to false

### Security Considerations
- Validate all user input before SharePoint API calls
- Prevent XSS when displaying user-generated content
- Use parameterized queries for SharePoint REST API
- Don't commit secrets or SharePoint credentials to git

## File Structure

```
dtv-tracker-app/
├── app.js                          # Express server entry point (CommonJS)
├── package.json
├── tsconfig.json                   # TypeScript configuration
├── CLAUDE.md                       # This file - project context for Claude
├── docs/
│   ├── progress.md                # Development session notes
│   ├── sharepoint-schema.md       # SharePoint list schemas and field names
│   ├── sharepoint-setup.md        # One-time SharePoint/Entra ID setup (admin)
│   ├── technical-debt.md          # Performance and optimization tracking
│   ├── sharepoint-refactoring.md  # Legacy field cleanup tracking
│   ├── power-automate-flows.md    # Eventbrite sync flow documentation
│   ├── site-migration.md          # SharePoint Members → Tracker migration plan
│   └── requirements.md            # Mobile & field usage requirements
├── types/
│   ├── api-responses.ts           # API response types (HTTP contract)
│   ├── group.ts                   # Group entity types (SharePoint + domain)
│   ├── session.ts                 # Session entity types
│   ├── sharepoint.ts              # Profile, Entry, Regular types + utilities
│   └── express-session.d.ts       # Session type augmentation for auth
├── services/
│   ├── auth-config.ts             # MSAL client configuration
│   ├── sharepoint-client.ts       # Graph API client (auth, caching, pagination)
│   ├── data-layer.ts              # Data conversion, enrichment, validation
│   └── repositories/
│       ├── groups-repository.ts
│       ├── sessions-repository.ts
│       ├── profiles-repository.ts
│       ├── entries-repository.ts
│       └── regulars-repository.ts
├── routes/
│   ├── api.ts                     # Express API route handlers (25 endpoints)
│   └── auth.ts                    # Authentication routes (login, callback, logout)
├── middleware/
│   └── require-auth.ts            # Auth guard middleware
├── public/
│   ├── index.html                 # Dashboard homepage
│   ├── groups.html                # Groups listing with FY filter
│   ├── group-detail.html          # Group detail with stats and regulars
│   ├── sessions.html              # Sessions listing with FY filter
│   ├── session-detail.html        # Session detail with entries and check-in
│   ├── volunteers.html            # Volunteers listing with filters and search
│   ├── profile-detail.html        # Profile detail with FY stats and entries
│   ├── entry-detail.html          # Entry edit page with tag buttons
│   ├── add-entry.html             # Add entry (register volunteer to session)
│   ├── css/
│   │   └── styles.css             # Global stylesheet
│   └── js/
│       └── common.js              # Shared header, footer, utilities
└── test/
    ├── test-auth.js               # Authentication verification
    └── test-*.js                  # Various data/integration tests
```

## Implemented Features

- [x] View all volunteer crews/groups
- [x] View upcoming sessions/events
- [x] Create and edit groups, sessions, profiles
- [x] Volunteer registration for sessions (add entry)
- [x] Bulk add regulars to a session
- [x] Check-in volunteers at events (checkbox per entry)
- [x] Record volunteer hours (per-entry and bulk set hours)
- [x] View volunteer profiles and hours history
- [x] FY filtering on all list pages (This FY / Last FY / All)
- [x] Group-filtered volunteer listing
- [x] Regulars management (add/remove per group)
- [x] Member status tracking (15h threshold with badge + highlight)
- [x] CSV export of sessions
- [x] Microsoft authentication (Entra ID OAuth)
- [x] Mobile-first responsive design (44px touch targets)

## Planned Features

- [ ] Eventbrite sync migration from Power Automate to Node.js ([docs/power-automate-flows.md](docs/power-automate-flows.md))
- [ ] Report generation (custom date ranges, exportable)

## Running the Application

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript
npm run dev       # Start with auto-reload (development)
# or
npm start         # Start without auto-reload

# Visit http://localhost:3000
```

## Important Notes

- Financial year runs April 1 to March 31
- Session lookup in Entries is indexed for performance
- Standard SharePoint metadata fields (ID, Created, Modified, Author, Editor) are auto-managed
- Always read [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for the complete field definitions before working with SharePoint data
- Legacy Power Automate flows exist that update `FinancialYearFlow`, `HoursLastFY`, `HoursThisFY` etc. — these are being retired. The app calculates all derived values from entries.

## Known Constraints

- SharePoint API rate limits may apply
- Graph API orderby on Sessions list returns 400 - sorting done in Node.js instead
- Single line of text fields have 255 character max length
- Lookup fields require the related list item to exist first

---

*Last Updated: 2026-02-14*
