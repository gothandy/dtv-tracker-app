<#
.SYNOPSIS
    Read-only report: does everything that can reach the tracker match docs/access.md?

.DESCRIPTION
    Checks the real tenant against the expectations below (which mirror
    docs/access.md) and marks each line:

      OK          as expected
      MISSING     expected but not there
      UNEXPECTED  there but not expected: a door to close, or a change to record
      CHECK       not wrong in itself, but look at it

    It covers:
      1. Each tracker identity: application and delegated permissions, owners,
         keys and secrets, and whether it's switched on.
      2. The tracker sites: which apps have a grant on each.
      3. The whole tenant: anything holding broad permissions (mail, all sites,
         all files, directory or app management).
      4. Exchange: which mailboxes each identity can send as, any other app with
         an Exchange application role, and the slot mailbox lockdown (recipient
         limit, mail flow rule, test list).
      5. With -Azure: Azure roles on the tracker's resources, and GitHub's
         federated logins.

    It changes nothing. When access changes on purpose, update docs/access.md
    and the expectations below in the same PR.

    Sign in as a Global admin. Reading site permissions needs SharePoint admin
    rights, so the Graph sign-in asks for Sites.FullControl.All; the script only
    reads. Needs the Microsoft Graph and ExchangeOnlineManagement modules (Cloud
    Shell has both, plus Az for -Azure). On your own machine:
        Install-Module Microsoft.Graph.Applications, Microsoft.Graph.Sites, Microsoft.Graph.Users,
            Microsoft.Graph.Identity.SignIns, ExchangeOnlineManagement -Scope CurrentUser
    On Windows PowerShell, use a fresh window: Graph fails to load if Exchange
    was connected first.

    With -OutFile it also writes a JSON summary to commit to the repository, so
    any change in access shows up as a diff. The repository is public, so the
    JSON holds only what docs/access.md already says: statuses, counts, and
    items that match the record. IDs, people's and other apps' names, list
    members, secret names, and the details of anything MISSING or UNEXPECTED
    beyond what the record names stay on the screen only. Commit it when the
    report has no MISSING or UNEXPECTED.

    See docs/access.md.

.PARAMETER Azure
    Also check Azure role assignments and GitHub's federated logins (needs the Az module).

.PARAMETER OutFile
    Also write the public JSON summary here, e.g. docs/access-report.json.

.EXAMPLE
    ./scripts/access-report.ps1

.EXAMPLE
    ./scripts/access-report.ps1 -Azure -OutFile docs/access-report.json
#>

param(
    [switch] $Azure,

    [string] $OutFile
)

$ErrorActionPreference = 'Stop'

# ── Expected access (mirror of docs/access.md) ──────────────────────────────

$Domain = 'deantrailvolunteers.org.uk'

# Application permissions as 'API/Permission'. Delegated as scopes; openid,
# profile and offline_access come with Microsoft sign-in and are allowed anywhere.
$Identities = @(
    @{
        Name        = 'DTV Tracker (Production)'
        Kind        = 'App registration'
        Application = @('Microsoft Graph/Sites.Selected', 'Microsoft Graph/TermStore.Read.All')
        Delegated   = @('User.Read', 'email')
        # Both allowed while production moves from admin@ to tracker@; drop admin@ once it has.
        Mailboxes   = @("admin@$Domain", "tracker@$Domain")
        SpOwners    = $null   # not checked
    },
    @{
        Name        = 'DTV Tracker (Preview)'
        Kind        = 'App registration'
        Application = @('Microsoft Graph/Sites.Selected', 'Microsoft Graph/TermStore.Read.All')
        Delegated   = @('User.Read', 'email')
        Mailboxes   = @("preview.tracker@$Domain")
        SpOwners    = @('TrackerPreviewDeactivate')
    },
    @{
        Name        = 'TrackerPreviewDeactivate'
        Kind        = 'Managed identity'
        Application = @('Microsoft Graph/Application.ReadWrite.OwnedBy')
        Delegated   = @()
        Mailboxes   = @()
        SpOwners    = $null
    },
    @{
        Name        = 'oidc-msi-ad79'
        Kind        = 'Managed identity'
        Application = @()
        Delegated   = @()
        Mailboxes   = @()
        SpOwners    = $null
    }
)

# Each tracker site and the one app that should have a grant on it.
$Sites = [ordered]@{
    'https://dtvolunteers.sharepoint.com/sites/tracker'         = @{ App = 'DTV Tracker (Production)'; Role = 'write' }
    'https://dtvolunteers.sharepoint.com/sites/tracker-preview' = @{ App = 'DTV Tracker (Preview)'; Role = 'write' }
}

# Shared mailboxes (sign-in should be blocked), and slot mailboxes with their mail flow rule.
$SharedMailboxes = @("tracker@$Domain", "preview.tracker@$Domain")
$SlotMailboxes = [ordered]@{ "preview.tracker@$Domain" = 'Tracker (Preview) Restriction' }
$TestList = "test.tracker@$Domain"

# Broad application permissions: anything holding these is listed.
$BroadPermissions = @(
    'Mail.Send', 'Mail.Read', 'Mail.ReadWrite', 'MailboxSettings.ReadWrite',
    'Sites.Read.All', 'Sites.ReadWrite.All', 'Sites.Manage.All', 'Sites.FullControl.All',
    'Files.Read.All', 'Files.ReadWrite.All',
    'Application.ReadWrite.All', 'AppRoleAssignment.ReadWrite.All',
    'Directory.ReadWrite.All', 'Group.ReadWrite.All', 'User.ReadWrite.All',
    'RoleManagement.ReadWrite.Directory', 'TermStore.ReadWrite.All'
)

# Broad permissions that are known and justified, as 'App name|API/Permission'. Record why in docs/access.md.
$KnownBroad = @()

# Azure (-Azure): the web app, its resource group, and GitHub's deploy identity.
$AzureResourceGroup = 'DTV'
$AzureWebApp = 'DTVTrackerApp'
$GitHubSubjects = @(
    'repo:gothandy/dtv-tracker-app:ref:refs/heads/main',
    'repo:gothandy/dtv-tracker-app:environment:preview'
)

$SignInScopes = @('openid', 'profile', 'offline_access')
$GraphAppId = '00000003-0000-0000-c000-000000000000'
$SharePointAppId = '00000003-0000-0ff1-ce00-000000000000'

# ── Output ──────────────────────────────────────────────────────────────────

$script:Problems = 0
$script:Section = ''
$script:Subject = ''
$script:Results = New-Object System.Collections.ArrayList

function Write-Section([string] $Title) {
    Write-Host ''
    Write-Host "== $Title ==" -ForegroundColor Cyan
    $script:Section = $Title
    $script:Subject = ''
}

function Set-Subject([string] $Name) {
    Write-Host ''
    Write-Host $Name
    $script:Subject = $Name
}

# $Public is what may go in the public JSON; leave it out and only the status is recorded.
function Write-Result([string] $Status, [string] $Text, [string] $Public = '') {
    $colour = switch ($Status) {
        'OK'         { 'Green' }
        'CHECK'      { 'Yellow' }
        'INFO'       { 'Gray' }
        default      { 'Red' }
    }
    if ($Status -in @('MISSING', 'UNEXPECTED')) { $script:Problems++ }
    Write-Host ('  {0,-10} {1}' -f $Status, $Text) -ForegroundColor $colour
    if ($Status -ne 'INFO') {
        [void] $script:Results.Add([pscustomobject]@{
            Section = $script:Section; Subject = $script:Subject; Status = $Status; Public = $Public
        })
    }
}

# Compare what's there with what's expected (and what's merely allowed).
function Compare-Sets([string] $What, [string[]] $Actual, [string[]] $Expected, [string[]] $Allowed = @()) {
    foreach ($item in ($Actual | Sort-Object -Unique)) {
        if ($Expected -contains $item -or $Allowed -contains $item) { Write-Result 'OK' "$What $item" "$What $item" }
        else { Write-Result 'UNEXPECTED' "$What $item" }
    }
    foreach ($item in $Expected) {
        if ($Actual -notcontains $item) { Write-Result 'MISSING' "$What $item" "$What $item" }
    }
    if (-not $Actual -and -not $Expected) { Write-Result 'OK' "$What (none)" "$What (none)" }
}

# ── Graph ───────────────────────────────────────────────────────────────────

# Stay signed in between runs: reuse an existing connection rather than asking again.
$GraphScopes = @('Application.Read.All', 'Directory.Read.All', 'Sites.FullControl.All')
$context = Get-MgContext
if (-not $context -or @($GraphScopes | Where-Object { $context.Scopes -notcontains $_ }).Count -gt 0) {
    Connect-MgGraph -Scopes $GraphScopes -NoWelcome
}

$resourceCache = @{}
function Get-RoleName([string] $ResourceId, [string] $AppRoleId) {
    if (-not $resourceCache.ContainsKey($ResourceId)) {
        $resourceCache[$ResourceId] = Get-MgServicePrincipal -ServicePrincipalId $ResourceId -Property 'id,displayName,appRoles'
    }
    $resource = $resourceCache[$ResourceId]
    $role = $resource.AppRoles | Where-Object Id -eq $AppRoleId
    $value = if ($role) { $role.Value } else { $AppRoleId }
    "$($resource.DisplayName)/$value"
}

$found = @{}   # identity name -> service principal

Write-Section '1. Tracker identities'
foreach ($identity in $Identities) {
    Set-Subject $identity.Name

    $sp = @(Get-MgServicePrincipal -Filter "displayName eq '$($identity.Name)'" -All -Property 'id,appId,displayName,accountEnabled,servicePrincipalType,passwordCredentials,keyCredentials')
    if ($sp.Count -eq 0) { Write-Result 'MISSING' 'not found in Entra' 'not found in Entra'; continue }
    if ($sp.Count -gt 1) { Write-Result 'UNEXPECTED' "$($sp.Count) apps share this name: only the first is checked" }
    $sp = $sp[0]
    $found[$identity.Name] = $sp
    Write-Result 'INFO' "client ID $($sp.AppId), object ID $($sp.Id), switched $(if ($sp.AccountEnabled) { 'on' } else { 'off' })"

    # Application permissions.
    $application = @(Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $sp.Id -All |
        ForEach-Object { Get-RoleName $_.ResourceId $_.AppRoleId })
    Compare-Sets 'application permission' $application $identity.Application

    # Delegated permissions (admin consent).
    $delegated = @(Get-MgOauth2PermissionGrant -Filter "clientId eq '$($sp.Id)'" -All |
        ForEach-Object { $_.Scope -split ' ' } | Where-Object { $_ })
    Compare-Sets 'delegated permission' $delegated $identity.Delegated $SignInScopes

    # Keys on the enterprise app itself: unusual, and a way to act as the app.
    # (A managed identity always has one certificate, which Azure manages and rotates.)
    if ($sp.ServicePrincipalType -ne 'ManagedIdentity') {
        foreach ($key in (@($sp.PasswordCredentials) + @($sp.KeyCredentials) | Where-Object { $_ })) {
            Write-Result 'UNEXPECTED' "key on the enterprise app: '$($key.DisplayName)', ends $($key.EndDateTime)"
        }
    }

    # Owners of the enterprise app.
    $spOwners = @(Get-MgServicePrincipalOwner -ServicePrincipalId $sp.Id -All |
        ForEach-Object { $_.AdditionalProperties.displayName })
    if ($null -ne $identity.SpOwners) {
        Compare-Sets 'enterprise app owner' $spOwners $identity.SpOwners
    } else {
        foreach ($owner in $spOwners) { Write-Result 'CHECK' "enterprise app owner $owner" }
    }

    # App registration: owners can add secrets, so list them; secrets and federated logins.
    if ($identity.Kind -eq 'App registration') {
        $app = Get-MgApplication -Filter "appId eq '$($sp.AppId)'" -Property 'id,passwordCredentials,keyCredentials'
        foreach ($owner in @(Get-MgApplicationOwner -ApplicationId $app.Id -All)) {
            Write-Result 'CHECK' "app registration owner $($owner.AdditionalProperties.displayName) (owners can add secrets)"
        }
        $now = Get-Date
        $secrets = @(@($app.PasswordCredentials) + @($app.KeyCredentials) | Where-Object { $_ })
        $current = @($secrets | Where-Object { $_.EndDateTime -gt $now })
        foreach ($secret in $secrets) {
            $label = "secret '$($secret.DisplayName)' ends $($secret.EndDateTime.ToString('yyyy-MM-dd'))"
            if ($secret.EndDateTime -le $now) { Write-Result 'UNEXPECTED' "${label}: expired, delete it" }
            elseif ($secret.EndDateTime -le $now.AddDays(30)) { Write-Result 'CHECK' "${label}: renew soon (setup section 5)" 'a secret ends within 30 days' }
            else { Write-Result 'OK' $label 'current secret' }
        }
        if ($current.Count -eq 0) { Write-Result 'MISSING' 'no current secret' 'current secret' }
        if ($current.Count -gt 1) { Write-Result 'CHECK' "$($current.Count) current secrets: delete the old one once the new one is in use" 'more than one current secret' }
        foreach ($federated in @(Get-MgApplicationFederatedIdentityCredential -ApplicationId $app.Id -All)) {
            Write-Result 'UNEXPECTED' "federated login '$($federated.Name)' ($($federated.Subject))"
        }
    }
}

Write-Section '2. Tracker sites'
function Get-GrantedApps($Permission) {
    @($Permission.grantedToIdentitiesV2 | ForEach-Object { $_.application }) +
    @($Permission.grantedToIdentities | ForEach-Object { $_.application }) |
        Where-Object { $_ -and $_.id } | Sort-Object { $_.id } -Unique
}
foreach ($siteUrl in $Sites.Keys) {
    $expected = $Sites[$siteUrl]
    $expectedAppId = if ($found[$expected.App]) { $found[$expected.App].AppId } else { $null }
    Set-Subject $siteUrl
    $uri = [uri]$siteUrl
    try {
        $site = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/sites/$($uri.Host):$($uri.AbsolutePath)?`$select=id"
    } catch {
        Write-Result 'MISSING' "site not found: $($_.Exception.Message)" 'site'
        continue
    }
    $list = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/sites/$($site.id)/permissions"
    $grants = @(foreach ($item in $list.value) {
        $permission = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/sites/$($site.id)/permissions/$($item.id)"
        foreach ($grantedApp in Get-GrantedApps $permission) {
            [pscustomobject]@{ Id = $grantedApp.id; Name = $grantedApp.displayName; Roles = (@($permission.roles) -join ', ') }
        }
    })
    foreach ($grant in $grants) {
        if ($grant.Id -eq $expectedAppId -and $grant.Roles -eq $expected.Role) { Write-Result 'OK' "$($grant.Name): $($grant.Roles)" "$($expected.App): $($expected.Role)" }
        else { Write-Result 'UNEXPECTED' "$($grant.Name) ($($grant.Id)): $($grant.Roles)" }
    }
    if (-not ($grants | Where-Object Id -eq $expectedAppId)) { Write-Result 'MISSING' "$($expected.App): $($expected.Role)" "$($expected.App): $($expected.Role)" }
}

Write-Section '3. Broad permissions anywhere in the tenant'
$trackerIds = @($found.Values | ForEach-Object { $_.Id })
$tenantId = (Get-MgContext).TenantId
$MicrosoftTenants = @('f8cdef31-a31e-4b4a-93e4-5f571e91255a', '72f988bf-86f1-41af-91ab-2d7cd011db47')
$ownerCache = @{}
function Get-AppOwnerKind([string] $ServicePrincipalId) {
    if (-not $ownerCache.ContainsKey($ServicePrincipalId)) {
        $principal = Get-MgServicePrincipal -ServicePrincipalId $ServicePrincipalId -Property 'appId,appOwnerOrganizationId,servicePrincipalType,accountEnabled'
        # Two switches: the enterprise app's "Enabled for users to sign in?" (accountEnabled),
        # and the app registration's "Deactivate" (isDisabled, beta API only).
        $deactivated = $false
        if ($principal.AppOwnerOrganizationId -eq $tenantId -and $principal.ServicePrincipalType -ne 'ManagedIdentity') {
            $registration = (Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/beta/applications?`$filter=appId eq '$($principal.AppId)'&`$select=isDisabled").value
            $deactivated = [bool] ($registration | Where-Object { $_.isDisabled })
        }
        $kind = if (-not $principal.AccountEnabled -or $deactivated) { 'switched-off' }
            elseif ($principal.ServicePrincipalType -eq 'ManagedIdentity') { 'own' }
            elseif ($principal.AppOwnerOrganizationId -eq $tenantId) { 'own' }
            elseif ($MicrosoftTenants -contains $principal.AppOwnerOrganizationId) { 'Microsoft' }
            else { 'another organisation' }
        $ownerCache[$ServicePrincipalId] = $kind
    }
    $ownerCache[$ServicePrincipalId]
}
$broadFound = $false
foreach ($apiAppId in @($GraphAppId, $SharePointAppId)) {
    $api = Get-MgServicePrincipal -Filter "appId eq '$apiAppId'" -Property 'id,displayName,appRoles'
    if (-not $api) { continue }
    $resourceCache[$api.Id] = $api
    Get-MgServicePrincipalAppRoleAssignedTo -ServicePrincipalId $api.Id -All | ForEach-Object {
        $role = $api.AppRoles | Where-Object Id -eq $_.AppRoleId
        if ($role -and $BroadPermissions -contains $role.Value) {
            $broadFound = $true
            $kind = Get-AppOwnerKind $_.PrincipalId
            $permissionName = "$($api.DisplayName)/$($role.Value)"
            $text = "$($_.PrincipalDisplayName) ($kind app) has $permissionName"
            if ($trackerIds -contains $_.PrincipalId) { Write-Result 'UNEXPECTED' $text }
            elseif ($KnownBroad -contains "$($_.PrincipalDisplayName)|$permissionName") { Write-Result 'OK' $text }
            elseif ($kind -eq 'switched-off') { Write-Result 'CHECK' "${text}: switched off, so it can't use it; delete the app, or remove the permission" 'a switched-off app still holds a broad permission' }
            elseif ($kind -eq 'own') { Write-Result 'UNEXPECTED' "${text}: this organisation's own app; remove it, or record why in docs/access.md and `$KnownBroad" }
            else { Write-Result 'CHECK' "${text}: is it still used?" }
        }
    }
}
if (-not $broadFound) { Write-Result 'OK' 'nothing holds a broad application permission' 'nothing holds a broad application permission' }

# ── Exchange ────────────────────────────────────────────────────────────────

if (-not (Get-ConnectionInformation | Where-Object State -eq 'Connected')) {
    Connect-ExchangeOnline -ShowBanner:$false
}

Write-Section '4. Exchange'

Set-Subject 'Shared mailboxes'
foreach ($mailbox in $SharedMailboxes) {
    $box = Get-Mailbox -Identity $mailbox -ErrorAction SilentlyContinue
    if (-not $box) { Write-Result 'MISSING' "$mailbox not found" "$mailbox"; continue }
    if ($box.RecipientTypeDetails -ne 'SharedMailbox') {
        Write-Result 'UNEXPECTED' "$mailbox is a $($box.RecipientTypeDetails), not a shared mailbox"
        continue
    }
    try {
        $user = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/users/$($box.ExternalDirectoryObjectId)?`$select=accountEnabled"
    } catch {
        Write-Result 'CHECK' "${mailbox}: couldn't read its account ($($_.Exception.Message))"
        continue
    }
    if ($user.accountEnabled) { Write-Result 'UNEXPECTED' "$mailbox can be signed in to: block sign-in" }
    else { Write-Result 'OK' "$mailbox shared, sign-in blocked" "$mailbox shared, sign-in blocked" }
}

function Get-ScopeMailbox([string] $ScopeName) {
    $scope = Get-ManagementScope -Identity $ScopeName -ErrorAction SilentlyContinue
    if ($scope -and $scope.RecipientFilter -match "'([^']+)'") { $Matches[1].ToLower() } else { "(scope $ScopeName)" }
}

foreach ($identity in $Identities) {
    $sp = $found[$identity.Name]
    if (-not $sp) { continue }
    $mailboxes = @(Get-ManagementRoleAssignment -RoleAssignee $sp.Id -Role 'Application Mail.Send' -ErrorAction SilentlyContinue |
        ForEach-Object { Get-ScopeMailbox $_.CustomResourceScope })
    if ($mailboxes -or $identity.Mailboxes) {
        Set-Subject "$($identity.Name) can send as"
        # For Production, each allowed mailbox is fine but at least one must be there.
        if ($identity.Name -eq 'DTV Tracker (Production)') {
            Compare-Sets 'mailbox' $mailboxes @() $identity.Mailboxes
            if (-not $mailboxes) { Write-Result 'MISSING' 'no mailbox: production cannot send email' 'a mailbox to send as' }
        } else {
            Compare-Sets 'mailbox' $mailboxes $identity.Mailboxes
        }
    }
}

Set-Subject 'Every Exchange application role in the tenant'
$trackerNames = @($found.Values | ForEach-Object { $_.Id; $_.AppId; $_.DisplayName })
$appAssignments = @(Get-ManagementRoleAssignment | Where-Object {
    $_.Role -like 'Application *' -and $_.RoleAssignmentDelegationType -eq 'Regular' -and $_.RoleAssigneeType -ne 'RoleGroup'
})
foreach ($assignment in $appAssignments) {
    $mailbox = if ($assignment.CustomResourceScope) { Get-ScopeMailbox $assignment.CustomResourceScope } else { 'the whole organisation' }
    $assignee = $assignment.RoleAssigneeName
    $named = $found.Values | Where-Object { $_.Id -eq $assignee -or $_.AppId -eq $assignee }
    if ($named) { $assignee = $named[0].DisplayName }
    $text = "${assignee}: $($assignment.Role) for $mailbox"
    if ($trackerNames -contains $assignment.RoleAssigneeName) {
        if ($assignment.CustomResourceScope) { Write-Result 'OK' $text "tracker: $($assignment.Role) for $mailbox" } else { Write-Result 'UNEXPECTED' $text }
    } else {
        Write-Result 'CHECK' $text
    }
}
if (-not $appAssignments) { Write-Result 'MISSING' 'none: no app can send email' 'a tracker send role' }

foreach ($mailbox in $SlotMailboxes.Keys) {
    Set-Subject "Slot mailbox $mailbox"
    $box = Get-Mailbox -Identity $mailbox -ErrorAction SilentlyContinue
    if (-not $box) { Write-Result 'MISSING' 'mailbox not found' 'mailbox'; continue }
    if ($box.RecipientLimits -eq 1) { Write-Result 'OK' 'one recipient per message' 'one recipient per message' }
    else { Write-Result 'UNEXPECTED' "recipient limit is $($box.RecipientLimits), should be 1" }
    if ($box.HiddenFromAddressListsEnabled) { Write-Result 'OK' 'hidden from the address book' 'hidden from the address book' }
    else { Write-Result 'CHECK' 'shown in the address book' 'shown in the address book' }

    $ruleName = $SlotMailboxes[$mailbox]
    $rule = Get-TransportRule -Identity $ruleName -ErrorAction SilentlyContinue
    if (-not $rule) { Write-Result 'MISSING' "mail flow rule '$ruleName'" "mail flow rule '$ruleName'"; continue }
    if ($rule.State -eq 'Enabled' -and $rule.Mode -eq 'Enforce') { Write-Result 'OK' "rule '$ruleName' is on and enforced" "rule '$ruleName' is on and enforced" }
    else { Write-Result 'UNEXPECTED' "rule '$ruleName' is $($rule.State), mode $($rule.Mode)" }
    if (($rule.From -join ' ') -match [regex]::Escape($mailbox.Split('@')[0])) { Write-Result 'OK' 'rule applies to this mailbox' 'rule applies to this mailbox' }
    else { Write-Result 'UNEXPECTED' "rule applies to: $($rule.From -join ', ')" }
    if ($rule.RejectMessageReasonText) { Write-Result 'OK' 'rule rejects the message' 'rule rejects the message' }
    else { Write-Result 'UNEXPECTED' 'rule does not reject the message' }
    $exceptions = @($rule.ExceptIfSentToMemberOf)
    if ($exceptions.Count -eq 1 -and ($exceptions[0] -match 'test\.tracker' -or $exceptions[0] -match [regex]::Escape($TestList))) {
        Write-Result 'OK' "only $TestList is let through" "only $TestList is let through"
    } else {
        Write-Result 'UNEXPECTED' "let through: $($exceptions -join ', ')"
    }
}

Set-Subject "Test list $TestList"
$list = Get-DistributionGroup -Identity $TestList -ErrorAction SilentlyContinue
if (-not $list) {
    Write-Result 'MISSING' 'distribution list not found' 'distribution list'
} else {
    if ($list.HiddenFromAddressListsEnabled) { Write-Result 'OK' 'hidden from the address book' 'hidden from the address book' }
    else { Write-Result 'CHECK' 'shown in the address book' 'shown in the address book' }
    if ($list.RequireSenderAuthenticationEnabled) { Write-Result 'OK' 'outside senders blocked' 'outside senders blocked' }
    else { Write-Result 'UNEXPECTED' 'anyone outside can email it' }
    $members = @(Get-DistributionGroupMember -Identity $TestList -ResultSize Unlimited)
    $groups = @($members | Where-Object { $_.RecipientType -like '*Group*' })
    foreach ($group in $groups) { Write-Result 'UNEXPECTED' "group inside the list: $($group.Name) (reaches all its members)" }
    if (-not $groups) { Write-Result 'OK' 'no groups inside the list' 'no groups inside the list' }
    Write-Result 'INFO' "$($members.Count) members: $(($members | ForEach-Object { $_.PrimarySmtpAddress }) -join ', ')"
}

# ── Azure ───────────────────────────────────────────────────────────────────

if ($Azure) {
    Write-Section '5. Azure'
    if (-not (Get-Command Get-AzRoleAssignment -ErrorAction SilentlyContinue)) {
        Write-Result 'CHECK' 'Az module not available: run in Azure Cloud Shell' 'Az module not available'
    } else {
        if (-not (Get-AzContext)) { Connect-AzAccount | Out-Null }
        $webApp = Get-AzWebApp -ResourceGroupName $AzureResourceGroup -Name $AzureWebApp
        Set-Subject "Who can change $AzureWebApp (including from its resource group and subscription)"
        # The person running the report is expected to be an admin; anyone else with a role is the risk.
        # Matched by account ID from the Graph sign-in: Cloud Shell's Azure sign-in may name you differently.
        $me = Invoke-MgGraphRequest -Method GET -Uri 'https://graph.microsoft.com/v1.0/me?$select=id,userPrincipalName'
        Write-Result 'INFO' "running as $($me.userPrincipalName)"
        foreach ($assignment in Get-AzRoleAssignment -Scope $webApp.Id) {
            $where = if ($assignment.Scope -eq $webApp.Id) { 'the app' } elseif ($assignment.Scope -like '*/resourceGroups/*') { 'the resource group' } else { 'the subscription' }
            $text = "$($assignment.DisplayName) [$($assignment.ObjectType)]: $($assignment.RoleDefinitionName) on $where"
            if ($assignment.DisplayName -eq 'oidc-msi-ad79' -and $assignment.RoleDefinitionName -eq 'Website Contributor' -and $where -eq 'the app') {
                Write-Result 'OK' $text "oidc-msi-ad79: Website Contributor on $AzureWebApp"
            } elseif ($assignment.ObjectType -eq 'User' -and $assignment.ObjectId -eq $me.id) {
                Write-Result 'OK' "$text (you)" "the person running the report: $($assignment.RoleDefinitionName) on $where"
            } else {
                Write-Result 'UNEXPECTED' "${text}: someone or something other than you; remove it, or record why in docs/access.md"
            }
        }

        $deploy = Get-AzUserAssignedIdentity -ResourceGroupName (Get-AzUserAssignedIdentity | Where-Object Name -eq 'oidc-msi-ad79').ResourceGroupName -Name 'oidc-msi-ad79'
        Set-Subject 'oidc-msi-ad79 roles'
        foreach ($assignment in Get-AzRoleAssignment -ObjectId $deploy.PrincipalId) {
            $text = "$($assignment.RoleDefinitionName) on $($assignment.Scope)"
            if ($assignment.RoleDefinitionName -eq 'Website Contributor' -and $assignment.Scope -eq $webApp.Id) { Write-Result 'OK' $text "Website Contributor on $AzureWebApp" }
            else { Write-Result 'UNEXPECTED' $text }
        }
        Set-Subject 'GitHub logins oidc-msi-ad79 accepts'
        $subjects = @(Get-AzFederatedIdentityCredential -ResourceGroupName $deploy.ResourceGroupName -IdentityName $deploy.Name |
            ForEach-Object { $_.Subject })
        Compare-Sets 'federated login' $subjects $GitHubSubjects

        $deactivate = $found['TrackerPreviewDeactivate']
        if ($deactivate) {
            Set-Subject 'TrackerPreviewDeactivate Azure roles'
            $roles = @(Get-AzRoleAssignment -ObjectId $deactivate.Id | ForEach-Object { "$($_.RoleDefinitionName) on $($_.Scope)" })
            Compare-Sets 'role' $roles @()
        }
    }
}

# ── Summary ─────────────────────────────────────────────────────────────────

Write-Host ''
if ($script:Problems -eq 0) {
    Write-Host 'No MISSING or UNEXPECTED: access matches docs/access.md. Look over any CHECK lines.' -ForegroundColor Green
} else {
    Write-Host "$($script:Problems) MISSING or UNEXPECTED. Close the door, or record the change in docs/access.md and this script." -ForegroundColor Red
}

# ── Public JSON summary ─────────────────────────────────────────────────────

if ($OutFile) {
    $statuses = [ordered]@{ OK = 'ok'; CHECK = 'check'; MISSING = 'missing'; UNEXPECTED = 'unexpected' }
    $summary = [ordered]@{}
    foreach ($status in $statuses.Keys) {
        $summary[$statuses[$status]] = @($script:Results | Where-Object Status -eq $status).Count
    }
    $checks = New-Object System.Collections.ArrayList
    $groups = $script:Results | Group-Object { "$($_.Section)|$($_.Subject)" }
    foreach ($group in $groups) {
        $first = $group.Group[0]
        $entry = [ordered]@{ section = $first.Section }
        if ($first.Subject) { $entry['subject'] = $first.Subject }
        foreach ($status in $statuses.Keys) {
            $results = @($group.Group | Where-Object Status -eq $status)
            if ($results.Count -eq 0) { continue }
            $items = [string[]] @($results | Where-Object { $_.Public } | ForEach-Object { $_.Public } | Sort-Object -Unique)
            $entry[$statuses[$status]] = [ordered]@{ count = $results.Count; items = $items }
        }
        [void] $checks.Add($entry)
    }
    $report = [ordered]@{
        about   = 'Generated by scripts/access-report.ps1. Holds only what docs/access.md already says; see that page.'
        date    = (Get-Date -Format 'yyyy-MM-dd')
        azure   = [bool] $Azure
        summary = $summary
        checks  = $checks.ToArray()
    }
    $json = $report | ConvertTo-Json -Depth 8
    $path = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutFile)
    [System.IO.File]::WriteAllText($path, ($json -replace "`r`n", "`n") + "`n", (New-Object System.Text.UTF8Encoding $false))
    Write-Host "Wrote $OutFile."
    if ($script:Problems -gt 0) {
        Write-Host 'Fix the MISSING and UNEXPECTED lines before committing it.' -ForegroundColor Yellow
    }
}

# Left connected, so running it again doesn't ask you to sign in again. To sign out:
#   Disconnect-ExchangeOnline -Confirm:$false; Disconnect-MgGraph
