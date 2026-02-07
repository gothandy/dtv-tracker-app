# SharePoint Configuration Guide

**Audience**: Organization admin / SharePoint administrator

This is a **one-time setup** guide for configuring SharePoint and Microsoft Entra ID for the DTV Tracker App. New developers joining the project won't need to repeat these steps - they just need the credentials (see [../readme.md](../readme.md)).

---

## Overview

The app uses OAuth 2.0 client credentials flow to authenticate with SharePoint via Microsoft Entra ID. This requires:
1. Entra ID app registration
2. API permissions with admin consent
3. SharePoint site-level permissions

---

## 1. Create Microsoft Entra ID App Registration

### A. Register the Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** → **App registrations**
3. Click **+ New registration**
4. Configure:
   - **Name**: `DTV Volunteer Tracker` (or your preferred name)
   - **Supported account types**: Single tenant (this directory only)
   - **Redirect URI**: Leave blank (not needed for client credentials flow)
5. Click **Register**

### B. Note the Application Details

After registration, copy these values (you'll need them for the `.env` file):

- **Application (client) ID** - Found on the Overview page
- **Directory (tenant) ID** - Found on the Overview page

**Example values**:
```
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

### C. Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Configure:
   - **Description**: `Production Secret` or `Dev Secret`
   - **Expires**: Choose appropriate expiration (recommended: 24 months)
4. Click **Add**
5. **⚠️ CRITICAL**: Copy the secret **Value** immediately
   - This is shown only once and cannot be retrieved later
   - Store securely in password manager or key vault
   - This becomes `SHAREPOINT_CLIENT_SECRET` in `.env`

**Security notes**:
- Never commit the client secret to version control
- Rotate secrets before expiration
- Use different secrets for dev/staging/production if possible
- Limit secret sharing to authorized personnel only

---

## 2. Grant SharePoint API Permissions

### A. Add API Permission

1. In your app registration, go to **API permissions**
2. Click **+ Add a permission**
3. Select **SharePoint** (not Microsoft Graph)
4. Select **Application permissions** (NOT Delegated permissions)
5. Find and check: **Sites.ReadWrite.All**
   - Description: "Have full control of all site collections"
   - Use `Sites.Read.All` if read-only access is sufficient
6. Click **Add permissions**

### B. Grant Admin Consent

**⚠️ Requires Global Administrator or Application Administrator role**

1. Still in the **API permissions** page
2. Click the button: **✓ Grant admin consent for [your organization]**
3. Confirm when prompted
4. Verify the **Status** column shows:
   - ✓ **Granted for [your organization]** (with green checkmark)
   - NOT "Not granted"

**If you don't have admin rights**:
- Contact your IT/Azure administrator
- Provide them with the Application (client) ID
- They can grant consent via PowerShell or Azure Portal

### C. Verify Permissions

Your API permissions table should look like this:

| API / Permission name | Type | Status |
|----------------------|------|--------|
| SharePoint / Sites.ReadWrite.All | Application | ✓ Granted for [your org] |

---

## 3. Grant SharePoint Site-Level Permissions

Even with API-level permissions, SharePoint requires explicit site-level access for app-only authentication.

### A. Navigate to App Permissions Page

1. Open your browser
2. Navigate to (replace with your site URL):
   ```
   https://dtvolunteers.sharepoint.com/sites/members/_layouts/15/appinv.aspx
   ```

**URL breakdown**:
- `dtvolunteers.sharepoint.com` - Your SharePoint tenant
- `/sites/members` - Your site collection path
- `/_layouts/15/appinv.aspx` - SharePoint app permissions page

### B. Grant Site Access

1. **App Id**: Paste your Application (client) ID from Entra ID
   ```
   xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

2. Click **Lookup**
   - App details should populate automatically
   - App Title, App Domain, and Redirect URL will auto-fill

3. **Permission Request XML**: Paste the following:
   ```xml
   <AppPermissionRequests AllowAppOnlyPolicy="true">
     <AppPermissionRequest Scope="http://sharepoint/content/sitecollection" Right="FullControl" />
   </AppPermissionRequests>
   ```

4. Click **Create**

5. Review the permission request dialog:
   - **App Title**: DTV Volunteer Tracker
   - **Permission**: Full Control
   - **Scope**: Site Collection

6. Click **Trust It**

### C. Verify Site Permissions

To verify the app has access:

1. Go to your SharePoint site
2. Click **Settings (⚙️)** → **Site permissions** → **Advanced permissions settings**
3. In the ribbon, click **App Permissions**
4. You should see your app listed with Full Control

**Alternative verification**:
```
https://dtvolunteers.sharepoint.com/sites/members/_layouts/15/appprincipals.aspx
```

### D. Permission Scopes Explained

| Scope | Description | Use Case |
|-------|-------------|----------|
| `http://sharepoint/content/sitecollection` | Current site collection only | Recommended - limits access to one site |
| `http://sharepoint/content/sitecollection/web` | Current web only | More restrictive - single subsite |
| `http://sharepoint/content/tenant` | All site collections in tenant | Avoid unless necessary |

| Right | Description |
|-------|-------------|
| `FullControl` | Read, write, delete all content |
| `Write` | Read and write content |
| `Read` | Read-only access |

**Recommendation**: Use the narrowest scope and rights needed. Start with site collection scope and FullControl, reduce if possible later.

---

## 4. Store Credentials Securely

### For Development

Create a `.env` file (git-ignored) with:

```bash
SHAREPOINT_SITE_URL=https://dtvolunteers.sharepoint.com/sites/members
SHAREPOINT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SHAREPOINT_CLIENT_SECRET=your_client_secret_value_here
SHAREPOINT_TENANT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

**Share credentials with developers via**:
- Secure password manager (1Password, LastPass, BitWarden)
- Encrypted communication channel
- Azure Key Vault references
- **Never via email, Slack, or version control**

### For Production

Use proper secret management:
- **Azure Key Vault** - Reference secrets via environment
- **GitHub Secrets** - For CI/CD pipelines
- **Environment variables** - Set on hosting platform (Azure App Service, etc.)

---

## 5. Verify Configuration

Test that everything works:

```bash
# In the project directory
node test-auth.js
```

**Expected output**:
```
Testing SharePoint authentication...

Configuration:
- Site URL: https://dtvolunteers.sharepoint.com/sites/members
- Tenant ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
- Client ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
- Client Secret: ***LcX8

Step 1: Getting access token...
✓ Access token obtained successfully
  Token preview: eyJ0eXAiOiJKV1QiLCJub25jZSI6...

Step 2: Fetching Groups from SharePoint...
✓ Success! Retrieved 3 group(s)

Sample group:
{
  "ID": 1,
  "Title": "Tree Planting Crew",
  "Name": "tree-crew",
  ...
}
```

**If you see errors**, see Troubleshooting section below.

---

## 6. Ongoing Maintenance

### Client Secret Expiration

**Before secrets expire**:
1. Create a new client secret in Entra ID (step 1C above)
2. Update `.env` files or secret management system
3. Test with new secret
4. Delete old secret after confirming new one works

**Set calendar reminder** for 1 month before expiration.

### Permission Changes

If you need to modify permissions:
1. Update in Entra ID API permissions
2. Re-grant admin consent
3. May need to re-grant site-level permissions in SharePoint

### Adding Additional Sites

To grant access to more SharePoint sites:
1. Navigate to the new site's `/_layouts/15/appinv.aspx`
2. Repeat step 3 (Grant SharePoint Site-Level Permissions)

---

## Troubleshooting

### "401 Unauthorized" after granting permissions

**Cause**: Permissions not yet propagated

**Solution**: Wait 5-10 minutes and try again. Azure/SharePoint permissions can take time to propagate.

### "Unsupported app only token"

**Cause**: Site-level permissions not granted (Step 3)

**Solution**: Complete step 3 above using `/_layouts/15/appinv.aspx`

### "Invalid client secret"

**Causes**:
- Secret copied incorrectly (copied Secret ID instead of Value)
- Secret expired
- Extra spaces when copying

**Solution**:
- Create new client secret
- Copy the **Value** field carefully
- Use password manager to avoid copy/paste issues

### "AADSTS7000215: Invalid client secret provided"

**Cause**: Client secret is wrong or expired

**Solution**: Generate a new client secret in Entra ID

### Cannot access appinv.aspx page

**Cause**: Insufficient SharePoint permissions

**Solution**: Must be Site Collection Administrator or SharePoint Administrator

### App not appearing in appprincipals.aspx

**Cause**: Site-level permissions not granted or not propagated yet

**Solution**:
1. Complete step 3B again
2. Wait 5 minutes
3. Refresh appprincipals.aspx page

---

## Security Best Practices

1. ✅ **Use separate apps for dev/staging/prod** - Different client IDs and secrets per environment
2. ✅ **Rotate secrets regularly** - Every 6-12 months or per your security policy
3. ✅ **Limit permission scope** - Use site collection scope, not tenant-wide
4. ✅ **Monitor usage** - Review Entra ID sign-in logs periodically
5. ✅ **Principle of least privilege** - Start with read-only, add write permissions only when needed
6. ✅ **Document who has access** - Maintain list of developers with credentials
7. ✅ **Revoke on departure** - Rotate secrets when team members leave
8. ✅ **Enable audit logging** - Track SharePoint API calls if compliance requires it

---

## Reference Links

- [Microsoft Entra ID App Registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps)
- [SharePoint App-Only Authentication](https://learn.microsoft.com/en-us/sharepoint/dev/solution-guidance/security-apponly-azuread)
- [Grant Access Using AppInv](https://learn.microsoft.com/en-us/sharepoint/dev/solution-guidance/security-apponly-azureacs)

---

## Support

For issues with this setup:
1. Check troubleshooting section above
2. Review [../docs/progress.md](progress.md) for known issues
3. Verify all steps were completed in order
4. Contact your Azure/SharePoint administrator

---

*Last Updated: 2026-02-06*
*Maintained by: [Add admin contact]*
