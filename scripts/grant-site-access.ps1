<#
.SYNOPSIS
    Gives an app registration access to one of the tracker's SharePoint sites.

.DESCRIPTION
    The tracker's app registration has the Graph permission Sites.Selected, which on
    its own gives access to no sites at all. This script grants it access to one
    site, then lists every app with access to that site so you can check the result.
    The site is required, so the live site is never granted by default; for a slot's
    site, use preview-site-from-backup/set-app-access.ps1 instead.

    Run it when you create a new app registration for the tracker, or move the
    tracker to a different site. Running it again is safe: an existing grant is
    updated, not duplicated.

    You need to be a SharePoint or Global admin. The first time, Microsoft asks you
    to consent to "Microsoft Graph Command Line Tools" using Sites.FullControl.All
    on your behalf; that's what lets it change site permissions. It only works
    while you're signed in, and only because you're an admin.

    Where to run it:
      - Azure Cloud Shell (PowerShell): the Microsoft Graph module is already there.
      - Your own PowerShell 7: first run
          Install-Module Microsoft.Graph.Sites, Microsoft.Graph.Applications -Scope CurrentUser

    See docs/sharepoint-setup.md, section 3.

.PARAMETER ClientId
    The app registration's Application (client) ID, as in TRACKER_ENTRA_CLIENT_ID.

.PARAMETER SiteUrl
    The SharePoint site, as in TRACKER_SHAREPOINT_SITE_URL, e.g. the live site
    https://dtvolunteers.sharepoint.com/sites/tracker

.PARAMETER Role
    'write' (default): what the tracker needs. 'read' for read-only access.

.EXAMPLE
    ./grant-site-access.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -SiteUrl https://dtvolunteers.sharepoint.com/sites/tracker
#>

param(
    [Parameter(Mandatory)]
    [string] $ClientId,

    [Parameter(Mandatory)]
    [string] $SiteUrl,

    [ValidateSet('read', 'write')]
    [string] $Role = 'write'
)

$ErrorActionPreference = 'Stop'

Connect-MgGraph -Scopes 'Sites.FullControl.All', 'Application.Read.All' -NoWelcome

# Look the app up first, so a mistyped ID stops here instead of granting nothing useful.
$app = Get-MgServicePrincipal -Filter "appId eq '$ClientId'"
if (-not $app) {
    throw "No app registration with client ID $ClientId in this tenant. Check TRACKER_ENTRA_CLIENT_ID, and that admin consent has been granted."
}

$uri = [uri]$SiteUrl
$site = Get-MgSite -SiteId "$($uri.Host):$($uri.AbsolutePath)"

Write-Host "App:  $($app.DisplayName) ($ClientId)"
Write-Host "Site: $($site.WebUrl)"
Write-Host "Role: $Role"
Write-Host ''

# Graph returns the app under either the older or newer property name, so check both.
function Get-GrantedApps($permission) {
    @($permission.GrantedToIdentitiesV2.Application) + @($permission.GrantedToIdentities.Application) |
        Where-Object { $_.Id } | Sort-Object Id -Unique
}

$existing = Get-MgSitePermission -SiteId $site.Id -All |
    Where-Object { (Get-GrantedApps $_).Id -contains $ClientId }

if ($existing) {
    Update-MgSitePermission -SiteId $site.Id -PermissionId $existing.Id -Roles @($Role) | Out-Null
    Write-Host "Updated the existing grant to '$Role'."
} else {
    New-MgSitePermission -SiteId $site.Id -BodyParameter @{
        roles               = @($Role)
        grantedToIdentities = @(@{ application = @{ id = $ClientId; displayName = $app.DisplayName } })
    } | Out-Null
    Write-Host "Granted '$Role'."
}

Write-Host ''
Write-Host 'Apps with access to this site:'
Get-MgSitePermission -SiteId $site.Id -All | ForEach-Object {
    $permission = Get-MgSitePermission -SiteId $site.Id -PermissionId $_.Id
    foreach ($grantedApp in Get-GrantedApps $permission) {
        '  {0,-40} {1,-38} {2}' -f $grantedApp.DisplayName, $grantedApp.Id, ($permission.Roles -join ', ')
    }
}

Disconnect-MgGraph | Out-Null
