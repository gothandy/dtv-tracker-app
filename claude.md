# DTV Tracker App - Project Context

## Project Overview

This is a volunteer hours tracking and registration system for managing volunteer crews, events/sessions, and volunteer profiles. The application integrates with SharePoint for data storage and Eventbrite for event management.

## Tech Stack

- **Backend**: Node.js with Express 5.2.1
- **Frontend**: Vanilla HTML/CSS/JavaScript (served statically)
- **Data Storage**: SharePoint Lists (via REST API)
- **External Integration**: Eventbrite API
- **Server**: Express server running on http://localhost:3000

## Current State

**Last Updated**: 2026-02-06

The project has basic infrastructure in place:
- Express server with REST API endpoints ([app.js](app.js))
- SharePoint authentication and service layer ([services/sharepoint.js](services/sharepoint.js))
- API endpoints for Groups, Sessions, and Profiles
- Simple HTML landing page ([public/index.html](public/index.html))
- Comprehensive SharePoint schema documentation ([docs/sharepoint-schema.md](docs/sharepoint-schema.md))

**Current Blocker**: SharePoint site-level access needs to be granted for app-only authentication. See [docs/progress.md](docs/progress.md) for details and next steps.

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
- Access via SharePoint REST API
- Lists have specific GUIDs for API access
- Financial year tracking automated via Power Automate

## Development Guidelines

### Code Style
- Use CommonJS modules (configured in package.json)
- Lowercase-hyphen naming for files (e.g., `test-auth.js`, `sharepoint-schema.md`)
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
├── app.js                     # Express server entry point
├── claude.md                  # This file - project context for Claude
├── package.json               # Node dependencies
├── docs/
│   ├── progress.md           # Development session notes
│   ├── sharepoint-schema.md  # SharePoint data model documentation
│   └── sharepoint-setup.md   # One-time SharePoint/Entra ID setup (admin)
├── public/
│   └── index.html            # Frontend landing page
├── types/
│   ├── group.ts              # Group entity types
│   ├── session.ts            # Session entity types
│   └── sharepoint.ts         # SharePoint base types, Profile, Entry, Regular types
├── services/
│   ├── sharepoint-client.ts  # Generic SharePoint/Graph API client (auth, caching, requests)
│   ├── data-layer.ts         # Data conversion, enrichment, and validation
│   └── repositories/
│       ├── groups-repository.ts
│       ├── sessions-repository.ts
│       ├── profiles-repository.ts
│       ├── entries-repository.ts
│       └── regulars-repository.ts
└── routes/
    └── api.js                # Express API route handlers
```

## Planned Features

The application should eventually support:
- [ ] View all volunteer crews/groups
- [ ] View upcoming sessions/events
- [ ] Volunteer registration for sessions
- [ ] Check-in volunteers at events
- [ ] Record volunteer hours
- [ ] View volunteer profiles and hours history
- [ ] Report generation (hours by volunteer, by crew, by financial year)
- [ ] Eventbrite sync for automatic registration import

## Running the Application

```bash
# Install dependencies
npm install

# Start the server
node app.js

# Access the app
# http://localhost:3000
```

## Important Notes

- Financial year runs April 1 to March 31
- `FinancialYearFlow` fields are managed by Power Automate - don't modify directly
- Session lookup in Entries is indexed for performance
- Standard SharePoint metadata fields (ID, Created, Modified, Author, Editor) are auto-managed
- Always read [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for the complete field definitions before working with SharePoint data

## Known Constraints

- SharePoint API rate limits may apply
- Single line of text fields have 255 character max length
- Lookup fields require the related list item to exist first
- Power Automate handles some field updates automatically

---

*Last Updated: 2026-02-06*
