# DTV Tracker App

A volunteer hours tracking and registration system for managing volunteer crews, events/sessions, and volunteer profiles. Integrates with SharePoint for data storage and Eventbrite for event management.

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd dtv-tracker-app

# Install dependencies
npm install

# Configure environment (see Setup section below)
# Create .env file with your credentials

# Start the server
node app.js

# Visit http://localhost:3000
```

## Prerequisites

- **Node.js** 18+ (with npm)
- **Git**
- **SharePoint Online** access with admin permissions
- **Microsoft Entra ID** (formerly Azure AD) access to create app registrations

## Setup for New Developers

### 1. Clone and Install

```bash
git clone <repository-url>
cd dtv-tracker-app
npm install
```

### 2. Create Environment File

Create a `.env` file in the project root (this file is git-ignored and won't be committed):

```bash
# SharePoint Configuration
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/members
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here

# SharePoint List GUIDs
GROUPS_LIST_GUID=68f9eb4a-1eea-4c1f-88e5-9211cf56e002
SESSIONS_LIST_GUID=857fc298-6eba-49ab-99bf-9712ef6b8448
ENTRIES_LIST_GUID=8a362810-15ea-4210-9ad0-a98196747866
PROFILES_LIST_GUID=f3d3c40c-35cb-4167-8c83-c566edef6f29
REGULARS_LIST_GUID=34b535f1-34ec-4fe6-a887-3b8523e492e1
```

**⚠️ Important**: Never commit the `.env` file to version control. It contains sensitive credentials.

### 3. Set Up Microsoft Entra ID App Registration

#### A. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** → **App registrations**
3. Click **+ New registration**
4. Configure:
   - **Name**: `DTV Volunteer Tracker` (or your preferred name)
   - **Supported account types**: Single tenant
   - **Redirect URI**: Leave blank for now
5. Click **Register**
6. **Copy the following values to your `.env` file**:
   - **Application (client) ID** → `SHAREPOINT_CLIENT_ID`
   - **Directory (tenant) ID** → `SHAREPOINT_TENANT_ID`

#### B. Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Add description: `Dev Secret` (or preferred name)
4. Choose expiration period
5. Click **Add**
6. **⚠️ Copy the secret Value immediately** → `SHAREPOINT_CLIENT_SECRET` in `.env`
   - You can't view it again after leaving the page!

#### C. Grant SharePoint Permissions

1. In your app registration, go to **API permissions**
2. Click **+ Add a permission**
3. Select **SharePoint**
4. Select **Application permissions** (not Delegated)
5. Check **`Sites.ReadWrite.All`**
6. Click **Add permissions**
7. **Click "✓ Grant admin consent for [your org]"** (requires admin role)
8. Verify Status shows "Granted for [your org]" with green checkmark

### 4. Grant SharePoint Site-Level Access

Even with API permissions, you need to grant the app access to the specific SharePoint site.

1. Visit (replace with your site URL):
   ```
   https://dtvolunteers.sharepoint.com/sites/members/_layouts/15/appinv.aspx
   ```

2. Enter your **Client ID** in the "App Id" field and click **Lookup**

3. Paste this permission XML:
   ```xml
   <AppPermissionRequests AllowAppOnlyPolicy="true">
     <AppPermissionRequest Scope="http://sharepoint/content/sitecollection" Right="FullControl" />
   </AppPermissionRequests>
   ```

4. Click **Create**

5. Click **Trust It** when prompted

6. Wait 1-2 minutes for permissions to propagate

### 5. Verify Setup

Test your configuration:

```bash
# Run the authentication test
node test-auth.js

# Expected output:
# ✓ Access token obtained successfully
# ✓ Success! Retrieved X group(s)
```

If successful, you should see sample group data from SharePoint.

### 6. Start Development

```bash
# Start the server
node app.js

# Server will be running at http://localhost:3000
```

**Available API endpoints**:
- `GET /api/health` - Health check
- `GET /api/groups` - Fetch all volunteer groups/crews
- `GET /api/sessions` - Fetch all sessions/events
- `GET /api/profiles` - Fetch all volunteer profiles

Test an endpoint:
```bash
curl http://localhost:3000/api/groups
```

## Project Structure

```
dtv-tracker-app/
├── app.js                     # Express server entry point
├── claude.md                  # AI assistant project context
├── package.json               # Node dependencies
├── .env                       # Environment variables (git-ignored)
├── .gitignore                 # Git ignore rules
├── docs/
│   ├── progress.md           # Development session notes
│   └── sharepoint-schema.md  # SharePoint data model documentation
├── public/
│   └── index.html            # Frontend landing page
├── services/
│   └── sharepoint.js         # SharePoint API integration
└── test-auth.js              # Authentication testing script
```

## Documentation

- **[claude.md](claude.md)** - Project overview, data model, and development guidelines
- **[docs/sharepoint-schema.md](docs/sharepoint-schema.md)** - Complete SharePoint list schemas and relationships
- **[docs/progress.md](docs/progress.md)** - Development progress and session notes

## SharePoint Data Model

The app uses 5 SharePoint lists:

1. **Groups (Crews)** - Volunteer groups/teams
2. **Sessions (Events)** - Scheduled volunteer events
3. **Profiles (Volunteers)** - Volunteer information
4. **Entries (Registrations)** - Links volunteers to sessions
5. **Regulars** - Tracks regular volunteers for each crew

See [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for detailed schema documentation.

## Troubleshooting

### "Unsupported app only token" error

**Cause**: SharePoint site permissions not granted (Step 4 above)

**Solution**: Visit `https://[your-site]/_layouts/15/appinv.aspx` and grant site-level permissions

### "401 Unauthorized" error

**Causes**:
1. Entra ID permissions not granted admin consent (Step 3C)
2. Client secret expired or incorrect
3. Site-level permissions not configured (Step 4)

**Solutions**:
1. Verify "Granted" status in Entra ID app permissions
2. Generate a new client secret
3. Complete Step 4 above

### "Invalid client secret" error

**Cause**: Client secret copied incorrectly or expired

**Solution**:
1. Create a new client secret in Entra ID
2. Update `SHAREPOINT_CLIENT_SECRET` in `.env`
3. Make sure you copied the secret **Value**, not the Secret ID

### Cannot connect to SharePoint

**Checklist**:
- [ ] `.env` file exists with all required variables
- [ ] Client ID, Secret, and Tenant ID are correct
- [ ] API permissions granted and admin-consented
- [ ] Site-level permissions granted via appinv.aspx
- [ ] Waited 1-2 minutes after granting permissions

## Development Guidelines

### Code Style
- Use CommonJS modules
- Lowercase-hyphen naming for files (e.g., `sharepoint.js`, `test-auth.js`)
- Keep code simple and maintainable
- Follow existing patterns

### Security
- ✅ Never commit `.env` file (already in `.gitignore`)
- ✅ Never commit secrets or credentials
- ✅ Validate all user input
- ✅ Prevent XSS when displaying user content
- ✅ Use parameterized queries for SharePoint API

### SharePoint Integration
- Always reference [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for field names
- Use internal field names (e.g., `Crew` not `Group`)
- Don't modify `FinancialYearFlow` fields (managed by Power Automate)
- Be aware of SharePoint API rate limits

## Getting Help

- Check [docs/progress.md](docs/progress.md) for known issues and recent changes
- Review [claude.md](claude.md) for project context and guidelines
- Check [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for data structure questions

## License

[Add your license here]

## Contributors

[Add contributor information here]

---

*For detailed project context and AI assistant instructions, see [claude.md](claude.md)*
