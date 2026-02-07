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

> **Note**: If you're setting up SharePoint/Entra ID for the first time (organization admin), see [docs/sharepoint-setup.md](docs/sharepoint-setup.md) for detailed configuration steps. The steps below assume SharePoint is already configured.

### 1. Clone and Install

```bash
git clone <repository-url>
cd dtv-tracker-app
npm install
```

### 2. Get Credentials

**Ask your team lead or admin for**:
- SharePoint Client ID
- SharePoint Client Secret
- SharePoint Tenant ID
- SharePoint Site URL

These are stored securely and shared via password manager or secure channel (never via email/Slack).

### 3. Create Environment File

Create a `.env` file in the project root:

```bash
# SharePoint Configuration
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/members
SHAREPOINT_CLIENT_ID=your_client_id_here
SHAREPOINT_CLIENT_SECRET=your_client_secret_here
SHAREPOINT_TENANT_ID=your_tenant_id_here

# SharePoint List GUIDs (these are the same for all developers)
GROUPS_LIST_GUID=68f9eb4a-1eea-4c1f-88e5-9211cf56e002
SESSIONS_LIST_GUID=857fc298-6eba-49ab-99bf-9712ef6b8448
ENTRIES_LIST_GUID=8a362810-15ea-4210-9ad0-a98196747866
PROFILES_LIST_GUID=f3d3c40c-35cb-4167-8c83-c566edef6f29
REGULARS_LIST_GUID=34b535f1-34ec-4fe6-a887-3b8523e492e1
```

**⚠️ Important**:
- Never commit the `.env` file to version control (already in `.gitignore`)
- The list GUIDs are the same for everyone - they identify the SharePoint lists

### 4. Verify Setup

Test your configuration:

```bash
# Run the authentication test
node test-auth.js

# Expected output:
# ✓ Access token obtained successfully
# ✓ Success! Retrieved X group(s)
```

If successful, you should see sample group data from SharePoint.

### 5. Start Development

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
│   ├── sharepoint-schema.md  # SharePoint data model documentation
│   └── sharepoint-setup.md   # One-time SharePoint/Entra ID setup (admin)
├── public/
│   └── index.html            # Frontend landing page
├── services/
│   └── sharepoint.js         # SharePoint API integration
└── test-auth.js              # Authentication testing script
```

## Documentation

- **[claude.md](claude.md)** - Project overview, data model, and development guidelines
- **[docs/sharepoint-schema.md](docs/sharepoint-schema.md)** - Complete SharePoint list schemas and relationships
- **[docs/sharepoint-setup.md](docs/sharepoint-setup.md)** - One-time SharePoint/Entra ID configuration (for admins)
- **[docs/progress.md](docs/progress.md)** - Development session notes

## SharePoint Data Model

The app uses 5 SharePoint lists:

1. **Groups (Crews)** - Volunteer groups/teams
2. **Sessions (Events)** - Scheduled volunteer events
3. **Profiles (Volunteers)** - Volunteer information
4. **Entries (Registrations)** - Links volunteers to sessions
5. **Regulars** - Tracks regular volunteers for each crew

See [docs/sharepoint-schema.md](docs/sharepoint-schema.md) for detailed schema documentation.

## SharePoint Administration

**For organization admins**: See [docs/sharepoint-setup.md](docs/sharepoint-setup.md) for complete SharePoint and Entra ID configuration guide.

## Troubleshooting

### Cannot connect to SharePoint

**Checklist**:
- [ ] `.env` file exists with all required variables
- [ ] Client ID, Secret, and Tenant ID are correct (ask your team lead if unsure)
- [ ] No extra spaces in `.env` values
- [ ] Using the correct SharePoint site URL

### "401 Unauthorized" or "Invalid client secret"

**Cause**: Credentials in `.env` are incorrect or expired

**Solution**: Contact your team lead for updated credentials

### "Unsupported app only token" error

**Cause**: SharePoint site permissions issue (admin-level problem)

**Solution**: Contact your SharePoint administrator - see [docs/sharepoint-setup.md](docs/sharepoint-setup.md) section 3

### Test script fails

```bash
# Run the authentication test to diagnose
node test-auth.js
```

If this fails, the error message will indicate whether it's:
- Authentication problem (bad credentials)
- Permission problem (contact admin)
- Network problem (check VPN/firewall)

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
