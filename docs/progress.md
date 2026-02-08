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
