# Preview site from backup

Makes the preview's SharePoint site, `https://dtvolunteers.sharepoint.com/sites/tracker-preview`, a copy of the live tracker site, restored from Microsoft 365 Backup. The preview slot and local development use it, so they never touch live data.

Each step is its own script and can be run on its own. Run them from this folder, in PowerShell, as a SharePoint or Global admin.

## Before you start

Install SharePoint's PowerShell module (once per computer):

```powershell
Install-Module Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser
```

If PowerShell asks whether to trust the PSGallery repository, answer **Y**. Each script signs you in when it runs.

If it warns that a version is already installed under `C:\Program Files\SharePoint Online Management Shell`, that's an older copy from Microsoft's Windows installer, which `Install-Module` can't update. Uninstall **SharePoint Online Management Shell** (Windows Settings → Apps → Installed apps), then run `Install-Module` again. After that, `Update-Module Microsoft.Online.SharePoint.PowerShell` keeps it current.

## Steps

1. **Restore** the live tracker site's latest backup to a new site. Microsoft 365 Backup keeps a restore point every 10 minutes, so a change made on live shows up within about 15 minutes. The script shows the restore point's time and asks first, then waits (15 minutes or more) and prints the new site's address, something like `/sites/TrackerR1`.
   ```powershell
   ./restore-site.ps1
   ```
   By hand instead: SharePoint admin centre → Backup → SharePoint → Restore → the tracker site → a restore point → **Create new sites and restore to them**.
2. **Unlock** it. A restored site starts locked (`NoAdditions`: nothing new can be added), so the tracker couldn't take bookings.
   ```powershell
   ./unlock-site.ps1 -SiteUrl https://dtvolunteers.sharepoint.com/sites/TrackerR1
   ```
3. **Remove the slot's old site**, if there is one: deleted, then removed from the deleted sites, so its address is free. Permanent; it asks you to type the slot's name.
   ```powershell
   ./remove-site.ps1 -Slot Preview
   ```
4. **Rename** it after its slot: for `Preview`, `/sites/tracker-preview`, named **Tracker (Preview)**. The script checks first (including that step 3 is done), asks before renaming, and waits until it's done.
   ```powershell
   ./rename-site.ps1 -SiteUrl https://dtvolunteers.sharepoint.com/sites/TrackerR1 -Slot Preview
   ```
5. **Show its IDs** for `backend/config.ts`. Changes nothing.
   ```powershell
   ./show-site-ids.ps1 -Slot Preview
   ```
   The first time a slot's site is made, its entry goes into `SHAREPOINT_SITES` in a PR. A restore keeps the list IDs, but the two library IDs change with every restore, so they need updating each time.
6. **Set app access.** A restore copies the live site's app access too, so Production can reach the copy until this step. The slot's registration gets the new site, every other app (e.g. Production) is removed from it, and the slot's registration is removed from the live site. It shows the changes and asks first.
   ```powershell
   ./set-app-access.ps1 -Slot Preview -ClientId <DTV Tracker (Preview) client ID>
   ```
7. **Trim who can open it in SharePoint.** A restore copies the live site's member permissions too, so the live team (`team.tracker`, usually inside *Tracker Members*) and anyone else with access to live can open the copy directly, whatever the app allows. In *Site → Settings → Site permissions*, leave only the testers.
8. **Point the slot at it:** set the slot's `TRACKER_SHAREPOINT_SITE_URL` to `https://dtvolunteers.sharepoint.com/sites/tracker-preview` (Azure: DTVTrackerApp → preview slot → Environment variables), and the same in your local `.env`.

The Graph scripts (steps 1, 5 and 6) need the Microsoft Graph module, as `../grant-site-access.ps1` does: `Install-Module Microsoft.Graph.Sites, Microsoft.Graph.Applications -Scope CurrentUser`. The first `restore-site.ps1` asks you to consent to the Graph command-line tools' BackupRestore permissions, for your own sign-in only.

## Naming

Non-production sites are named after the slot that uses them: `tracker-{slot}` for the site, `{slot}.tracker.dtv.org.uk` for the app. Today the only slot is `preview`.
