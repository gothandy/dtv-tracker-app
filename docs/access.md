# Access: what each identity can reach

Every key, app and automation that can reach the tracker's data or send its email, what it can do, and why. **If something can reach the tracker and isn't on this page, it's a door to close.**

Check the real tenant against this page with [`scripts/access-report.ps1`](../scripts/access-report.ps1) (read-only; see *Checking* below). When an identity's access changes, update this page **and** the expectations at the top of that script in the same PR.

For what each *person* may do inside the tracker (Admin, Check In, Self-Service), see [permissions.md](permissions.md).

## Identities

| Identity | Kind | Can reach | Why |
|---|---|---|---|
| **DTV Tracker (Production)** | App registration. Secret in production's settings only | Graph `Sites.Selected`: **write on `/sites/tracker` only** (site grant). Graph `TermStore.Read.All` (read-only, organisation-wide). Exchange: **send as `admin@`** (moving to `tracker@`). Delegated `User.Read`, `email` for Microsoft sign-in | The live tracker: its data, tags, sign-in codes and session emails |
| **DTV Tracker (Preview)** | App registration. Secret in the preview slot and developers' `.env` | Same as Production, but **write on `/sites/tracker-preview` only**, and **send as `preview.tracker@` only**, which Exchange limits to the `test.tracker@` list. **Switched off every night at 2am**, so a leaked secret is useless until someone switches it on (it doesn't end testers' existing sessions) | The preview slot and local development, on a copy of live data |
| **TrackerPreviewDeactivate** | Logic App's system-assigned managed identity | Graph `Application.ReadWrite.OwnedBy`, and **owner of the Preview enterprise app only**. Nothing else | Switches the Preview registration off every night. The report (`-Azure`) also checks how the Logic App is set up: on, daily at 02:00, doing nothing else, as this identity |
| **oidc-msi-ad79** | User-assigned managed identity | Azure *Website Contributor* on `DTVTrackerApp` (all slots). Federated logins from GitHub: `main` branch (production) and the `preview` environment | GitHub Actions deploys, with no stored secret |
| **TrackerEventbriteUpdate** | Logic App | Nothing in Entra. Holds `TRACKER_JOBS_API_KEY` and calls production's nightly job | The 05:30 Eventbrite sync, stats refresh and backup |

### Worth knowing

- **`TermStore.Read.All` is organisation-wide.** Microsoft can't limit term store access to one site. It's read-only, and the term store holds tags, not personal data.
- **TrackerPreviewDeactivate can do anything to the Preview app**, not just switch it off: `OwnedBy` lets it change apps it owns, including adding a key. So anyone who can edit the Logic App (Contributor on the `DTV` resource group) could in effect act as Preview. That's accepted because Preview only reaches the preview copy and a mailbox locked to the test list; keep edit access to `DTV` with the tracker's admins. It can't touch Production.
- **oidc-msi-ad79 can deploy any code to production and the slots.** Its federated logins only accept GitHub's `main` branch and `preview` environment from this repository, so the guard is who can push to `main` or run that environment: write access to the repository ([AGENTS.md](../AGENTS.md#branches-and-environments)).

## Mailboxes

| Address | Kind | Who can send as it | Limits |
|---|---|---|---|
| `admin@deantrailvolunteers.org.uk` | User mailbox | Production (until it moves to `tracker@`) | None: it's a real mailbox |
| `tracker@deantrailvolunteers.org.uk` | Shared mailbox, sign-in blocked | Production (once switched) | Production's public address (`TRACKER_SHARED_MAILBOX`): sender, Reply-To, About box and *Contact us* links. Read by whoever has Full Access |
| `preview.tracker@deantrailvolunteers.org.uk` | Shared mailbox, sign-in blocked, hidden | Preview | One recipient per message; mail flow rule *Tracker (Preview) Restriction* rejects anyone not in `test.tracker@` |
| `test.tracker@deantrailvolunteers.org.uk` | Distribution list, hidden | Anyone in the organisation (accepted: members' addresses, personal ones included, are in the address book by consent anyway); nobody outside | Members: people and mail contacts, never groups. Joining closed: being on it means receiving slot email, so only its owners add people |

Set-up: [sharepoint-setup.md](sharepoint-setup.md) section 4.

## Doors that should stay shut

The report lists anything in the tenant holding these, tracker or not, matching apps by ID, never by name alone. A tracker identity holding one, or one of this organisation's own apps, is **UNEXPECTED** until it's removed or recorded here (and in `$KnownBroad` or `$KnownExchange` in the script, by client ID) with a reason; one of Microsoft's or another publisher's apps is **CHECK**: confirm it's still used. A switched-off app (either the enterprise app's *Enabled for users to sign in?* set to No, or the app registration's **Deactivate**) can't use what it holds, so it's **CHECK**, not a problem, until it's deleted. Known and justified: *none yet*.

**Found by the first report** (14 Oct 2026): *Power Automate Graph API*, an old registration of DTV's own with Graph `Directory.ReadWrite.All` and `User.ReadWrite.All`. It was already switched off, so it couldn't use them; delete it to clear the CHECK.

- **Application permissions that reach everything:** Graph `Mail.Send`, `Mail.Read`, `Mail.ReadBasic.All`, `Mail.ReadWrite`, `MailboxSettings.ReadWrite`, `Sites.Read.All`, `Sites.ReadWrite.All`, `Sites.Manage.All`, `Sites.FullControl.All`, `Files.Read.All`, `Files.ReadWrite.All`, `Application.ReadWrite.All`, `AppRoleAssignment.ReadWrite.All`, `DelegatedPermissionGrant.ReadWrite.All`, `Directory.ReadWrite.All`, `Group.ReadWrite.All`, `User.ReadWrite.All`, `RoleManagement.ReadWrite.Directory`, `TermStore.ReadWrite.All`; the same permissions on the older *SharePoint* API; and on Exchange's own API, `full_access_as_app` (every mailbox) and `Exchange.ManageAsApp`.
- **Entra admin roles held by apps**, anywhere: *Application Administrator*, for one, can add a key to any app, the tracker's included. And **any admin role over a tracker app alone** (an admin role can be limited to one app), held by anyone: it can change that app as an owner can.
- **Any other app on the tracker sites.** Each site should have exactly one app grant: its own registration. Apps can also be given single lists or files (`Lists.SelectedOperations.Selected` and the like), which the site's grants don't show; the report lists any app holding those as **CHECK**, to confirm by hand it has nothing on the tracker sites.
- **Exchange roles** (`Application Mail.*` and the like) for anything other than the tracker's registrations, each with `Application Mail.Send` for its own mailbox only. A role the report can't match to an app is **UNEXPECTED** too.
- **Keys on enterprise apps** (service principals). Keys belong on the app registration, where they're visible; one on an enterprise app is unusual and worth explaining.
- **Old or extra secrets** on the tracker's registrations: one current secret each, deleted when replaced ([sharepoint-setup.md](sharepoint-setup.md) section 5).

## People

Not checked by the report, but part of the same picture:

| Who | Where it's set | Check |
|---|---|---|
| Tracker admins | `TRACKER_ADMIN_USERS` per environment ([configuration.md](configuration.md)) | Production and each slot's settings |
| People who can open the tracker sites directly in SharePoint | Each site's permissions | *Site → Settings → Site permissions*. A restored preview copies live's members; trim to the testers ([#281](https://github.com/gothandy/dtv-tracker-app/issues/281)) |
| Who receives slot email | `test.tracker@` members | Exchange admin centre → Recipients → Groups |
| Who can change code or deploy | GitHub write access | *Repository → Settings → Collaborators* ([AGENTS.md](../AGENTS.md#branches-and-environments)) |
| Who can change the tracker's registrations | Entra admin roles (*Global*, *Application* and *Cloud Application Administrator*), plus each registration's owners | *Entra ID → Roles and administrators*. The report lists registration owners as CHECK, and any admin role limited to a tracker app as UNEXPECTED, but not people with organisation-wide roles: keep those to the admins |
| Who can change Azure resources | Role assignments on the web app, the two Logic Apps, `DTV` and the subscription | *Resource group DTV → Access control (IAM)*. The report (`-Azure`) expects only the person running it and GitHub's deploy identity (on the web app): anyone else is UNEXPECTED. Edit access to *TrackerEventbriteUpdate* reveals the jobs key; to *TrackerPreviewDeactivate*, control of Preview |

## Checking

Run [`scripts/access-report.ps1`](../scripts/access-report.ps1) every few months, and before and after any change to an identity, a permission or a secret. It changes nothing. The easiest place to run it is Azure Cloud Shell (below).

**It's a permissions audit, not a health check.** It brings the permissions that are otherwise spread across Entra, SharePoint, Exchange and Azure into one place and compares them with this page: who and what can reach the tracker, and how the guards that limit that are set up. It doesn't check whether things are working (sign-in, email, the nightly switch-off's runs); those show up in use, or in each service's own history.

```powershell
./scripts/access-report.ps1                                         # Entra, SharePoint and Exchange
./scripts/access-report.ps1 -Azure                                  # also Azure roles and GitHub's federated logins (needs the Az module; Cloud Shell has it)
./scripts/access-report.ps1 -Azure -OutFile docs/access-report.json # and write the public summary
```

**[`access-report.json`](access-report.json)** is the last clean run, committed so any change in access shows up as a diff in a PR. The repository is public, so it holds only what this page already says: statuses, counts, and items that match the record. IDs, people's and other apps' names, list members, secret names, and the details of anything MISSING or UNEXPECTED stay on screen. Commit it only when the run has no MISSING or UNEXPECTED, so it never advertises an open door.

Sign in as a Global admin (it reads site permissions, which needs SharePoint admin rights, and admin roles). Each line is marked **OK**, **MISSING** (expected but not there), **UNEXPECTED** (there but not expected) or **CHECK** (not wrong in itself, but look at it). It ends with a count of MISSING and UNEXPECTED; the aim is zero.

### Running scripts in Azure Cloud Shell

Cloud Shell is a PowerShell window in the browser, on a machine Microsoft provides. The Az, Microsoft Graph and Exchange modules are already installed, and nothing is kept on your computer. The same steps work for the other scripts in `scripts/`.

1. Open **[shell.azure.com](https://shell.azure.com)** (or the `>_` icon in the Azure portal) and choose **PowerShell**. The first time, choose **No storage account required**: each session starts clean and disappears when closed, so there are no local files to keep in step.
2. Get the code, on `main` (or a PR's branch to test it before merging):
   ```powershell
   git clone https://github.com/gothandy/dtv-tracker-app
   cd dtv-tracker-app
   ```
   In a session that's still open, update with `git fetch origin; git reset --hard origin/main` rather than `git pull`: branches are rewritten when a task is promoted, and a pull then tries to merge.
3. Run it:
   ```powershell
   ./scripts/access-report.ps1 -Azure -OutFile docs/access-report.json
   ```
   The first run asks you to sign in to Microsoft Graph and to Exchange (Azure is already signed in). It stays signed in, so **running it again in the same session doesn't ask again**: fix something, re-run, repeat. To sign out sooner: `Disconnect-ExchangeOnline -Confirm:$false; Disconnect-MgGraph`.
4. When it's clean, `cat docs/access-report.json` and paste it into the file on GitHub (or hand it to the coding agent) to commit it.

A session closes after about 20 minutes idle; start again from step 1.

On your own machine instead, it needs `Install-Module Microsoft.Graph.Applications, Microsoft.Graph.Sites, Microsoft.Graph.Users, Microsoft.Graph.Identity.SignIns, ExchangeOnlineManagement -Scope CurrentUser`. On Windows PowerShell, run it in a fresh window: the Microsoft Graph and Exchange modules clash if Exchange was connected first.
