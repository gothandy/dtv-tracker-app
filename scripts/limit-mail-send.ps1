<#
.SYNOPSIS
    Shows which mailboxes one of the tracker's app registrations can send email as,
    lets it send as one more, or takes one away.

.DESCRIPTION
    Graph's application Mail.Send permission means "send as anyone in the
    organisation". Exchange Online's RBAC for Applications can grant the same
    ability limited to chosen mailboxes. Each mailbox gets its own scope, so
    granting or removing one mailbox never changes what any other registration
    can do.

    With only -ClientId, it changes nothing: it lists the mailboxes the app can
    send as, and warns if Entra Mail.Send is on the registration.

    Granting (-Mailbox and -TestMailbox), the script:
      1. registers the app with Exchange,
      2. finds or creates a scope covering only that mailbox (an existing scope
         is reused as it is, never changed),
      3. gives the app "Application Mail.Send" within that scope,
      4. lists every mailbox the app can now send as, and tests it: allowed for
         the mailbox, not for the test mailbox,
      5. warns if the Entra Mail.Send permission is still on the registration.

    With -Remove, it takes the app's Mail.Send away for that mailbox only, deletes
    the scope if nothing else uses it, and lists what the app can still send as.

    Changing which mailbox an environment sends from:
      1. grant the new mailbox,
      2. wait for it to apply (up to an hour or two),
      3. change the environment's EXCHANGE_SEND_MAILBOX and send yourself a code,
      4. remove the old mailbox with -Remove.

    Running it again is safe: anything already in place is left as it is.

    You need to be an Exchange or Global admin. Run it in Azure Cloud Shell
    (PowerShell), where the modules are already installed, or in your own
    PowerShell after:
        Install-Module ExchangeOnlineManagement, Microsoft.Graph.Applications -Scope CurrentUser

    See docs/sharepoint-setup.md, section 4.

.PARAMETER ClientId
    The app registration's Application (client) ID, as in ENTRA_CLIENT_ID.

.PARAMETER Mailbox
    The mailbox to grant or remove, as in the environment's EXCHANGE_SEND_MAILBOX
    setting. Leave it out to just see the app's current mailboxes.

.PARAMETER TestMailbox
    When granting: any other real mailbox, used only to check the app is refused there. Nothing is sent.

.PARAMETER Remove
    Take the app's permission to send as this mailbox away, instead of granting it.

.EXAMPLE
    ./scripts/limit-mail-send.ps1 -ClientId 00000000-0000-0000-0000-000000000000

.EXAMPLE
    ./scripts/limit-mail-send.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -Mailbox preview.tracker@deantrailvolunteers.org.uk -TestMailbox andrew.davies@dtv.org.uk

.EXAMPLE
    ./scripts/limit-mail-send.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -Mailbox admin@deantrailvolunteers.org.uk -Remove
#>

param(
    [Parameter(Mandatory)]
    [string] $ClientId,

    [string] $Mailbox,

    [string] $TestMailbox,

    [switch] $Remove
)

$ErrorActionPreference = 'Stop'

$Action = if ($Remove) { 'remove' } elseif ($Mailbox) { 'grant' } else { 'status' }
if ($Remove -and -not $Mailbox) {
    throw 'With -Remove, give -Mailbox: the mailbox to take away.'
}
if ($Action -eq 'grant' -and -not $TestMailbox) {
    throw 'When granting, give -TestMailbox: any other real mailbox, used only to check the app is refused there.'
}

$Role = 'Application Mail.Send'
$GraphAppId = '00000003-0000-0000-c000-000000000000'   # Microsoft Graph
$GraphMailSendRoleId = 'b633e1c5-b582-4048-a93e-9f11b44c7e96'   # Graph application permission Mail.Send
$Filter = "PrimarySmtpAddress -eq '$Mailbox'"

# Exchange names are limited to 64 characters.
function Get-ShortName([string] $Name) {
    if ($Name.Length -le 64) { return $Name }
    return $Name.Substring(0, 64)
}

# The app's Mail.Send assignments, with the mailbox each one covers.
function Get-SendAssignments {
    Get-ManagementRoleAssignment -RoleAssignee $app.Id -Role $Role -ErrorAction SilentlyContinue |
        ForEach-Object {
            $scope = Get-ManagementScope -Identity $_.CustomResourceScope -ErrorAction SilentlyContinue
            [pscustomobject]@{ Assignment = $_.Name; Scope = $_.CustomResourceScope; Covers = $scope.RecipientFilter }
        }
}

# The registration's enterprise application (service principal), from Entra.
Connect-MgGraph -Scopes 'Application.Read.All' -NoWelcome
$app = Get-MgServicePrincipal -Filter "appId eq '$ClientId'"
if (-not $app) {
    throw "No app registration with client ID $ClientId in this tenant. Check ENTRA_CLIENT_ID."
}
Write-Host "App:     $($app.DisplayName) ($ClientId)"
if ($Mailbox) { Write-Host "Mailbox: $Mailbox" }
Write-Host "Action:  $Action"
Write-Host ''

Connect-ExchangeOnline -ShowBanner:$false

# Scopes are matched by what they cover, not by name, so a scope made by an
# earlier version of this script is found and reused, never changed.
$scope = if ($Mailbox) { Get-ManagementScope | Where-Object { $_.RecipientFilter -eq $Filter } | Select-Object -First 1 }

if ($Action -eq 'status') {
    $exchangeApp = Get-ServicePrincipal -Identity $ClientId -ErrorAction SilentlyContinue
    if (-not $exchangeApp) { Write-Host 'App is not registered with Exchange.' }
} elseif ($Action -eq 'remove') {
    $exchangeApp = Get-ServicePrincipal -Identity $ClientId -ErrorAction SilentlyContinue
    if (-not $exchangeApp -or -not $scope) {
        Write-Host "The app has no permission to send as $Mailbox. Nothing to remove."
    } else {
        $assignments = Get-ManagementRoleAssignment -RoleAssignee $app.Id -Role $Role -ErrorAction SilentlyContinue |
            Where-Object { $_.CustomResourceScope -eq $scope.Name }
        if (-not $assignments) {
            Write-Host "The app has no permission to send as $Mailbox. Nothing to remove."
        } else {
            $assignments | ForEach-Object {
                Remove-ManagementRoleAssignment -Identity $_.Name -Confirm:$false
                Write-Host "Removed '$($_.Name)'."
            }
        }

        # Delete the scope only if no other app still uses it.
        $stillUsed = Get-ManagementRoleAssignment -Role $Role -ErrorAction SilentlyContinue |
            Where-Object { $_.CustomResourceScope -eq $scope.Name }
        if ($stillUsed) {
            Write-Host "Kept scope '$($scope.Name)': another app still uses it."
        } else {
            Remove-ManagementScope -Identity $scope.Name -Confirm:$false
            Write-Host "Deleted scope '$($scope.Name)'."
        }

        Write-Host ''
        Write-Host 'Test (one row per mailbox the app can send as; InScope should now be False on every row):'
        Test-ServicePrincipalAuthorization -Identity $ClientId -Resource $Mailbox |
            Where-Object RoleName -eq $Role | Format-Table AllowedResourceScope, InScope -AutoSize
    }
} else {
    # 1. Register the app with Exchange.
    $exchangeApp = Get-ServicePrincipal -Identity $ClientId -ErrorAction SilentlyContinue
    if ($exchangeApp) {
        Write-Host 'App already registered with Exchange.'
    } else {
        $exchangeApp = New-ServicePrincipal -AppId $ClientId -ObjectId $app.Id -DisplayName $app.DisplayName
        Write-Host 'Registered the app with Exchange.'
    }

    # 2. A scope covering only this mailbox.
    if ($scope) {
        Write-Host "Scope '$($scope.Name)' already covers $Mailbox."
    } else {
        $scopeName = Get-ShortName "DTV Tracker $Mailbox"
        $scope = New-ManagementScope -Name $scopeName -RecipientRestrictionFilter $Filter
        Write-Host "Created scope '$scopeName'."
    }

    # 3. Send as that mailbox.
    $existing = Get-ManagementRoleAssignment -RoleAssignee $app.Id -Role $Role -ErrorAction SilentlyContinue |
        Where-Object { $_.CustomResourceScope -eq $scope.Name }
    if ($existing) {
        Write-Host "App already has $Role for $Mailbox."
    } else {
        $assignmentName = Get-ShortName "DTV Tracker send $($ClientId.Substring(0, 8)) $Mailbox"
        New-ManagementRoleAssignment -Name $assignmentName -App $ClientId -Role $Role -CustomResourceScope $scope.Name | Out-Null
        Write-Host "Gave the app $Role for $Mailbox."
    }

    # 4. Test. Changes can take up to an hour to apply in the service, but this test reads the configuration directly.
    Write-Host ''
    Write-Host 'Test (one row per mailbox the app can send as). The mailbox needs one row True; the test mailbox should be False on every row:'
    Test-ServicePrincipalAuthorization -Identity $ClientId -Resource $Mailbox |
        Where-Object RoleName -eq $Role | Format-Table AllowedResourceScope, InScope -AutoSize
    Test-ServicePrincipalAuthorization -Identity $ClientId -Resource $TestMailbox |
        Where-Object RoleName -eq $Role | Format-Table AllowedResourceScope, InScope -AutoSize
}

# Entra's Mail.Send would override all of this.
Write-Host ''
$graph = Get-MgServicePrincipal -Filter "appId eq '$GraphAppId'"
$entraMailSend = Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $app.Id -All |
    Where-Object { $_.ResourceId -eq $graph.Id -and $_.AppRoleId -eq $GraphMailSendRoleId }
if ($entraMailSend) {
    Write-Warning "The registration still has Microsoft Graph Mail.Send (application) in Entra, which lets it send as anyone. Remove it: Entra ID > App registrations > $($app.DisplayName) > API permissions > Mail.Send > Remove permission."
} else {
    Write-Host 'Entra Mail.Send is not on the registration. Sending is limited to the mailboxes below.'
}

Write-Host ''
Write-Host 'The app can send as:'
$all = if ($exchangeApp) { Get-SendAssignments }
if ($all) { $all | Format-Table Covers, Scope, Assignment -AutoSize } else { Write-Host '  (no mailboxes: it cannot send email)' }

Disconnect-ExchangeOnline -Confirm:$false
Disconnect-MgGraph | Out-Null
