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

**Last Updated**: 2026-02-09

Working application with:
- Express server with REST API endpoints ([app.js](app.js))
- TypeScript service layer with Graph API client ([services/sharepoint-client.ts](services/sharepoint-client.ts))
- Data layer handling SharePoint quirks ([services/data-layer.ts](services/data-layer.ts))
- Repository pattern for each SharePoint list ([services/repositories/](services/repositories/))
- Dashboard with FY stats ([public/index.html](public/index.html))
- Groups listing and detail pages ([public/groups.html](public/groups.html))
- Sessions listing with FY filtering ([public/sessions.html](public/sessions.html))
- Server-side caching with 5-minute TTL
- Comprehensive SharePoint schema documentation ([docs/sharepoint-schema.md](docs/sharepoint-schema.md))

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

### 3. Entries (Registrations) List
**GUID**: `8a362810-15ea-4210-9ad0-a98196747866`
- Junction table linking volunteers to sessions
- Key fields: Event (indexed lookup to Sessions), Volunteer (lookup to Profiles), Checked (check-in status), Hours, Count
- Tracks registrations, check-ins, and individual hours per volunteer per session
- Notes field supports hashtags: #New #Child #DofE #DigLead #FirstAider #Regular

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
- Profiles use `MatchName` field to sync with Eventbrite registrations

### SharePoint
- All data stored in SharePoint Online lists
- Access via Microsoft Graph API
- Lists have specific GUIDs for API access
- Financial year tracking automated via Power Automate

## Development Guidelines

### Comments and Documentation Philosophy
- **Readable code over comments**: Use clear naming conventions so the code explains itself
- **Comments explain why, not what**: Use comments for things developers need to know that aren't obvious from the code (SharePoint quirks, business rules, workarounds)
- **Comments as a tech debt flag**: If you need a comment to explain what code does, consider whether the code itself could be clearer
- **Keep readme/docs updated on commits**: Documentation should reflect the current state of the project

### Code Style
- TypeScript for services and types, CommonJS for routes and entry point
- Lowercase-hyphen naming for files (e.g., `data-layer.ts`, `test-auth.js`)
- Keep code simple and maintainable
- Follow existing patterns in the codebase

### Documentation
- Keep [readme.md](readme.md) updated with setup instructions when dependencies or configuration change
- Update [docs/progress.md](docs/progress.md) at the end of each development session
- Update [docs/sharepoint-schema.md](docs/sharepoint-schema.md) if SharePoint lists or fields change

### SharePoint Integration
- Use the documented GUIDs and internal field names from [docs/sharepoint-schema.md](docs/sharepoint-schema.md)
- Remember SharePoint internal names are different from display names (e.g., "Crew" vs "Group")
- Indexed fields: `Event` in Entries list for performance

### Data Validation
- Sessions require a Date field
- Entries default Count to 1
- Entries default Checked to false
- Financial year fields are auto-populated (don't modify manually)

### Security Considerations
- Validate all user input before SharePoint API calls
- Prevent XSS when displaying user-generated content
- Use parameterized queries for SharePoint REST API
- Don't commit secrets or SharePoint credentials to git

## File Structure

```
dtv-tracker-app/
├── app.js                          # Express server entry point
├── package.json
├── tsconfig.json                   # TypeScript configuration
├── CLAUDE.md                       # This file - project context for Claude
├── docs/
│   ├── progress.md                # Development session notes
│   ├── sharepoint-schema.md       # SharePoint list schemas and field names
│   └── sharepoint-setup.md        # One-time SharePoint/Entra ID setup (admin)
├── types/
│   ├── group.ts                   # Group entity types (SharePoint + domain)
│   ├── session.ts                 # Session entity types
│   └── sharepoint.ts             # Profile, Entry, Regular types + utilities
├── services/
│   ├── sharepoint-client.ts       # Graph API client (auth, caching, pagination)
│   ├── data-layer.ts              # Data conversion, enrichment, validation
│   └── repositories/
│       ├── groups-repository.ts
│       ├── sessions-repository.ts
│       ├── profiles-repository.ts
│       ├── entries-repository.ts
│       └── regulars-repository.ts
├── routes/
│   └── api.js                     # Express API route handlers
├── public/
│   ├── index.html                 # Dashboard homepage
│   ├── groups.html                # Groups listing with FY filter
│   ├── group-detail.html          # Individual group detail page
│   ├── sessions.html              # Sessions listing with FY filter
│   └── js/
│       └── common.js              # Shared header/footer components
└── test/
    ├── test-auth.js               # Authentication verification
    └── test-*.js                  # Various data/integration tests
```

## Planned Features

The application should eventually support:
- [x] View all volunteer crews/groups
- [x] View upcoming sessions/events
- [ ] Volunteer registration for sessions
- [ ] Check-in volunteers at events
- [ ] Record volunteer hours
- [ ] View volunteer profiles and hours history
- [ ] Report generation (hours by volunteer, by crew, by financial year)
- [ ] Eventbrite sync for automatic registration import

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
- `FinancialYearFlow` fields are managed by Power Automate - don't modify directly
- Session lookup in Entries is indexed for performance
- Standard SharePoint metadata fields (ID, Created, Modified, Author, Editor) are auto-managed
- Always read [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for the complete field definitions before working with SharePoint data

## Known Constraints

- SharePoint API rate limits may apply
- Graph API orderby on Sessions list returns 400 - sorting done in Node.js instead
- Single line of text fields have 255 character max length
- Lookup fields require the related list item to exist first
- Power Automate handles some field updates automatically

---

*Last Updated: 2026-02-09*
