# Todo

## Bulk Email to Volunteers?
Both from filtered volunteers page, groups (regulars) and session page? Or provide emails to cut and paste into email client.

## Unmatched names from Records imports
- 41 people from privacy consent form CSV have no matching profile in Tracker
- 2 people from membership CSV: "Ben Herycz" (no profile), "Dave Rowley" (probably David Rowley)
- Update facebook joined date?

## Volunteer List Filters
Automatically link through to the volunteers page with advanced filters set from the admin page.
- **"Nearly there"** — profiles not yet members but approaching 15h this FY
- **"Needs card"** — members who haven't been issued a card yet (requires Records)
- **"At risk"** — members who aren't on track to meet 15h this FY

## Pivot Table Reporting
Need a way for non-technical users to do ad-hoc reporting. Options:
1. **CSV export** — denormalized dataset, open in Excel. Simple, already have session CSV export.
2. **Excel template** — pre-built pivot table that loads from CSV or API.
3. **Power Pivot** — live data model connecting to an API endpoint.
Constraint: users may not have full Excel installed (online-only licences). Option 1 is the safest starting point.

## Use of #Tags?
Many of the tags can be retired? Things like "#New" can be calculated, #Regulars comes from the lookup. Perhaps overtime gently retire each once possible. Leaving those that are required like dig lead, etc. All tags now use SVG icons configured in `public/js/tag-icons.js` — easy to add/remove/rename tags by editing this file.

## Timesheet functionality?
it is possible to fir users to edit the hours directly im people's profile it needs checking for usability.

## Sync Logging
The Eventbrite sync endpoints return structured results but there's no persistent log. Azure Logic App run history provides some visibility, but a SharePoint "Logs" list would allow viewing sync history from within the app.
- SharePoint Logs list with fields: Title (timestamp), Summary (text), Source (Manual/Scheduled)
- Write to Logs list at the end of `event-and-attendee-update` endpoint
- Display on admin page with last sync timestamp

## Import from Facebook events?
Some groups use Facebook for registration. Maybe use an OCR to get the text, and match against the names in the profile list.

## Homepage spinner
While the cache is building a spinner would help usability.
