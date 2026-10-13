# App registration and permissions

**Audience:** the maintainer, or an Entra/SharePoint admin. Developers only need the client ID and secret (see [local-development.md](local-development.md)).

Each environment has its own Entra app registration and its own SharePoint site: production uses `/sites/tracker`; the preview slot and local development use `/sites/tracker-preview`, a copy restored from backup (section 7). The registration is used for everything there: reading and writing that site's lists and libraries, reading the tags term set, sending email, and Microsoft sign-in.

| Registration | Used by | Redirect URIs | Secret held in |
|---|---|---|---|
| **DTV Tracker (Production)** | Production | `https://tracker.dtv.org.uk/auth/signed-in`, `https://tracker.dtv.org.uk/auth/signed-out` | Production's settings only. Nobody else needs it |
| **DTV Tracker (Preview)** | The `preview` slot and local development | `https://preview.tracker.dtv.org.uk/auth/signed-in` and `/auth/signed-out`; `http://localhost:3000/auth/signed-in` and `/auth/signed-out` | The preview slot and developers' `.env`. **Switched off when nobody is testing** (section 6) |

Both are set up the same way and limited to what the tracker needs:

| Permission | Type | Limited to |
|---|---|---|
| `Sites.Selected` | Application (Microsoft Graph) | The environment's own site only, by a site grant (section 3). Preview can't reach the live site |
| `TermStore.Read.All` | Application | Read-only. The term store is organisation-wide, so it can't be limited to one site |
| Send mail | Exchange Online, *Application Mail.Send* | One mailbox, the `EXCHANGE_SEND_MAILBOX` setting (section 4). **Not** Graph `Mail.Send`, which means "send as anyone" |
| `User.Read` | Delegated | Microsoft sign-in |

The tracker's own code decides what each signed-in person may see and do (see *Clean code and maintainability* in [AGENTS.md](../AGENTS.md)); these permissions limit what its key can reach beyond that.

---

## 1. Create the registration

1. **Entra ID → App registrations → New registration.**
2. **Name:** `DTV Tracker (Production)` or `DTV Tracker (Preview)`. **Supported account types:** this organisational directory only. **Redirect URI:** Web, the environment's address from the table above.
3. **Authentication:** for Preview, add the local development redirect URI too. Production has only its own.
4. Copy the **Application (client) ID** from Overview: this is `ENTRA_CLIENT_ID`.
5. **Certificates & secrets → New client secret**, expiry 24 months. Copy the **Value** (not the Secret ID) straight into Azure: this is `ENTRA_CLIENT_SECRET`. Put a reminder in the calendar a month before it expires.

## 2. Permissions

1. **API permissions:** keep the delegated `User.Read`. **Add a permission → Microsoft Graph → Application permissions:** `Sites.Selected` and `TermStore.Read.All`.
2. **Grant admin consent for Dean Trail Volunteers.** Each row should show a green tick.
3. **Token configuration → Add optional claim → ID:** tick **`email`** and **`login_hint`**. The tracker reads who signed in from the sign-in token (`email`), and uses `login_hint` so sign-out can name the account instead of Microsoft asking which. When asked, tick *Turn on the Microsoft Graph email permission*.
   Then back on **API permissions**, choose **Grant admin consent for Dean Trail Volunteers** again: adding a permission doesn't grant it. Every row should show a green tick. Without this, staff get a Microsoft *"wants to view your email address"* prompt at sign-in, and anyone who declines can't sign in. **Always grant admin consent after any permission change**, so the tracker never asks staff to approve anything.
4. Don't add Graph `Mail.Send`: email is granted in Exchange instead (section 4). If it's ever been granted, removing it from the list isn't enough; under *Other permissions granted*, choose **⋯ → Revoke admin consent**.

## 3. Give it the tracker site

The tracker's app registration uses the Graph permission **`Sites.Selected`**, so it can only reach SharePoint sites it has been given explicitly: the tracker site and nothing else. Microsoft has no portal button for this step, so it's done with a script in this repo.

Run it when you create a new app registration for the tracker, or move the tracker to a different site. Running it again is safe.

1. Open **Azure Cloud Shell** in **PowerShell** mode (the Microsoft Graph module is already installed), or use PowerShell 7 on your own machine after `Install-Module Microsoft.Graph.Sites, Microsoft.Graph.Applications -Scope CurrentUser`.
2. Get the script: upload [`scripts/grant-site-access.ps1`](../scripts/grant-site-access.ps1) to Cloud Shell, or run it from your clone.
3. Run it with the registration's Application (client) ID:
   ```powershell
   ./grant-site-access.ps1 -ClientId <ENTRA_CLIENT_ID> -SiteUrl https://dtvolunteers.sharepoint.com/sites/tracker
   ```
4. Sign in as a SharePoint or Global admin. The first time, accept the consent for *Microsoft Graph Command Line Tools*: it acts as you, and only an admin can change site permissions.
5. Check the list it prints at the end: the registration should appear with `write`.

`AADSTS` or `Authorization_RequestDenied` errors mean you're not signed in as an admin. If the tracker shows access denied (403) after switching registration, the grant is missing or went to a different client ID.

## 4. Limit which mailbox it can send from

The tracker sends sign-in codes and emails from one mailbox (the `EXCHANGE_SEND_MAILBOX` setting). In Entra, the Graph permission `Mail.Send` (application) can only mean "send as anyone in the organisation", so instead the permission is given in **Exchange Online**, limited to that mailbox.

1. In Azure Cloud Shell (PowerShell), or PowerShell 7 with `Install-Module ExchangeOnlineManagement, Microsoft.Graph.Applications -Scope CurrentUser`, run [`scripts/limit-mail-send.ps1`](../scripts/limit-mail-send.ps1):
   ```powershell
   ./limit-mail-send.ps1 -ClientId <ENTRA_CLIENT_ID> -TestMailbox <any other real mailbox; nothing is sent>
   ```
   Sign in as an Exchange or Global admin.
2. Check the test lines: `InScope` **True** for the tracker's mailbox, **False** for the test mailbox.
3. If the script warns that Entra `Mail.Send` is still there, remove it: *Entra ID → App registrations → the registration → API permissions → Mail.Send → Remove permission*. It overrides the Exchange limit.
4. Send yourself a sign-in code from the tracker to check email still works. Exchange can take an hour or two to apply a new assignment, so **run this script well before switching an environment to a new registration**; until it applies, sending fails with `403 ErrorAccessDenied`.

If an environment's mailbox changes, run the script again with `-Mailbox` **first**, wait for it to apply, then change that environment's `EXCHANGE_SEND_MAILBOX`.

---

## 5. Renewing the secret

Secrets expire (24 months at most). Before expiry:

1. Create a new secret on the registration (section 1, step 5).
2. Update `ENTRA_CLIENT_SECRET` on production **and** every slot (each slot keeps its own copy), and in any local `.env`.
3. Check the tracker loads, then delete the old secret.

If it has already expired, pages show **Entra ID secret needs updating, see readme**; see the [readme](../readme.md#entra-id-secret-needs-updating-see-readme).

## 6. Switching the preview registration off and on

**DTV Tracker (Preview)** is switched off **automatically every night at 2am** (UK time), so the copy of live data is only reachable on days someone switches it on. Switched off, its key can't get any tokens, including the app's own: the preview slot shows errors (AADSTS7000112) and local development can't reach SharePoint or send email. Tokens already issued keep working for up to an hour.

**Switching on** when you start testing: *Entra ID → Enterprise applications → DTV Tracker (Preview) → Properties → Enabled for users to sign in? → Yes → Save*. It takes a few minutes. There's no need to switch it off at the end of the day; you can, with the same setting (**No**).

**The nightly switch-off** is an Azure Logic App, `dtv-preview-nightly-off`, with its own managed identity. That identity has Graph `Application.ReadWrite.OwnedBy` and is an owner of the Preview enterprise application only, so it can't change production's registration or any other app. Set it up, or check it, with [`scripts/preview-nightly-off.ps1`](../scripts/preview-nightly-off.ps1) in Azure Cloud Shell (PowerShell), as a Global admin:

```powershell
./preview-nightly-off.ps1 -ClientId <DTV Tracker (Preview) client ID> -ResourceGroup <resource group>
```

It refuses any registration not named *DTV Tracker (Preview)*. Test it with *Logic App → Run → Run trigger* and check the setting above reads **No**. If a run fails, it shows in the Logic App's run history; the preview then simply stays on until it's switched off by hand.

Only switch production's registration off in an emergency: the tracker stops.

## 7. The preview's own site

The preview slot and local development use `https://dtvolunteers.sharepoint.com/sites/tracker-preview`: a copy of the live site restored from **Microsoft 365 Backup** (SharePoint admin centre → Backup), so preview testing never touches live data. It's still real people's data and email addresses until it's cleaned up ([#281](https://github.com/gothandy/dtv-tracker-app/issues/281)), so avoid running an Eventbrite sync on it. Emails from it only go to the testers ([configuration.md](configuration.md#email-outside-production)).

To make or refresh it, follow [`scripts/preview-site-from-backup/README.md`](../scripts/preview-site-from-backup/README.md): restore, unlock, rename, show IDs (for `config.ts`), set app access. Its last step leaves *DTV Tracker (Preview)* with the preview site only, and no other app on it.

**Tags** come from one term set (`tagsTermSetId` in `config.ts`) in the site-level term group *Site Collection – DTV Tracker* on the production site. A restore doesn't copy term groups, so the preview reads and sets tags from production's term set (tested: this works). Edit tags on production: Tracker site → Site settings → Term store, or the tools page's **Term Store** button.

Non-production sites are named after their slot: `tracker-{slot}`, matching `{slot}.tracker.dtv.org.uk`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Setup problem page naming `ENTRA_…` settings | Settings missing on this slot; see [configuration.md](configuration.md) |
| `invalid_client` / AADSTS7000215 / 7000222 | Secret wrong, expired, or from a different registration than `ENTRA_CLIENT_ID` |
| Access denied (403) loading lists or photos | No site grant for this client ID on this environment's site: run section 3 (or, for the preview site, `set-app-access.ps1` in section 7) |
| Tags page fails | `TermStore.Read.All` missing or not consented |
| Sign-in codes don't arrive | Exchange assignment missing or not applied yet (up to an hour): run section 4 |
| AADSTS50011 on Microsoft sign-in | This address isn't a redirect URI on the registration (section 1, step 3) |
| AADSTS7000112 (application is disabled) on preview or locally | The Preview registration is switched off, normally by the 2am switch-off: switch it on (section 6) |
