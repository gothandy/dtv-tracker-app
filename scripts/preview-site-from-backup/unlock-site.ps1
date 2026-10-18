<#
.SYNOPSIS
    Removes the lock from a site restored from Microsoft 365 Backup.

.DESCRIPTION
    A site restored to a new URL starts locked (NoAdditions: nothing new can be added).
    The preview tracker needs to add items (bookings, check-in, records), so the lock
    has to come off. The admin centre has no button for this.

    The script shows the site and its lock state, unlocks it if needed, and shows the
    lock state again. Running it again is safe: an unlocked site is left as it is.
    It refuses to run against the live tracker site.

    You need to be a SharePoint or Global admin. It uses SharePoint's own PowerShell
    module; the first time, install it with:
        Install-Module Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser

    See README.md in this folder.

.PARAMETER SiteUrl
    The restored site, e.g. https://dtvolunteers.sharepoint.com/sites/TrackerR0

.EXAMPLE
    ./unlock-site.ps1 -SiteUrl https://dtvolunteers.sharepoint.com/sites/TrackerR0
#>

param(
    [Parameter(Mandatory)]
    [string] $SiteUrl
)

$ErrorActionPreference = 'Stop'
# Also stop on errors from SharePoint's module, however it's loaded.
$PSDefaultParameterValues['*:ErrorAction'] = 'Stop'

# PowerShell 7 doesn't load SharePoint's module by itself (README.md, "Before you start").
if ($PSVersionTable.PSEdition -eq 'Core') {
    Import-Module Microsoft.Online.SharePoint.PowerShell -SkipEditionCheck -WarningAction SilentlyContinue
}

$AdminUrl = 'https://dtvolunteers-admin.sharepoint.com'
$LiveSiteUrl = 'https://dtvolunteers.sharepoint.com/sites/tracker'

$SiteUrl = $SiteUrl.TrimEnd('/')
if ($SiteUrl -ieq $LiveSiteUrl) {
    throw "That's the live tracker site. This script is only for a restored copy."
}

# Sign in through the browser: Windows' sign-in broker fails on some machines (msalruntime).
Connect-SPOService -Url $AdminUrl -UseSystemBrowser $true

$site = Get-SPOSite -Identity $SiteUrl
Write-Host "Site: $($site.Title) ($($site.Url))"
Write-Host "Lock: $($site.LockState)"
Write-Host ''

if ($site.LockState -eq 'Unlock') {
    Write-Host 'Already unlocked. Nothing to do.'
} else {
    Set-SPOSite -Identity $SiteUrl -LockState Unlock
    $site = Get-SPOSite -Identity $SiteUrl
    Write-Host "Unlocked. Lock is now: $($site.LockState)"
}

Disconnect-SPOService
