# Todo

## Site Migration

### Update documentation
Update `sharepoint-schema.md` and `site-migration.md` to reflect the actual Tracker site schema (dropped Registrations, Hours, Url, FinancialYearFlow on Sessions; dropped HoursLastFY/HoursThisFY on Profiles; renamed Url to EventbriteEventUrl then dropped).

### Retire legacy site
Once the Tracker site is validated and Eventbrite sync is working:
- Remove legacy ternaries from `services/field-names.ts` — keep clean names only
- Remove `legacy` conditionals from repositories and `api.ts`
- Clean up types (`SharePointSession.Registrations`, `Hours`, `Url`, `FinancialYearFlow`; `SharePointProfile.HoursLastFY`, `HoursThisFY`; `SharePointEntry.FinancialYearFlow`)
- Delete `.env.members` and migration scripts
- Update `CLAUDE.md` with new GUIDs and field names
- Remove "manage" permissions in Azure.

### SharePoint button icon
The SharePoint SVG on the homepage needs replacing with a better icon.

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
| Type | Type | choice | Privacy Consent, Photo Consent |
| Date | Date | dateTime | When (from Eventbrite order timestamp) |

### Phase 1 (now)
- Create the list with just two Type choices: Privacy Consent, Photo Consent
- Wire into Eventbrite attendee sync — create records from custom question answers (#315115173, #315115803)
- One-off import: backfill historic consent from past Eventbrite events
- Display consent status on profile detail page

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
