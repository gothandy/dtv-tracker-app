<#
.SYNOPSIS
    Gives the slot's app registration its own site, and only that site.

.DESCRIPTION
    A restored site keeps the live site's permissions, so the Production registration
    can reach the copy, and the slot's registration may still reach the live site.
    This script sorts that out. For the slot 'Preview':

      1. DTV Tracker (Preview) gets 'write' on /sites/tracker-preview.
      2. Every other app is removed from /sites/tracker-preview (e.g. Production).
      3. DTV Tracker (Preview) is removed from the live site, /sites/tracker.

    It shows what it will do and asks before changing anything, then lists the apps
    on both sites. Running it again is safe. As a guard, the registration's name must
    end with the slot in brackets, e.g. "DTV Tracker (Preview)", so the Production
    registration can't be passed by mistake.

    You need to be a SharePoint or Global admin. It uses the Microsoft Graph module,
    like ../grant-site-access.ps1; the first time, install it with:
        Install-Module Microsoft.Graph.Sites, Microsoft.Graph.Applications -Scope CurrentUser

    See README.md in this folder.

.PARAMETER Slot
    The slot, as named, e.g. Preview. The site is tracker-{slot in lower case}.

.PARAMETER ClientId
    The slot's app registration's Application (client) ID, as in that slot's ENTRA_CLIENT_ID.

.EXAMPLE
    ./set-app-access.ps1 -Slot Preview -ClientId 00000000-0000-0000-0000-000000000000
#>

param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9-]+$')]
    [string] $Slot,

    [Parameter(Mandatory)]
    [string] $ClientId
)

$ErrorActionPreference = 'Stop'

$LiveSiteUrl = 'https://dtvolunteers.sharepoint.com/sites/tracker'
$SlotSiteUrl = "https://dtvolunteers.sharepoint.com/sites/tracker-$($Slot.ToLower())"

Connect-MgGraph -Scopes 'Sites.FullControl.All', 'Application.Read.All' -NoWelcome

$app = Get-MgServicePrincipal -Filter "appId eq '$ClientId'"
if (-not $app) {
    throw "No app registration with client ID $ClientId in this tenant."
}
if (-not $app.DisplayName.EndsWith("($Slot)")) {
    throw "'$($app.DisplayName)' isn't the $Slot registration (its name should end with '($Slot)'). Nothing changed."
}

function Get-SiteByUrl($url) {
    $uri = [uri]$url
    Get-MgSite -SiteId "$($uri.Host):$($uri.AbsolutePath)"
}

# Graph returns the app under either the older or newer property name, so check both.
function Get-GrantedApps($permission) {
    @($permission.GrantedToIdentitiesV2.Application) + @($permission.GrantedToIdentities.Application) |
        Where-Object { $_.Id } | Sort-Object Id -Unique
}

# Every app permission on a site, with the apps it covers.
function Get-AppPermissions($site) {
    Get-MgSitePermission -SiteId $site.Id -All | ForEach-Object {
        $permission = Get-MgSitePermission -SiteId $site.Id -PermissionId $_.Id
        [pscustomobject]@{ Permission = $permission; Apps = @(Get-GrantedApps $permission) }
    }
}

function Show-Apps($site) {
    Write-Host "Apps with access to $($site.WebUrl):"
    $any = $false
    foreach ($entry in Get-AppPermissions $site) {
        foreach ($grantedApp in $entry.Apps) {
            '  {0,-40} {1,-38} {2}' -f $grantedApp.DisplayName, $grantedApp.Id, ($entry.Permission.Roles -join ', ')
            $any = $true
        }
    }
    if (-not $any) { Write-Host '  (none)' }
    Write-Host ''
}

$liveSite = Get-SiteByUrl $LiveSiteUrl
$slotSite = Get-SiteByUrl $SlotSiteUrl

$slotPermissions = @(Get-AppPermissions $slotSite)
$ownOnSlot = $slotPermissions | Where-Object { $_.Apps.Id -contains $ClientId }
$othersOnSlot = $slotPermissions | Where-Object { $_.Apps.Id -notcontains $ClientId }
$ownOnLive = @(Get-AppPermissions $liveSite) | Where-Object { $_.Apps.Id -contains $ClientId }

Write-Host "App:  $($app.DisplayName) ($ClientId)"
Write-Host "Site: $($slotSite.DisplayName) ($($slotSite.WebUrl))"
Write-Host ''
Write-Host 'Before:'
Show-Apps $slotSite
Show-Apps $liveSite

Write-Host 'Changes:'
if ($ownOnSlot) {
    Write-Host "  - replace $($app.DisplayName)'s access to $($slotSite.WebUrl) with 'write' under its current name"
} else {
    Write-Host "  - give $($app.DisplayName) 'write' on $($slotSite.WebUrl)"
}
foreach ($entry in $othersOnSlot) {
    Write-Host "  - remove $(($entry.Apps.DisplayName) -join ', ') from $($slotSite.WebUrl)"
}
if ($ownOnLive) {
    Write-Host "  - remove $($app.DisplayName) from $($liveSite.WebUrl)"
}
Write-Host ''

$answer = Read-Host 'Make these changes? (y/n)'
if ($answer -ne 'y') {
    Write-Host 'Nothing changed.'
    Disconnect-MgGraph | Out-Null
    return
}

# 1. The slot's registration gets its own site. An existing grant is replaced rather
#    than updated: a grant keeps the app's name from when it was made (a restored site
#    has the live site's grants), so recreating it shows the registration's current name.
foreach ($entry in $ownOnSlot) {
    Remove-MgSitePermission -SiteId $slotSite.Id -PermissionId $entry.Permission.Id
}
New-MgSitePermission -SiteId $slotSite.Id -BodyParameter @{
    roles               = @('write')
    grantedToIdentities = @(@{ application = @{ id = $ClientId; displayName = $app.DisplayName } })
} | Out-Null

# 2. No other app on the slot's site.
foreach ($entry in $othersOnSlot) {
    Remove-MgSitePermission -SiteId $slotSite.Id -PermissionId $entry.Permission.Id
}

# 3. The slot's registration off the live site.
foreach ($entry in $ownOnLive) {
    Remove-MgSitePermission -SiteId $liveSite.Id -PermissionId $entry.Permission.Id
}

Write-Host ''
Write-Host 'After:'
Show-Apps $slotSite
Show-Apps $liveSite

Disconnect-MgGraph | Out-Null
