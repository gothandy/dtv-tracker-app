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

**Last Updated**: 2026-02-16

Feature-complete volunteer tracking application with:
- Express server entry point ([app.js](app.js)) loading compiled TypeScript routes
- Microsoft Entra ID authentication with session management ([routes/auth.ts](routes/auth.ts))
- TypeScript API routes split by domain ([routes/](routes/)) — 40+ endpoints across 8 route modules
- API response types defining the HTTP contract ([types/api-responses.ts](types/api-responses.ts))
- TypeScript service layer with Graph API client ([services/sharepoint-client.ts](services/sharepoint-client.ts))
- Eventbrite API client for event and attendee sync ([services/eventbrite-client.ts](services/eventbrite-client.ts))
- Data layer handling SharePoint quirks, enrichment, and FY stats ([services/data-layer.ts](services/data-layer.ts))
- Repository pattern for each SharePoint list ([services/repositories/](services/repositories/))
- Auth middleware with session auth + API key bypass ([middleware/require-auth.ts](middleware/require-auth.ts))
- Server-side caching with 5-minute TTL
- Hosted on Azure App Service with Azure Logic App for scheduled Eventbrite sync
- Comprehensive SharePoint schema documentation ([docs/sharepoint-schema.md](docs/sharepoint-schema.md))

### Pages
- Dashboard with FY stats, progress bar, next session card ([public/index.html](public/index.html))
- Admin page with Eventbrite sync buttons, exports, site link ([public/admin.html](public/admin.html))
- Groups listing with FY filter ([public/groups.html](public/groups.html))
- Group detail with stats, regulars, sessions, edit/create/delete ([public/group-detail.html](public/group-detail.html))
- Sessions listing with FY filtering ([public/sessions.html](public/sessions.html))
- Session detail with entries, check-in, set hours, edit/delete ([public/session-detail.html](public/session-detail.html))
- Volunteers listing with FY filter, sort, group filter, search ([public/volunteers.html](public/volunteers.html))
- Profile detail with FY stats, group hours, entries, records, regulars ([public/profile-detail.html](public/profile-detail.html))
- Entry edit page with tag buttons, auto-fields, delete ([public/entry-detail.html](public/entry-detail.html))
- Add entry page with volunteer search and create ([public/add-entry.html](public/add-entry.html))
- Shared utilities: header, footer, breadcrumbs, date formatting ([public/js/common.js](public/js/common.js))

## Data Model

The application uses 6 SharePoint lists on the Tracker site (`/sites/tracker`):

### 1. Groups List
**GUID**: `6e86cef7-a855-41a4-93e8-6e01a80434a2`
- Stores volunteer group/crew information
- Key fields: Title (key), Name (display), Description, EventbriteSeriesID

### 2. Sessions List
**GUID**: `583867bd-e032-4940-89b5-aa2d5158c5d0`
- Stores volunteer event/session information
- Key fields: Title, Date (required), Group (lookup to Groups), Notes, EventbriteEventID
- Registrations and hours are calculated from Entries, not stored

### 3. Entries List
**GUID**: `7146b950-94e3-4c94-a0d7-310cf2fbd325`
- Junction table linking volunteers to sessions
- Key fields: Session (indexed lookup to Sessions), Profile (lookup to Profiles), Checked, Hours, Count
- Notes field supports hashtags: #New #Child #DofE #DigLead #FirstAider #Regular
- **Naming**: "Entry" is the preferred term in the UI. An entry starts as a registration (before the session) and becomes an attendance record (after check-in). Avoid "registration" or "attendee" as labels since the same record serves both purposes.

### 4. Profiles List
**GUID**: `84649143-9e10-42eb-b6ee-2e1f57033073`
- Stores volunteer profile information
- Key fields: Title (name), Email, MatchName (for Eventbrite matching), IsGroup
- Hours are calculated from Entries, not stored

### 5. Regulars List
**GUID**: `925c96fd-9b3a-4f55-b179-ed51fc279d39`
- Junction table linking volunteers to groups they regularly attend
- Key fields: Profile (lookup to Profiles), Group (lookup to Groups)

### 6. Records List
**GUID**: `2666a819-1275-4fce-83a3-5bb67b4da83a`
- Tracks consents, benefits, and governance items per profile
- Key fields: Profile (lookup to Profiles), Type (choice), Status (choice), Date
- Type choices: Privacy Consent, Photo Consent, Newsletter Consent, Charity Membership, Discount Card

## Entity Relationships

```
Groups 1:N Sessions
Sessions 1:N Entries N:1 Profiles
Groups N:N Regulars N:N Profiles
Profiles 1:N Records
```

## Membership Rules

A volunteer becomes a **member** when they have a "Charity Membership" record with Status "Accepted" in the Records list. Groups cannot be members.

### Member badge and highlighting
- **MEMBER badge**: Based on Charity Membership record status from the Records list (`isMember` field on ProfileResponse).
- **CARD badge**: Shows discount card status — green if Accepted, orange if Invited (`cardStatus` field on ProfileResponse).
- **Card highlighting** (green background on volunteers list): Hours-based — changes with the FY filter, highlights if the volunteer meets 15h in the selected FY.
- This separation makes at-risk members easy to spot: when filtering "This FY", a volunteer with a MEMBER badge but no green highlight hasn't yet reached 15h this year.

The threshold constant for card highlighting is `MEMBER_HOURS = 15` in `volunteers.html`. Profile and entry detail pages use the literal `15`.

## Key Workflows

1. **Create Groups**: Set up volunteer crews/groups
2. **Schedule Sessions**: Create events/sessions for each group with dates
3. **Volunteer Registration**: Create Entries linking volunteers (Profiles) to Sessions
4. **Check-in**: Mark Entries as Checked when volunteers show up
5. **Hours Tracking**: Record hours at session level and individual entry level
6. **Regular Tracking**: Assign core volunteers as Regulars for specific crews

## External Integrations

### Eventbrite
- Groups have `EventbriteSeriesID` for linking to Eventbrite recurring series
- Sessions have `EventbriteEventID` for linking to specific events
- Profiles use `MatchName` field (lowercase name) to sync with Eventbrite registrations
- Eventbrite client ([services/eventbrite-client.ts](services/eventbrite-client.ts)):
  - `getOrgEvents()` — fetches all live events from the organisation, used to create new sessions
  - `getAttendees()` — fetches attendees for a specific event, used to create profiles and entries
- Sync endpoints ([routes/eventbrite.ts](routes/eventbrite.ts)):
  - `POST /api/eventbrite/event-and-attendee-update` — combined sync (sessions + attendees), returns summary string
  - `POST /api/eventbrite/sync-sessions` — matches Eventbrite events to groups by SeriesID, creates missing sessions
  - `POST /api/eventbrite/sync-attendees` — fetches attendees for upcoming sessions, creates profiles/entries/consent records
  - `GET /api/eventbrite/unmatched-events` — lists events with no matching group (for admin UI)
- Admin page ([public/admin.html](public/admin.html)) provides manual sync buttons
- Scheduled daily sync via Azure Logic App calling `event-and-attendee-update` with API key auth

### Scheduled Sync
- **Azure Logic App** (Consumption plan) calls `POST /api/eventbrite/event-and-attendee-update` daily
- Auth: `X-Api-Key` header checked in `middleware/require-auth.ts` for `/api/eventbrite/` paths
- Env vars: `API_SYNC_KEY` (shared secret), `EVENTBRITE_ORGANIZATION_ID`, `EVENTBRITE_API_KEY`
- Response includes `summary` field for email notifications

### SharePoint
- All data stored in SharePoint Online lists on the Tracker site (`/sites/tracker`)
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
- **Always calculate derived values** (hours totals, counts) from source entries at query time rather than storing them.
- The app is the source of truth for all derived data. No Power Automate flows update fields.
- Cached data (5-minute TTL) keeps this performant despite recalculating on each request.

### SharePoint Integration
- Use the documented GUIDs and internal field names from [docs/sharepoint-schema.md](docs/sharepoint-schema.md)
- Field name constants live in `services/field-names.ts` — use these instead of hardcoded strings
- SharePoint returns lookup IDs as strings — always use `safeParseLookupId()` from `data-layer.ts` for comparisons
- Indexed fields: `Session` in Entries list for performance

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
│   ├── eventbrite-client.ts       # Eventbrite API client (org events, attendees)
│   ├── field-names.ts             # SharePoint field name constants
│   ├── data-layer.ts              # Data conversion, enrichment, validation
│   └── repositories/
│       ├── groups-repository.ts
│       ├── sessions-repository.ts
│       ├── profiles-repository.ts
│       ├── entries-repository.ts
│       ├── regulars-repository.ts
│       └── records-repository.ts
├── routes/
│   ├── api.ts                     # Router mounting all route modules
│   ├── groups.ts                  # Groups CRUD endpoints
│   ├── sessions.ts                # Sessions CRUD + CSV exports
│   ├── entries.ts                 # Entries CRUD
│   ├── profiles.ts                # Profiles CRUD + records + transfer
│   ├── regulars.ts                # Regulars management
│   ├── stats.ts                   # Dashboard stats, cache, config
│   ├── eventbrite.ts              # Eventbrite sync endpoints
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
│   ├── admin.html                 # Admin page (Eventbrite sync, exports)
│   ├── css/
│   │   └── styles.css             # Global stylesheet
│   └── js/
│       └── common.js              # Shared header, footer, utilities
└── test/
    ├── test-auth.js               # Authentication verification
    └── test-*.js                  # Various data/integration tests
```

## Implemented Features

- [x] Full CRUD for groups, sessions, profiles, entries, records
- [x] Volunteer registration for sessions (add entry)
- [x] Bulk add regulars to a session
- [x] Check-in volunteers at events (checkbox per entry)
- [x] Record volunteer hours (per-entry and bulk set hours)
- [x] View volunteer profiles and hours history
- [x] FY filtering on all list pages (This FY / Last FY / All)
- [x] Group-filtered volunteer listing with search
- [x] Regulars management (add/remove per group)
- [x] Member status tracking (Charity Membership record + hours-based highlighting)
- [x] Consent/records management on profile detail page
- [x] CSV exports (sessions, profiles, records)
- [x] Profile transfer (merge duplicate profiles)
- [x] Microsoft authentication (Entra ID OAuth)
- [x] Mobile-first responsive design (44px touch targets)
- [x] Eventbrite session sync (org events → sessions via SeriesID matching)
- [x] Eventbrite attendee sync (attendees → profiles/entries/consent records)
- [x] Admin page with manual sync buttons and unmatched events display
- [x] API key auth for scheduled sync (Azure Logic App)
- [x] Azure App Service deployment

## Planned Features

- [ ] Sync logging (SharePoint Logs list or similar)
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
- The app calculates all derived values (hours, registrations, membership) from source data at query time.

## Known Constraints

- SharePoint API rate limits may apply
- Graph API orderby on Sessions list returns 400 - sorting done in Node.js instead
- Single line of text fields have 255 character max length
- Lookup fields require the related list item to exist first

---

*Last Updated: 2026-02-16*
