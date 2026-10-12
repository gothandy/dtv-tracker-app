<#
.SYNOPSIS
    Lets the tracker's app registration send email only from the tracker's mailbox.

.DESCRIPTION
    Graph's application Mail.Send permission means "send as anyone in the
    organisation". Exchange Online's RBAC for Applications can grant the same
    ability limited to chosen mailboxes. This script:

      1. registers the app with Exchange,
      2. creates a scope covering only the tracker's mailbox,
      3. gives the app "Application Mail.Send" within that scope,
      4. tests it: allowed for the tracker's mailbox, not for another one,
      5. warns if the Entra Mail.Send permission is still on the registration.

    Step 5 matters: Entra's Mail.Send overrides the Exchange scope, so remove it
    from the registration (API permissions) once this script has run.

    Running it again is safe: anything already in place is left as it is.

    You need to be an Exchange or Global admin. Run it in Azure Cloud Shell
    (PowerShell), where the modules are already installed, or in your own
    PowerShell 7 after:
        Install-Module ExchangeOnlineManagement, Microsoft.Graph.Applications -Scope CurrentUser

    See docs/sharepoint-setup.md, section 4.

.PARAMETER ClientId
    The app registration's Application (client) ID, as in ENTRA_CLIENT_ID.

.PARAMETER Mailbox
    The mailbox the tracker sends from. Must match EMAIL_FROM in backend/config.ts.

.PARAMETER TestMailbox
    Any other real mailbox, used only to check the app is refused there. Nothing is sent.

.EXAMPLE
    ./scripts/limit-mail-send.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -TestMailbox andrew.davies@dtv.org.uk
#>

param(
    [Parameter(Mandatory)]
    [string] $ClientId,

    [string] $Mailbox = 'admin@deantrailvolunteers.org.uk',

    [Parameter(Mandatory)]
    [string] $TestMailbox
)

$ErrorActionPreference = 'Stop'

$ScopeName = 'DTV Tracker mailbox'
$AssignmentName = "DTV Tracker Mail.Send $ClientId"
$GraphAppId = '00000003-0000-0000-c000-000000000000'   # Microsoft Graph
$GraphMailSendRoleId = 'b633e1c5-b582-4048-a93e-9f11b44c7e96'   # Graph application permission Mail.Send

# The registration's enterprise application (service principal), from Entra.
Connect-MgGraph -Scopes 'Application.Read.All' -NoWelcome
$app = Get-MgServicePrincipal -Filter "appId eq '$ClientId'"
if (-not $app) {
    throw "No app registration with client ID $ClientId in this tenant. Check ENTRA_CLIENT_ID."
}
Write-Host "App:     $($app.DisplayName) ($ClientId)"
Write-Host "Mailbox: $Mailbox"
Write-Host ''

Connect-ExchangeOnline -ShowBanner:$false

# 1. Register the app with Exchange.
if (Get-ServicePrincipal -Identity $ClientId -ErrorAction SilentlyContinue) {
    Write-Host 'App already registered with Exchange.'
} else {
    New-ServicePrincipal -AppId $ClientId -ObjectId $app.Id -DisplayName $app.DisplayName | Out-Null
    Write-Host 'Registered the app with Exchange.'
}

# 2. A scope covering only the tracker's mailbox.
$filter = "PrimarySmtpAddress -eq '$Mailbox'"
$scope = Get-ManagementScope -Identity $ScopeName -ErrorAction SilentlyContinue
if (-not $scope) {
    New-ManagementScope -Name $ScopeName -RecipientRestrictionFilter $filter | Out-Null
    Write-Host "Created scope '$ScopeName'."
} elseif ($scope.RecipientFilter -ne $filter) {
    Set-ManagementScope -Identity $ScopeName -RecipientRestrictionFilter $filter
    Write-Host "Updated scope '$ScopeName' to $Mailbox."
} else {
    Write-Host "Scope '$ScopeName' already covers $Mailbox."
}

# 3. Send as that mailbox only.
if (Get-ManagementRoleAssignment -Identity $AssignmentName -ErrorAction SilentlyContinue) {
    Write-Host 'App already has Application Mail.Send in that scope.'
} else {
    New-ManagementRoleAssignment -Name $AssignmentName -App $ClientId -Role 'Application Mail.Send' -CustomResourceScope $ScopeName | Out-Null
    Write-Host 'Gave the app Application Mail.Send in that scope.'
}

# 4. Test. Changes can take up to an hour to apply in the service, but this test reads the configuration directly.
Write-Host ''
Write-Host 'Test (InScope should be True for the tracker mailbox, False for the test mailbox):'
Test-ServicePrincipalAuthorization -Identity $ClientId -Resource $Mailbox |
    Where-Object RoleName -eq 'Application Mail.Send' | Format-Table RoleName, InScope -AutoSize
Test-ServicePrincipalAuthorization -Identity $ClientId -Resource $TestMailbox |
    Where-Object RoleName -eq 'Application Mail.Send' | Format-Table RoleName, InScope -AutoSize

# 5. Entra's Mail.Send would override all of the above.
$graph = Get-MgServicePrincipal -Filter "appId eq '$GraphAppId'"
$entraMailSend = Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $app.Id -All |
    Where-Object { $_.ResourceId -eq $graph.Id -and $_.AppRoleId -eq $GraphMailSendRoleId }
if ($entraMailSend) {
    Write-Warning "The registration still has Microsoft Graph Mail.Send (application) in Entra, which lets it send as anyone. Remove it: Entra ID > App registrations > $($app.DisplayName) > API permissions > Mail.Send > Remove permission."
} else {
    Write-Host 'Entra Mail.Send is not on the registration. Sending is limited to the scope above.'
}

Disconnect-ExchangeOnline -Confirm:$false
Disconnect-MgGraph | Out-Null
