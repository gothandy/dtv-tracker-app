<#
.SYNOPSIS
    Switches the Preview app registration off every night at 2am, automatically.

.DESCRIPTION
    The preview slot and local development run on a copy of live data, through the
    DTV Tracker (Preview) registration. Switching that registration off stops its key
    getting any tokens, so nothing can read the copy or send email with it. Doing that
    by hand only works if it's remembered every time, so this sets up an Azure Logic App
    that does it daily at 02:00 UK time. Switching on stays a deliberate step in the
    morning (docs/sharepoint-setup.md, section 6).

    The script:
      1. finds the Preview registration's enterprise application and refuses anything
         not named "DTV Tracker (Preview)", so it can never target production,
      2. creates or updates the Logic App, with its own managed identity,
      3. gives that identity Graph Application.ReadWrite.OwnedBy (it can only change
         apps it owns) and makes it an owner of the Preview enterprise application only.

    The Logic App can therefore switch off, or otherwise change, the Preview
    registration and nothing else. Keep edit access to it with the tracker's admins.

    Running it again is safe: anything already in place is left as it is.

    You need both: Global admin (or Privileged Role admin) in Entra, to grant the
    permission and ownership; and Contributor (or Owner) on the resource group in
    Azure, to create the Logic App. They're separate: an Entra admin role gives no
    Azure access by itself. Run it in Azure Cloud Shell (PowerShell), where the Az and
    Microsoft Graph modules are already installed and you're signed in to Azure.

    See docs/sharepoint-setup.md, section 6.

.PARAMETER ClientId
    The Preview registration's Application (client) ID, as in the preview slot's TRACKER_ENTRA_CLIENT_ID.

.PARAMETER ResourceGroup
    The resource group for the Logic App, e.g. the one holding the nightly sync Logic App.

.PARAMETER Name
    The Logic App's name, Tracker{Slot}Deactivate. Default: TrackerPreviewDeactivate

.EXAMPLE
    ./preview-nightly-off.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -ResourceGroup DTV
#>

param(
    [Parameter(Mandatory)]
    [string] $ClientId,

    [Parameter(Mandatory)]
    [string] $ResourceGroup,

    [string] $Name = 'TrackerPreviewDeactivate'
)

$ErrorActionPreference = 'Stop'

$PreviewDisplayName = 'DTV Tracker (Preview)'
$GraphAppId = '00000003-0000-0000-c000-000000000000'   # Microsoft Graph
$OwnedByPermission = 'Application.ReadWrite.OwnedBy'

Connect-MgGraph -Scopes 'Application.ReadWrite.All', 'AppRoleAssignment.ReadWrite.All' -NoWelcome

# 1. The Preview registration's enterprise application (service principal).
$preview = Get-MgServicePrincipal -Filter "appId eq '$ClientId'"
if (-not $preview) {
    throw "No app registration with client ID $ClientId in this tenant. Check the preview slot's TRACKER_ENTRA_CLIENT_ID."
}
if ($preview.DisplayName -ne $PreviewDisplayName) {
    throw "Client ID $ClientId is '$($preview.DisplayName)', not '$PreviewDisplayName'. This script only switches off the Preview registration."
}
Write-Host "Registration: $($preview.DisplayName) ($ClientId), currently enabled: $($preview.AccountEnabled)"

# 2. The Logic App: daily at 02:00 UK time, PATCH accountEnabled=false on the Preview
#    service principal, signed in as its own managed identity.
$rg = Get-AzResourceGroup -Name $ResourceGroup
# A recurrence without a start time fires as soon as it's saved, which would switch Preview
# off mid-test (or fail, before the permission below exists). Start from tomorrow's 02:00.
$startTime = (Get-Date).ToUniversalTime().AddDays(1).ToString('yyyy-MM-dd') + 'T02:00:00'
$template = @{
    '$schema'      = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#'
    contentVersion = '1.0.0.0'
    resources      = @(@{
        type       = 'Microsoft.Logic/workflows'
        apiVersion = '2019-05-01'
        name       = $Name
        location   = $rg.Location
        identity   = @{ type = 'SystemAssigned' }
        properties = @{
            state      = 'Enabled'
            definition = @{
                '$schema'      = 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
                contentVersion = '1.0.0.0'
                triggers       = @{
                    Daily_2am = @{
                        type       = 'Recurrence'
                        recurrence = @{
                            frequency = 'Day'
                            interval  = 1
                            timeZone  = 'GMT Standard Time'
                            startTime = $startTime
                            schedule  = @{ hours = @(2); minutes = @(0) }
                        }
                    }
                }
                actions        = @{
                    Switch_off_Preview_registration = @{
                        type   = 'Http'
                        inputs = @{
                            method         = 'PATCH'
                            uri            = "https://graph.microsoft.com/v1.0/servicePrincipals/$($preview.Id)"
                            headers        = @{ 'Content-Type' = 'application/json' }
                            body           = @{ accountEnabled = $false }
                            authentication = @{ type = 'ManagedServiceIdentity'; audience = 'https://graph.microsoft.com' }
                        }
                    }
                }
            }
        }
    })
    outputs        = @{
        principalId = @{
            type  = 'string'
            value = "[reference(resourceId('Microsoft.Logic/workflows', '$Name'), '2019-05-01', 'full').identity.principalId]"
        }
    }
}
$deployment = New-AzResourceGroupDeployment -ResourceGroupName $ResourceGroup -Name "$Name-setup" -TemplateObject $template
$principalId = $deployment.Outputs.principalId.Value
Write-Host "Logic App:    $Name in $ResourceGroup, identity $principalId"

# 3a. Graph Application.ReadWrite.OwnedBy for the Logic App's identity.
# appRoles is only returned when asked for.
$graph = Get-MgServicePrincipal -Filter "appId eq '$GraphAppId'" -Property 'id,appRoles'
$role = $graph.AppRoles | Where-Object { $_.Value -eq $OwnedByPermission -and $_.AllowedMemberTypes -contains 'Application' }
$existing = Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $principalId |
    Where-Object { $_.AppRoleId -eq $role.Id -and $_.ResourceId -eq $graph.Id }
if ($existing) {
    Write-Host "Permission:   $OwnedByPermission already granted."
} else {
    New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $principalId `
        -PrincipalId $principalId -ResourceId $graph.Id -AppRoleId $role.Id | Out-Null
    Write-Host "Permission:   granted $OwnedByPermission."
}

# 3b. Owner of the Preview enterprise application, and nothing else.
$owners = Get-MgServicePrincipalOwner -ServicePrincipalId $preview.Id
if ($owners.Id -contains $principalId) {
    Write-Host "Owner:        already an owner of $PreviewDisplayName."
} else {
    New-MgServicePrincipalOwnerByRef -ServicePrincipalId $preview.Id `
        -BodyParameter @{ '@odata.id' = "https://graph.microsoft.com/v1.0/directoryObjects/$principalId" }
    Write-Host "Owner:        added as an owner of $PreviewDisplayName."
}

Write-Host ''
Write-Host "Done. To test: Logic App $Name -> Run -> Run trigger, then check"
Write-Host "Enterprise applications -> $PreviewDisplayName -> Properties -> Enabled for users to sign in? reads No."
Write-Host 'A new permission can take a few minutes to apply; if the first run fails with 403, wait and run it again.'
