<#
.SYNOPSIS
    Prints the slot's site IDs, ready to paste into backend/config.ts.

.DESCRIPTION
    The tracker finds its lists and libraries by ID. A restore keeps the list IDs, but
    a library's ID includes the site's ID, so the library IDs change. This script reads
    them from the slot's site and prints the SHAREPOINT_SITES entry for
    backend/config.ts. It changes nothing.

    Lists and libraries are found by name. Anything not found is shown as MISSING,
    with every list and library on the site printed underneath so you can see why.
    Tags come from one term set, in a site-level group on the production site; a restore
    doesn't copy the group, so every environment uses that same term set.

    Uses the Microsoft Graph module, like ../grant-site-access.ps1.

.PARAMETER Slot
    The slot, as named, e.g. Preview. The site is tracker-{slot in lower case}.

.EXAMPLE
    ./show-site-ids.ps1 -Slot Preview
#>

param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9-]+$')]
    [string] $Slot
)

$ErrorActionPreference = 'Stop'

$SiteUrl = "https://dtvolunteers.sharepoint.com/sites/tracker-$($Slot.ToLower())"
$TagsTermSetId = '14c7dfc2-ee1e-4c30-80f3-0d9149045311'   # on the production site, same for every environment

# config.ts key -> list or library name on the site
$ListNames = [ordered]@{
    groups   = 'Groups'
    projects = 'Projects'
    sessions = 'Sessions'
    entries  = 'Entries'
    profiles = 'Profiles'
    regulars = 'Regulars'
    records  = 'Records'
    logins   = 'Logins'
}
$LibraryNames = [ordered]@{
    media     = 'Media'
    documents = 'Documents'
}

Connect-MgGraph -Scopes 'Sites.Read.All' -NoWelcome

$uri = [uri]$SiteUrl
$site = Get-MgSite -SiteId "$($uri.Host):$($uri.AbsolutePath)"
$lists = Get-MgSiteList -SiteId $site.Id -All
$drives = Get-MgSiteDrive -SiteId $site.Id -All

$missing = $false
function Find-Id($items, $name) {
    $found = $items | Where-Object { $_.DisplayName -eq $name -or $_.Name -eq $name } | Select-Object -First 1
    if ($found) { return $found.Id }
    $script:missing = $true
    return 'MISSING'
}

Write-Host "Site: $($site.DisplayName) ($($site.WebUrl))"
Write-Host ''
Write-Host 'Paste into SHAREPOINT_SITES in backend/config.ts:'
Write-Host ''
Write-Host "  '$SiteUrl': {"
Write-Host '    lists: {'
foreach ($key in $ListNames.Keys) {
    Write-Host "      ${key}: '$(Find-Id $lists $ListNames[$key])',"
}
Write-Host '    },'
Write-Host '    libraries: {'
foreach ($key in $LibraryNames.Keys) {
    Write-Host "      ${key}: '$(Find-Id $drives $LibraryNames[$key])',"
}
Write-Host '    },'
Write-Host "    tagsTermSetId: '$TagsTermSetId',"
Write-Host '  },'
Write-Host ''

if ($missing) {
    Write-Host 'Some names were not found. Lists on the site:'
    $lists | Sort-Object DisplayName | ForEach-Object { '  {0,-30} {1}' -f $_.DisplayName, $_.Id }
    Write-Host 'Libraries on the site:'
    $drives | Sort-Object Name | ForEach-Object { '  {0,-30} {1}' -f $_.Name, $_.Id }
}

Disconnect-MgGraph | Out-Null
