<#
.SYNOPSIS
    Permanently removes a slot's old site, so a new restore can take its address.

.DESCRIPTION
    Before a new restore can be renamed to /sites/tracker-{slot}, the old one has to go.
    Deleting a site isn't enough: it sits in the deleted sites (recycle bin) for 93 days
    and keeps its address. This script deletes the slot's site, then removes it from the
    deleted sites, and waits until the address is free.

    It only ever touches /sites/tracker-{slot}, refuses the live tracker site, shows the
    site and asks you to type the slot's name to confirm. Removal is permanent: anything
    only on that copy is lost (it's meant to be a copy of live).

    Running it again is safe: if the site is already deleted, it just empties it from the
    deleted sites; if it's already gone, there's nothing to do.

    You need to be a SharePoint or Global admin, with SharePoint's PowerShell module
    installed (see README.md in this folder).

.PARAMETER Slot
    The slot whose site to remove, e.g. Preview: removes /sites/tracker-preview.

.EXAMPLE
    ./remove-site.ps1 -Slot Preview
#>

param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9-]+$')]
    [string] $Slot
)

$ErrorActionPreference = 'Stop'

$AdminUrl = 'https://dtvolunteers-admin.sharepoint.com'
$LiveSiteUrl = 'https://dtvolunteers.sharepoint.com/sites/tracker'
$SiteUrl = "https://dtvolunteers.sharepoint.com/sites/tracker-$($Slot.ToLower())"
if ($SiteUrl -ieq $LiveSiteUrl) {
    throw "That's the live tracker site's address."
}

# The site, or the deleted site, at an address; nothing if there isn't one.
function Find-Site($Url) { try { Get-SPOSite -Identity $Url } catch { $null } }
function Find-DeletedSite($Url) { try { Get-SPODeletedSite -Identity $Url } catch { $null } }

Connect-SPOService -Url $AdminUrl

$site = Find-Site $SiteUrl
$deleted = Find-DeletedSite $SiteUrl

if (-not $site -and -not $deleted) {
    Write-Host "Nothing at $SiteUrl. The address is free."
    Disconnect-SPOService
    return
}

if ($site) {
    Write-Host "Site:     $($site.Title) ($($site.Url))"
    Write-Host "Modified: $($site.LastContentModifiedDate)"
} else {
    Write-Host "Already deleted: $($deleted.Url) (deleted $($deleted.DeletionTime))"
}
Write-Host ''
Write-Host 'This permanently removes it, with everything on it.'
$answer = Read-Host "Type the slot's name ($Slot) to remove it"
if ($answer -cne $Slot) {
    Write-Host 'Nothing changed.'
    Disconnect-SPOService
    return
}

if ($site) {
    Write-Host 'Deleting...'
    Remove-SPOSite -Identity $SiteUrl -Confirm:$false
}

# A just-deleted site can take a moment to show in the deleted sites.
$deadline = (Get-Date).AddMinutes(10)
while (-not (Find-DeletedSite $SiteUrl) -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 10
}
Write-Host 'Removing from the deleted sites...'
Remove-SPODeletedSite -Identity $SiteUrl -Confirm:$false

# Wait until the address is free, checking every 15 seconds for up to 30 minutes.
$deadline = (Get-Date).AddMinutes(30)
do {
    Start-Sleep -Seconds 15
    $stillThere = (Find-Site $SiteUrl) -or (Find-DeletedSite $SiteUrl)
    Write-Host "  $(Get-Date -Format 'HH:mm:ss')  $(if ($stillThere) { 'still there' } else { 'gone' })"
} while ($stillThere -and (Get-Date) -lt $deadline)

Write-Host ''
if ($stillThere) {
    Write-Host "Still there after 30 minutes. Check again with: Get-SPODeletedSite -Identity $SiteUrl"
} else {
    Write-Host "Done: $SiteUrl is free for rename-site.ps1."
}

Disconnect-SPOService
