# Development Progress

## Session: 2026-02-06

### Completed Tasks

#### 1. Project Documentation ✓
- Created [claude.md](../claude.md) with comprehensive project context
- Documented all SharePoint lists, relationships, and workflows
- Added development guidelines and security considerations

#### 2. Environment Setup ✓
- Created `.env` file with SharePoint credentials (git-ignored)
- Installed dependencies:
  - `dotenv` for environment variable management
  - `axios` for HTTP requests
  - `express` already installed

#### 3. SharePoint Integration Service ✓
- Created [services/sharepoint.js](../services/sharepoint.js) with:
  - OAuth authentication with Microsoft Entra ID
  - Access token caching with expiry management
  - Generic methods for SharePoint REST API calls
  - Convenience methods for all 5 lists (Groups, Sessions, Profiles, Entries, Regulars)

#### 4. API Endpoints ✓
- Updated [app.js](../app.js) with REST API endpoints:
  - `GET /api/health` - Health check
  - `GET /api/groups` - Fetch all groups/crews
  - `GET /api/sessions` - Fetch all sessions/events
  - `GET /api/profiles` - Fetch all volunteer profiles

#### 5. Testing Infrastructure ✓
- Created [test-auth.js](../test-auth.js) for debugging authentication

### Current Status: BLOCKED

**Issue**: "Unsupported app only token" error when accessing SharePoint

**Root Cause**: The Entra ID app has permissions granted, but the specific SharePoint site doesn't allow app-only access yet.

**What Works**:
- ✓ OAuth token acquisition from Microsoft Entra ID
- ✓ Express server and API endpoints
- ✓ Code structure and service layer

**What Doesn't Work**:
- ✗ Actual SharePoint data retrieval (blocked by site permissions)

### Next Steps

Choose one of these options to proceed:

#### Option A: Grant Site-Level Access (Recommended)
1. Visit: `https://dtvolunteers.sharepoint.com/sites/members/_layouts/15/appinv.aspx`
2. Enter App Id: `267fb092-69c0-48ea-b197-67b79dd4bc92`
3. Click "Lookup"
4. Paste this permission XML:
   ```xml
   <AppPermissionRequests AllowAppOnlyPolicy="true">
     <AppPermissionRequest Scope="http://sharepoint/content/sitecollection" Right="FullControl" />
   </AppPermissionRequests>
   ```
5. Click "Create" then "Trust It"
6. Run `node test-auth.js` to verify it works

#### Option B: Switch to Microsoft Graph API
- Refactor [services/sharepoint.js](services/sharepoint.js) to use Graph API instead
- Graph API handles app-only permissions better
- Would need to use different endpoints and JSON structure

### Configuration Details

**SharePoint Site**: `https://dtvolunteers.sharepoint.com/sites/members`

**Entra ID App Registration**:
- Client ID: `267fb092-69c0-48ea-b197-67b79dd4bc92`
- Tenant ID: `0799305d-07e3-47b2-a19a-62d9931217f6`
- Permissions Granted: `Sites.ReadWrite.All` (Application, Admin Consented ✓)

**SharePoint Lists** (all GUIDs configured in `.env`):
- Groups: `68f9eb4a-1eea-4c1f-88e5-9211cf56e002`
- Sessions: `857fc298-6eba-49ab-99bf-9712ef6b8448`
- Entries: `8a362810-15ea-4210-9ad0-a98196747866`
- Profiles: `f3d3c40c-35cb-4167-8c83-c566edef6f29`
- Regulars: `34b535f1-34ec-4fe6-a887-3b8523e492e1`

### Files Modified/Created

**New Files**:
- `.env` - SharePoint credentials and list GUIDs
- `claude.md` - Project context documentation
- `docs/progress.md` - This file
- `docs/sharepoint-schema.md` - SharePoint list schema documentation
- `services/sharepoint.js` - SharePoint API service
- `test-auth.js` - Authentication test script

**Modified Files**:
- `app.js` - Added API endpoints and SharePoint integration
- `package.json` - Added axios and dotenv dependencies

### Testing Commands

```bash
# Test authentication and API call
node test-auth.js

# Start the server
node app.js

# Test endpoints (once authentication is working)
curl http://localhost:3000/api/health
curl http://localhost:3000/api/groups
curl http://localhost:3000/api/sessions
curl http://localhost:3000/api/profiles
```

### Notes for Next Session

1. **Priority**: Fix the "Unsupported app only token" error by choosing Option A or B above
2. Once SharePoint access works, verify all 5 list endpoints return data
3. Then can start building the frontend UI to display groups/sessions
4. Consider adding error logging and retry logic to the SharePoint service
5. May want to add caching layer for frequently accessed data

---

*Last Updated: 2026-02-06 - End of Session*

---

## Session: 2026-02-08

### Completed Tasks

#### 1. Microsoft Graph API Migration ✓

**Objective**: Resolve "Unsupported app only token" error by migrating from SharePoint REST API to Microsoft Graph API (Option B from previous session).

**Root Cause Identified**:
- The original error was caused by missing Microsoft Graph API permissions
- The app had SharePoint API permissions but not Microsoft Graph API permissions
- Access tokens had no roles/scopes assigned

**Migration Changes**:
- Updated authentication scope from `https://dtvolunteers.sharepoint.com/.default` to `https://graph.microsoft.com/.default`
- Added site ID discovery and caching mechanism (`getSiteId()` method)
- Refactored base `get()` method to use Graph API endpoints
- Implemented `transformGraphResponse()` for backward compatibility with existing response format
- Updated `getListItems()` to use Graph API query patterns (expand fields, filter, orderby)
- Enhanced lookup field selection to include both display values and IDs:
  - Sessions: Added `CrewLookupId`
  - Entries: Added `EventLookupId` and `VolunteerLookupId`
  - Regulars: Added `VolunteerLookupId` and `CrewLookupId`
- Updated [test-auth.js](../test-auth.js) with token inspection and better diagnostics
- Cleaned up debug logging for production code

**Azure Portal Configuration**:
- Removed old SharePoint API permissions (no longer needed)
- Added Microsoft Graph API permission: `Sites.ReadWrite.All` (Application type)
- Granted admin consent for the permission
- Verified permission appears in access token

**Files Modified**:
- [services/sharepoint.js](../services/sharepoint.js) - Complete API migration (~150 lines changed)
- [test-auth.js](../test-auth.js) - Enhanced testing and diagnostics

### Current Status: ✅ WORKING

**What Works**:
- ✓ OAuth token acquisition for Microsoft Graph API
- ✓ Access token includes correct permission: `Sites.ReadWrite.All`
- ✓ Site ID discovery from SharePoint URL
- ✓ All 5 SharePoint list queries (Groups, Sessions, Entries, Profiles, Regulars)
- ✓ Response format transformation (backward compatible with app.js)
- ✓ Lookup field data retrieval (both display value and lookup ID)
- ✓ Query parameters ($filter, $orderby, $select via expand)

**Test Results**:
```
✓ Access token obtained with Sites.ReadWrite.All permission
✓ Site ID: dtvolunteers.sharepoint.com,5d19359b-9b75-484a-adaa-ffe4d4ea12f5,8773ff53-f0bb-4791-8b86-81531dbdfe2d
✓ Retrieved 25 groups
✓ Retrieved 200 sessions with lookup fields working
```

### API Architecture

**Authentication Flow**:
1. Request access token from Microsoft Entra ID
2. Scope: `https://graph.microsoft.com/.default`
3. Token cached with 5-minute expiry buffer

**Site Discovery**:
1. Parse SharePoint site URL
2. Call Graph API: `GET /sites/{hostname}:/{sitePath}`
3. Cache site ID for subsequent requests
4. Fallback to root site if subsite path fails

**List Access Pattern**:
```
GET /sites/{siteId}/lists/{listGuid}/items?expand=fields(select=...)
```

**Response Transformation**:
- Graph format: `{ value: [ { id: "1", fields: { Title: "..." } } ] }`
- Transformed to: `[ { ID: 1, Title: "..." } ]`
- Maintains backward compatibility with Express endpoints

### Next Steps

1. **Test Express API Endpoints**:
   - Start server: `node app.js`
   - Test all endpoints: `/api/health`, `/api/groups`, `/api/sessions`, `/api/profiles`

2. **Add Missing Endpoints**:
   - `GET /api/entries` - Registration/check-in data
   - `GET /api/regulars` - Regular volunteer assignments

3. **Frontend Development**:
   - Build UI to display groups and sessions
   - Create volunteer registration workflow
   - Implement check-in interface

4. **Future Enhancements**:
   - Batch requests for multiple lists
   - Delta queries for change tracking
   - Client-side joins for expanded lookup data
   - Create/Update/Delete operations via Graph API

### Security Notes

**SharePoint List GUIDs**:
- GUIDs are identifiers, not secrets (similar to database table names)
- Security comes from OAuth authentication and permissions, not obscurity
- However, keeping them in `.env` is good practice for:
  - Separation of config from code
  - Easier environment-specific changes
  - Preventing accidental exposure if repo becomes public

**Current Security Posture**:
- ✓ Client credentials stored in `.env` (git-ignored)
- ✓ Access tokens cached in memory only
- ✓ Microsoft Graph API with tenant-level permissions
- ✓ No secrets committed to repository

### Testing Commands

```bash
# Test Microsoft Graph API authentication and data retrieval
node test-auth.js

# Start the Express server
node app.js

# Test Express API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/groups
curl http://localhost:3000/api/sessions
curl http://localhost:3000/api/profiles
```

---

*Last Updated: 2026-02-08 - Microsoft Graph API Migration Complete*

---

#### 2. Groups List Page ✓

**Objective**: Build the first frontend UI page to display volunteer groups (crews).

**Implementation**:
- Created [public/groups.html](../public/groups.html) - Groups list page
  - Responsive card grid layout displaying all 25 groups
  - Shows: Title, Name, Description, Eventbrite Series links
  - Loading states and error handling
  - Clean, professional styling
  - XSS protection with HTML escaping
- Updated [public/index.html](../public/index.html) - Home page
  - Navigation cards for Groups, Sessions, Volunteers
  - About section
  - Professional landing page layout
- Fixed [app.js](../app.js) environment loading order
  - Moved `require('dotenv').config()` before service imports
  - Resolved 401 authentication errors in Express server
  - Removed temporary debug endpoint
- Simplified error logging in [services/sharepoint.js](../services/sharepoint.js)

**Results**:
- ✓ Groups page successfully displays all 25 volunteer crews
- ✓ Express server correctly loads environment variables
- ✓ API endpoint `/api/groups` working reliably
- ✓ Clean, maintainable code ready for extension

**Files Modified**:
- [public/groups.html](../public/groups.html) - New file (250 lines)
- [public/index.html](../public/index.html) - Redesigned (150 lines)
- [app.js](../app.js) - Fixed environment loading order
- [services/sharepoint.js](../services/sharepoint.js) - Simplified error logging

**Testing**:
```bash
# View pages
http://localhost:3000/
http://localhost:3000/groups.html
```

### Current Status: ✅ GROUPS PAGE COMPLETE

**What's Working**:
- ✓ Microsoft Graph API integration (all 5 lists accessible)
- ✓ Groups list page with 25 crews displayed
- ✓ Home page with navigation
- ✓ Express server with reliable API endpoints

**Pushed to GitHub**: 3 commits (Graph API migration + Groups page)

---

*Last Updated: 2026-02-08 - Groups Page Complete*

---

#### 3. Mobile-First Requirements & Reporting Features ✓

**Objective**: Implement mobile-first design principles and build public reporting features (Options 2 + 4).

**Requirements Captured**:
- **Mobile & Field Usage** - Documented in [docs/requirements.md](../docs/requirements.md)
  - Primary use case: On-site outdoor work with limited bandwidth
  - Big simple buttons (minimum 44px touch targets)
  - Server-side processing for aggregations
  - Progressive disclosure pattern (list → detail)
  - High contrast for outdoor visibility

**Implementation**:

**A. Terminology Cleanup (Option 4)**
- Updated all UI references: "Crew" → "Group"
- [public/index.html](../public/index.html) - Navigation and about section
- [public/groups.html](../public/groups.html) - Header and card display
- Removed Name shorthand display (e.g., "Sat" is internal only)
- Added code comments: SharePoint field names (Crew, CrewLookupId) remain unchanged
- Note: Title field displays full name like "Saturday Dig" instead of shorthand

**B. Group Details Page**
- Created [public/group-detail.html](../public/group-detail.html)
- Mobile-first design with large touch targets (52px Eventbrite button)
- Big back button (44px minimum) for easy navigation
- Click through from Groups list via ?id={groupId}
- Displays Title (not internal Name shorthand)
- Prominent Eventbrite link when available

**C. Dashboard Stats (Option 2 - Part 1)**
- Added `/api/stats` endpoint in [app.js](../app.js)
  - Server-side Financial Year calculation (April 1 to March 31)
  - Aggregates: totalGroups, sessionsFY, hoursFY
  - Filters sessions by current FY (FinancialYearFlow field)
  - Returns minimal data (3 numbers + FY label)
- Updated [public/index.html](../public/index.html)
  - Dashboard stats with big numbers (3rem font size)
  - Three stat cards: Groups, Sessions This FY, Hours This FY
  - Mobile-optimized grid layout
  - Fetches data from /api/stats on page load

**D. Sessions Page (Option 2 - Part 2)**
- Created [public/sessions.html](../public/sessions.html)
  - Mobile-first list view with 200 sessions
  - Big filter buttons: "All" vs "This FY" (44px touch targets)
  - Displays: Date, Title, Group name, Hours, Registrations
  - Server-sorted by Date desc (from API)
  - Progressive disclosure - list view only (detail page future)
  - Responsive layout optimized for mobile devices
- Updated home page navigation to link to Sessions

**Files Modified**:
- [docs/requirements.md](../docs/requirements.md) - Added mobile & field usage requirements (NEW)
- [app.js](../app.js) - Added /api/stats endpoint with FY calculation
- [public/index.html](../public/index.html) - Dashboard stats + terminology cleanup
- [public/groups.html](../public/groups.html) - Terminology + clickable cards
- [public/group-detail.html](../public/group-detail.html) - NEW mobile-first detail page
- [public/sessions.html](../public/sessions.html) - NEW mobile-first Sessions list

**Testing**:
```bash
# View all pages
http://localhost:3000/                    # Dashboard with stats
http://localhost:3000/groups.html         # Groups list
http://localhost:3000/group-detail.html?id=1  # Group detail
http://localhost:3000/sessions.html       # Sessions list

# Test API endpoints
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/groups
curl http://localhost:3000/api/sessions
```

### Current Status: ✅ MOBILE-FIRST REPORTING COMPLETE

**What's Working**:
- ✓ Mobile-first requirements documented
- ✓ Terminology cleanup: "Crew" → "Group" throughout UI
- ✓ Group Details page with big buttons and touch targets
- ✓ Dashboard stats with big numbers (Groups, Sessions FY, Hours FY)
- ✓ Sessions page with filter toggle (All vs This FY)
- ✓ Server-side FY calculation and aggregation
- ✓ Progressive disclosure pattern (list → detail)
- ✓ All pages optimized for mobile devices

**Key Technical Decisions**:
- Financial Year calculation: `currentMonth >= 3 ? currentYear : currentYear - 1`
- Uses SharePoint's `FinancialYearFlow` field (auto-populated by Power Automate)
- Server-side filtering/aggregation to minimize bandwidth usage
- Big buttons (44px minimum) for outdoor use with gloves
- High contrast colors (#2c5f2d green) for visibility in bright sunlight

**Pushed to GitHub**: 2 commits
1. Mobile-first requirements + terminology cleanup + Group Details
2. Dashboard stats + Sessions page

---

*Last Updated: 2026-02-08 - Mobile-First Reporting Complete*

---

## Session: 2026-02-08 (Afternoon)

### Completed Tasks

#### 1. Fixed Critical Pagination Bug ✓

**Objective**: Resolve hours calculation discrepancy (67.5 hours vs expected 2826.5 hours)

**Root Cause**: Microsoft Graph API only returns 200 items by default; pagination wasn't implemented

**Solution**:
- Updated [services/sharepoint.js](../services/sharepoint.js) `getListItems()` method to handle pagination
- Added `$top=999` parameter to increase page size
- Implemented loop to follow `@odata.nextLink` until all items retrieved
- Now fetches all items from large lists automatically

**Results**:
- **Before**: 200 sessions, 200 entries, 67.5 hours
- **After**: 517 sessions, 3,242 entries, 2,628.5 hours ✓
- Dashboard now matches SharePoint pivot table perfectly

**Files Modified**:
- [services/sharepoint.js](../services/sharepoint.js) lines 176-230 - Added pagination loop

#### 2. Implemented Hybrid Financial Year Filtering ✓

**Objective**: Use Sessions.FinancialYearFlow field as authoritative source for FY filtering

**Background**:
- `FinancialYearFlow` field is auto-populated by Power Automate (column names ending in "Flow")
- Only recent sessions have this field populated (7 of 517 sessions)
- Older sessions need date-based filtering fallback

**Implementation**:
- Filter entries by joining to Sessions via EventLookupId
- Use Sessions.FinancialYearFlow when populated (preferred)
- Fall back to date-based filtering (April 1 - March 31) when FinancialYearFlow is null
- Entries.FinancialYearFlow field marked for deletion (not maintained)

**Files Modified**:
- [app.js](../app.js) lines 79-126 - Hybrid FY filtering logic
- [docs/sharepoint-refactoring.md](sharepoint-refactoring.md) - Documented FY field usage

#### 3. Added Active Groups Stat to Dashboard ✓

**Objective**: Show count of groups with active sessions in current FY (more meaningful than total groups)

**Implementation**:
- Calculate unique CrewLookupId values from sessions in current FY
- Replace "Total Groups" stat with "Active Groups This FY"
- Shows 14 active groups out of 25 total for FY 2025-2026

**Dashboard Stats**:
- Active Groups: 14 (This FY)
- Sessions: 103 (This FY)
- Hours: 2,628.5 (This FY)

**Files Modified**:
- [app.js](../app.js) lines 133-145 - Active groups calculation
- [public/index.html](../public/index.html) - Updated dashboard UI

#### 4. Documentation & Refactoring ✓

**Documentation Created**:
- [docs/sharepoint-refactoring.md](sharepoint-refactoring.md) - Tracks legacy columns, naming issues, and cleanup tasks

**Schema Updates**:
- [docs/sharepoint-schema.md](sharepoint-schema.md) - Clarified Title vs Name field usage in Groups list
- Added notes about "Flow" suffix convention (Power Automate fields)
- Added pagination requirements and implementation notes

**Code Cleanup**:
- Moved 7 test files to [test/](../test/) folder
- Deleted accidental NUL file
- Updated comments to reflect actual field usage

### Key Learnings Documented

1. **Pagination is Critical**: Always implement pagination when using Microsoft Graph API
   - Default limit: 200-1000 items depending on endpoint
   - Follow `@odata.nextLink` to get all pages
   - Use `$top=999` to reduce number of requests

2. **Power Automate Naming Convention**: Column names ending in "Flow" are auto-populated by Power Automate flows
   - Example: `FinancialYearFlow` in Sessions list

3. **Financial Year Data Model**:
   - Sessions.FinancialYearFlow = Authoritative source (maintained by Power Automate)
   - Entries.FinancialYearFlow = Deprecated (not maintained, delete column)
   - Always join Entries → Sessions to get FY data

4. **Hybrid Filtering Pattern**: When a field isn't fully populated, use a hybrid approach:
   - Prefer the dedicated field when available
   - Fall back to calculated/derived values when null
   - Ensures both new and legacy data are included

5. **Field Name Confusion - Groups List**:
   - `Title` = Shorthand (e.g., "Sat") - used in lookups
   - `Name` = Full name (e.g., "Saturday Dig") - use for UI display
   - Schema documentation was backwards from actual usage

### Current Status: ✅ DASHBOARD STATS WORKING

**What's Working**:
- ✓ Pagination retrieves all 3,242 entries and 517 sessions
- ✓ Dashboard shows accurate FY stats: 14 active groups, 103 sessions, 2,628.5 hours
- ✓ Numbers match SharePoint pivot table exactly
- ✓ Hybrid FY filtering handles both new and legacy data
- ✓ All three dashboard stats are FY-specific and consistent

**Files in This Session**:
- [services/sharepoint.js](../services/sharepoint.js) - Pagination + hybrid filtering
- [app.js](../app.js) - Active groups stat + FY filtering
- [public/index.html](../public/index.html) - Dashboard UI updates
- [docs/sharepoint-schema.md](sharepoint-schema.md) - Field clarifications
- [docs/sharepoint-refactoring.md](sharepoint-refactoring.md) - Cleanup tracking (NEW)

### Next Steps

1. **SharePoint Cleanup**:
   - [ ] Delete FinancialYearFlow column from Entries list
   - [ ] Backfill FinancialYearFlow for all Sessions (or rely on date-based fallback)
   - [ ] Review and update Power Automate flows

2. **Future Enhancements**:
   - [ ] Add volunteers page (currently "Coming soon")
   - [ ] Implement check-in workflow
   - [ ] Add filtering/sorting to Sessions page
   - [ ] Build volunteer hours reports

---

*Last Updated: 2026-02-08 - Dashboard Stats Fixed with Pagination*

---

## Session: 2026-02-09

### Completed Tasks

#### 1. Comment and Documentation Cleanup ✓

Applied three documentation principles across the codebase:
1. Readable code over comments - good naming conventions
2. Comments explain what developers need to know, not what the code does
3. Keep readmes updated on commits

**Changes**:
- Removed redundant JSDoc from all 5 repository files (getAll methods are self-explanatory)
- Fixed stale "Temporarily disabled orderby" comment in sessions-repository.ts to a proper TODO
- Trimmed verbose JSDoc in entries-repository.ts
- Removed redundant CSS comment in index.html
- Added documentation philosophy to CLAUDE.md

#### 2. API TypeScript Conversion ✓

**Objective**: Convert `routes/api.js` to TypeScript with clean domain naming, preventing SharePoint field names from leaking into the HTTP API.

**Architecture Decision**: Thin API layer (HTTP plumbing only), heavy domain/data layer (all business logic, conversions, aggregation). Neither layer handles UI concerns like fallbacks.

**New Files**:
- [types/api-responses.ts](../types/api-responses.ts) - API contract types (GroupResponse, SessionResponse, ProfileResponse, StatsResponse)
- [routes/api.ts](../routes/api.ts) - TypeScript API routes using domain types

**Deleted Files**:
- `routes/api.js` - Replaced by TypeScript version

**Key Changes**:
- All API responses use clean camelCase field names (`displayName`, `groupId`, `financialYear`) instead of SharePoint names (`Name`, `CrewLookupId`, `FinancialYearFlow`)
- No fallback logic in API (e.g., removed `|| 'Untitled Session'`) - UI decides what to show for null values
- Stats calculation (`calculateCurrentFY`, `calculateFYStats`) moved from API route to data-layer.ts
- `app.js` imports from `./dist/routes/api` (compiled TypeScript)
- nodemon config updated to watch `dist/` and `.ts` files

**Field Name Mapping (old → new)**:
| SharePoint | API Response |
|---|---|
| `.ID` | `.id` |
| `.Name` | `.displayName` |
| `.Description` | `.description` |
| `.Date` | `.date` |
| `.CrewLookupId` | `.groupId` |
| `.GroupName` | `.groupName` |
| `.Hours` | `.hours` |
| `.Registrations` | `.registrations` |
| `.FinancialYearFlow` | `.financialYear` |
| `.EventbriteSeriesID` | `.eventbriteSeriesId` |
| `.EventbriteEventID` | `.eventbriteEventId` |

**Frontend Updated**:
- [public/groups.html](../public/groups.html) - Updated all field references
- [public/group-detail.html](../public/group-detail.html) - Updated all field references
- [public/sessions.html](../public/sessions.html) - Updated all field references

#### 3. Documentation Updates ✓

- Updated readme.md: file structure (`api.js` → `api.ts`, added `api-responses.ts`), code style description
- Updated CLAUDE.md: current state, file structure, code style description
- Updated docs/progress.md: this session entry

### Current Status: ✅ API TYPESCRIPT CONVERSION COMPLETE

**Architecture**:
```
SharePoint → Repository → Data Layer (convert/enrich/validate) → API (map to response types) → Frontend
                          (heavy: business logic)                  (thin: HTTP plumbing)
```

**What's Working**:
- ✓ TypeScript API routes with compiler-enforced domain types
- ✓ No SharePoint field names leak into HTTP responses
- ✓ Clean separation: data layer owns business logic, API is thin HTTP adapter
- ✓ All frontend pages updated and working with new field names
- ✓ Dashboard, Groups, Group Detail, and Sessions pages all functional

---

*Last Updated: 2026-02-09 - API TypeScript Conversion Complete*

---

## Session: 2026-02-11

### Completed Tasks

#### 1. Homepage Next Session Card ✓
- Replaced custom `.next-dig-card` with shared `renderSessionList()` from common.js
- Homepage "next session" block now matches the session card style on the sessions page

#### 2. Session Details Check-in Checkboxes ✓
- Added check-in checkboxes to entry cards on the session detail page
- Checkbox sits outside the `<a>` card as a sibling in a `.entry-row` wrapper, so both work independently
- Uses existing `PATCH /api/entries/:id` endpoint with `{ checkedIn: boolean }`
- Checkboxes only shown for the next upcoming session (when countdown is active)
- Past sessions still show check-in state via the green left border but without checkboxes

#### 3. Entry Card UI Refinements ✓
- Hours meta hidden when value is 0
- Tag icons (Child, Regular, New, etc.) now display inline to the right of volunteer name, wrapping only when space is tight

#### 4. Delete Entry ✓
- Added `deleteListItem()` to SharePoint client (Graph API DELETE)
- Added `delete()` to entries repository with cache invalidation
- Added `DELETE /api/entries/:id` endpoint with ID validation
- Added "Delete Entry" button on entry detail page with confirm dialog
- Redirects back to session detail page on success

#### 5. Terminology: "Entry" Over "Registration" ✓
- Updated CLAUDE.md to document that "Entry" is the preferred UI term
- An entry starts as a registration and becomes an attendance record after check-in
- Avoids "registration" or "attendee" labels since the same record serves both purposes

---

*Last Updated: 2026-02-11*
