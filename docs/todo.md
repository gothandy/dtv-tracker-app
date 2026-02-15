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

### SharePoint button icon
The SharePoint SVG on the homepage needs replacing with a better icon.

## Quick Fixes

### IsGroup checkbox
Add the "Is Group" checkbox to the profile edit modal on `profile-detail.html`.

## Eventbrite Sync

### Admin page
Have ability to run sync tasks from the UI. A Settings or Admin page with buttons to trigger sync operations.

### Attendees & questions
Plan how to sync attendee data from Eventbrite into entries (create if not exists, update if changed). Also plan consent fields on Profiles — checkboxes vs dates for tracking when consent was given.

### Events & recurring series
Plan how to match Eventbrite events to groups (via `EventbriteSeriesID`) and create/update sessions automatically.

## Member Benefits

### Volunteer list filters
Additional filters on the volunteers page:

- **"Nearly there"** — profiles not yet members but approaching 15h this FY
- **"Needs card"** — profiles who meet membership criteria but haven't been issued a card yet
- **"At risk"** — members who aren't on track to meet 15h this FY (may lapse next year)

### New profile columns
Plan the best column types for member benefit tracking. Key question: checkboxes (simple yes/no) vs dates (when it happened) vs status enums.

- Added To Facebook Group (No | Invited | Joined | Left)
- Emailed Discount Codes (last date sent)
- Discount Card Given Out (expiry date)
- Parking Permit Code (text, unique per user)
- Parking Permit Registration 1 (text)
- Parking Permit Registration 2 (text)
- Bike Park Wales (date)

These need new columns on the Profiles list in SharePoint. Run the create-profiles-list script approach — or add columns individually via Graph API.

## Reporting

### Mechanism
Need a way for non-technical users to do ad-hoc reporting (pivot tables etc). Options:

1. **CSV export** — denormalised dataset, open in Excel. Simple, already have session CSV export.
2. **Excel template** — pre-built pivot table that loads from CSV or API.
3. **Power Pivot** — live data model connecting to an API endpoint.

Constraint: users may not have full Excel installed (online-only licences). Option 1 is the safest starting point.
