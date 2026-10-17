<#
.SYNOPSIS
    Renames a restored site after the slot that will use it.

.DESCRIPTION
    A site restored from Microsoft 365 Backup gets an address Microsoft chooses, such as
    /sites/TrackerR0, and the live site's name. This script names it after the slot
    (App Service deployment slot) that will use it, so it's never mistaken for live.
    For the slot 'Preview':

        address  https://dtvolunteers.sharepoint.com/sites/tracker-preview
        name     Tracker (Preview)

    It checks the rename first (SharePoint's own validation), asks you to confirm, then
    starts it and waits until it finishes. SharePoint redirects the old address to the
    new one afterwards. It refuses to rename the live tracker site, or to use its address.

    You need to be a SharePoint or Global admin, with SharePoint's PowerShell module
    installed (see README.md in this folder).

.PARAMETER SiteUrl
    The restored site, e.g. https://dtvolunteers.sharepoint.com/sites/TrackerR0

.PARAMETER Slot
    The slot that will use the site, as it should read in the site's name, e.g. Preview.
    Letters, digits and hyphens. The address uses it in lower case.

.EXAMPLE
    ./rename-site.ps1 -SiteUrl https://dtvolunteers.sharepoint.com/sites/TrackerR0 -Slot Preview
#>

param(
    [Parameter(Mandatory)]
    [string] $SiteUrl,

    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9-]+$')]
    [string] $Slot
)

$ErrorActionPreference = 'Stop'

$AdminUrl = 'https://dtvolunteers-admin.sharepoint.com'
$LiveSiteUrl = 'https://dtvolunteers.sharepoint.com/sites/tracker'

$SiteUrl = $SiteUrl.TrimEnd('/')
$NewSiteUrl = "https://dtvolunteers.sharepoint.com/sites/tracker-$($Slot.ToLower())"
$NewTitle = "Tracker ($Slot)"
if ($SiteUrl -ieq $LiveSiteUrl) {
    throw "That's the live tracker site. This script is only for a restored copy."
}
if ($NewSiteUrl -ieq $LiveSiteUrl) {
    throw "The new address is the live tracker site's address. Choose another."
}

Connect-SPOService -Url $AdminUrl

# The new address must be free: a slot's old site has to be removed first.
$taken = $null
try { $taken = Get-SPOSite -Identity $NewSiteUrl } catch { }
if (-not $taken) { try { $taken = Get-SPODeletedSite -Identity $NewSiteUrl } catch { } }
if ($taken) {
    Disconnect-SPOService
    throw "$NewSiteUrl is still in use (or in the deleted sites). Run ./remove-site.ps1 -Slot $Slot first."
}

$site = Get-SPOSite -Identity $SiteUrl
Write-Host "From: $($site.Title) ($($site.Url))"
Write-Host "To:   $NewTitle ($NewSiteUrl)"
Write-Host ''

# SharePoint checks the rename can go ahead (address free, site in a state that allows it).
Write-Host 'Checking the rename...'
Start-SPOSiteRename -Identity $SiteUrl -NewSiteUrl $NewSiteUrl -NewSiteTitle $NewTitle -ValidationOnly -Confirm:$false | Out-Null
Write-Host 'Check passed.'
Write-Host ''

$answer = Read-Host 'Rename now? (y/n)'
if ($answer -ne 'y') {
    Write-Host 'Nothing changed.'
    Disconnect-SPOService
    return
}

Start-SPOSiteRename -Identity $SiteUrl -NewSiteUrl $NewSiteUrl -NewSiteTitle $NewTitle -Confirm:$false | Out-Null
Write-Host 'Rename started. This usually takes a few minutes.'

# Wait for SharePoint to finish, checking every 15 seconds for up to 30 minutes.
$deadline = (Get-Date).AddMinutes(30)
do {
    Start-Sleep -Seconds 15
    $state = Get-SPOSiteRenameState -Identity $SiteUrl
    Write-Host "  $(Get-Date -Format 'HH:mm:ss')  $($state.State)"
} while ($state.State -notin @('Success', 'Failed') -and (Get-Date) -lt $deadline)

Write-Host ''
if ($state.State -eq 'Success') {
    $renamed = Get-SPOSite -Identity $NewSiteUrl
    Write-Host "Done: $($renamed.Title) ($($renamed.Url))"
} elseif ($state.State -eq 'Failed') {
    Write-Host "The rename failed: $($state.ErrorDescription)"
} else {
    Write-Host "Still not finished after 30 minutes (state: $($state.State)). Check again with:"
    Write-Host "  Get-SPOSiteRenameState -Identity $SiteUrl"
}

Disconnect-SPOService
