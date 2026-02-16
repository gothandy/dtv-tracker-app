# Todo

## ~~Site Migration~~ Done

Legacy Members site retired. Tracker site is the only site. Legacy ternaries, migration scripts, `.env.members`, `.env.tracker` all removed. Remaining: remove "manage" permissions in Azure, update `sharepoint-schema.md`.

### SharePoint button icon
~~The SharePoint SVG on the homepage needs replacing with a better icon.~~ Not Requried

## Quick Fixes

### ~~IsGroup checkbox~~ Done
### ~~Admin page~~ Done
### ~~Eventbrite attendee sync~~ Done

## Eventbrite Sync

### Events & recurring series
Plan how to match Eventbrite events to groups (via `EventbriteSeriesID`) and create/update sessions automatically.

### #NoPhoto tagging
When Photo Consent is declined, add `#NoPhoto` tag to the entry Notes field.

## Records list (new SharePoint list)

Single list for tracking consents, benefits, and governance. Type column is a SharePoint choice field — new types added by updating the column choices via Graph API, no code changes needed.

### Schema
| Column | Internal Name | Type | Notes |
|--------|---------------|------|-------|
| Profile | Profile | lookup → Profiles | Who |
| Type | Type | choice | Privacy Consent, Photo Consent, Newsletter Consent, Charity Membership, Discount Card |
| Status | Status | choice | Invited, Accepted, Declined |
| Date | Date | dateTime | When last updated (from source timestamp) |

### Phase 1 — Done
- [x] Create the list with Type and Status columns
- [x] Wire into Eventbrite attendee sync (upsert with Status)
- [x] One-off import: backfill historic consent from Eventbrite (Wed sessions, Oct 2025+)
- [x] Import privacy consent form CSV (Privacy, Photo, Newsletter Consent)
- [x] Import membership application CSV (Charity Membership, Newsletter Consent)
- [x] Import benefits CSV (Discount Card — Invited/Accepted)
- [x] MEMBER badge based on Charity Membership record (not hours)
- Display consent/records status on profile detail page
- Backfill Discount Card Date from the date each volunteer first hit 15h

### Unmatched names from CSV imports
- 41 people from privacy consent form CSV have no matching profile in Tracker
- 2 people from membership CSV: "Ben Herycz" (no profile), "Dave Rowley" (probably David Rowley)

### Phase 2 (future)
- Add more Type choices: Discount Card, Bike Park Wales, Facebook Invite, Parking Permit, etc.
- Add Expires (dateTime) and Notes (text) columns when needed for benefits
- Volunteer list filters: "Needs card", "Nearly there", "At risk"
- Denormalized CSV export from Admin page

### Implementation steps (Phase 1)
1. Create list creation script (`create-records-list.js`)
2. Add TypeScript types and repository
3. Add API endpoints (create record, get records by profile)
4. Wire consent into Eventbrite attendee sync
5. Build one-off historic import script
6. Add consent display to profile detail page

## Volunteer List Filters (future)

- **"Nearly there"** — profiles not yet members but approaching 15h this FY
- **"Needs card"** — members who haven't been issued a card yet (requires Records)
- **"At risk"** — members who aren't on track to meet 15h this FY

## Reporting (future)

Need a way for non-technical users to do ad-hoc reporting. Options:

1. **CSV export** — denormalized dataset, open in Excel. Simple, already have session CSV export.
2. **Excel template** — pre-built pivot table that loads from CSV or API.
3. **Power Pivot** — live data model connecting to an API endpoint.

Constraint: users may not have full Excel installed (online-only licences). Option 1 is the safest starting point.

## Is Group? Confusing

We have two types of Group in the UI. Need another word ideally for the profile to cover "Not Individual" case. 

## Use of #Tags??

Many of the tags can be retired? Things like "#New" can be calculated, #Regulars comes from the lookup. Perhaps overtime gently retire each once possible. Leaving those that are required like dig lead, etc.
