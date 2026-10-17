<#
.SYNOPSIS
    Restores the live tracker site's latest backup to a new site.

.DESCRIPTION
    Microsoft 365 Backup keeps a restore point of the live tracker site every 10 minutes
    for the past two weeks. This script finds the latest one, shows its time and asks
    you to confirm, then restores it to a NEW site (never over the live site) and waits
    until the restore finishes. It prints the new site's address for the next steps
    (unlock-site.ps1, remove-site.ps1, rename-site.ps1).

    It uses Microsoft Graph's backup and restore API. Creating the restore session and
    reading its result are only in Graph's beta version so far, so if Microsoft changes
    them this script may need updating; the admin centre (Backup → SharePoint → Restore)
    does the same thing by hand.

    You need to be a SharePoint or Global admin. The first time, Microsoft asks you to
    consent to "Microsoft Graph Command Line Tools" using the BackupRestore permissions
    below, on your behalf only. The tracker's own app registrations are not changed.

    Uses the Microsoft Graph module, like show-site-ids.ps1:
        Install-Module Microsoft.Graph.Authentication -Scope CurrentUser

.EXAMPLE
    ./restore-site.ps1
#>

$ErrorActionPreference = 'Stop'

$LiveSiteUrl = 'https://dtvolunteers.sharepoint.com/sites/tracker'
$Graph = 'https://graph.microsoft.com'

Connect-MgGraph -NoWelcome -Scopes @(
    'BackupRestore-Configuration.Read.All', # find the live site's backup
    'BackupRestore-Search.Read.All',        # find its latest restore point
    'BackupRestore-Restore.ReadWrite.All'   # restore it to a new site
)

function Get-AllPages([string] $Uri) {
    $items = @()
    while ($Uri) {
        $page = Invoke-MgGraphRequest -Method GET -Uri $Uri
        $items += $page.value
        $Uri = $page.'@odata.nextLink'
    }
    return $items
}

# 1. The live site's backup ("protection unit").
$units = Get-AllPages "$Graph/v1.0/solutions/backupRestore/protectionUnits/microsoft.graph.siteProtectionUnit"
$unit = $units | Where-Object { "$($_.siteWebUrl)".TrimEnd('/') -ieq $LiveSiteUrl } | Select-Object -First 1
if (-not $unit) {
    throw "No backup found for $LiveSiteUrl. Check it's in the SharePoint backup policy (admin centre → Backup)."
}
Write-Host "Backup of: $($unit.siteName) ($($unit.siteWebUrl)), $($unit.status)"

# 2. Its latest restore point in the last two weeks.
$now = (Get-Date).ToUniversalTime()
$search = Invoke-MgGraphRequest -Method POST -Uri "$Graph/v1.0/solutions/backupRestore/restorePoints/search" -Body (@{
    protectionUnitIds      = @($unit.id)
    protectionTimePeriod   = @{
        startDateTime = $now.AddDays(-14).ToString('o')
        endDateTime   = $now.ToString('o')
    }
    restorePointPreference = 'latest'
} | ConvertTo-Json -Depth 5) -ContentType 'application/json'

$point = @($search.searchResults | ForEach-Object { $_.restorePoint }) |
    Sort-Object { [datetime]$_.protectionDateTime } -Descending | Select-Object -First 1
if (-not $point) {
    throw 'No restore point found in the last two weeks.'
}
$pointTime = ([datetime]$point.protectionDateTime).ToLocalTime()
Write-Host "Latest restore point: $($pointTime.ToString('ddd d MMM yyyy HH:mm')) (your time)"
Write-Host ''
Write-Host 'This restores that copy of the live site to a NEW site. The live site is not changed.'
$answer = Read-Host 'Restore now? (y/n)'
if ($answer -ne 'y') {
    Write-Host 'Nothing changed.'
    Disconnect-MgGraph | Out-Null
    return
}

# 3. A restore session for that point, to a new site, then start it.
$session = Invoke-MgGraphRequest -Method POST -Uri "$Graph/beta/solutions/backupRestore/sharePointRestoreSessions" -Body (@{
    siteRestoreArtifacts = @(@{
        restorePoint    = @{ id = $point.id }
        destinationType = 'new'
    })
} | ConvertTo-Json -Depth 5) -ContentType 'application/json'

Invoke-MgGraphRequest -Method POST -Uri "$Graph/v1.0/solutions/backupRestore/restoreSessions/$($session.id)/activate" | Out-Null
Write-Host "Restore started (session $($session.id)). This can take 15 minutes or more."

# 4. Wait for it, checking every 30 seconds for up to 2 hours.
$deadline = (Get-Date).AddHours(2)
do {
    Start-Sleep -Seconds 30
    $artifact = (Get-AllPages "$Graph/beta/solutions/backupRestore/sharePointRestoreSessions/$($session.id)/siteRestoreArtifacts") |
        Select-Object -First 1
    Write-Host "  $(Get-Date -Format 'HH:mm:ss')  $($artifact.status)"
} while ($artifact.status -notin @('succeeded', 'failed') -and (Get-Date) -lt $deadline)

Write-Host ''
if ($artifact.status -eq 'succeeded') {
    $newUrl = "$($artifact.restoredSiteWebUrl)".TrimEnd('/')
    Write-Host "Done: $newUrl"
    Write-Host ''
    Write-Host 'Next (README.md):'
    Write-Host "  ./unlock-site.ps1 -SiteUrl $newUrl"
    Write-Host '  ./remove-site.ps1 -Slot Preview'
    Write-Host "  ./rename-site.ps1 -SiteUrl $newUrl -Slot Preview"
} elseif ($artifact.status -eq 'failed') {
    Write-Host "The restore failed: $($artifact.error.message)"
} else {
    Write-Host "Still not finished after 2 hours (status: $($artifact.status)). Check the admin centre: Backup → SharePoint → Restore."
}

Disconnect-MgGraph | Out-Null
