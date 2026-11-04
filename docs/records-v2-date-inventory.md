# Records v2: legacy Date inventory (2 Nov 2026)

Every place the tracker reads or writes a Record's legacy **Date** field, taken from the code at Records v2 PR 0 ([#316](https://github.com/gothandy/dtv-tracker-app/pull/316); requirements [#322](https://github.com/gothandy/dtv-tracker-app/issues/322) §8, §12). Each row says which later PR moves it to **Start** and **End**. Date is removed from SharePoint only once nothing here still uses it.

This is a dated snapshot for the migration, not the living specification: that will be `docs/features/records.md`.

## The field

- **SharePoint:** `Date` is a date-and-time column (the Records summary on preview reports `dateTime`), unlike `Start` and `End`, which are date only.
- **Read:** `records-repository.ts` reads it with the date-only conversion (UTC → UK date, `YYYY-MM-DD`), so every reader below sees a UK calendar date.
- **Written:** as a full timestamp (`new Date().toISOString()`) where the tracker picks the date itself, or as the `YYYY-MM-DD` someone chose in a form (converted to UK midnight).

## Writers

| Where | What it writes | Moves in |
|---|---|---|
| Add Record (`POST /api/profiles/:id/records`, `RecordAddModal`, defaults to today) | Date chosen in the form, or now | PR 1: stops writing Date |
| Edit Record (`PATCH /api/records/:id`, `RecordEditModal`) | Date chosen in the form | PR 1: Date shown read-only |
| Bulk Add Records (`POST /api/records/bulk`, `ProfileBulkRecordsModal`, defaults to today) | Date chosen, or now, on every created **and updated** Record | PR 1: Date, Start and End where the Type has one; PR 3: Start and End only |
| Consent page (`POST /api/profiles/:id/consent`) | Now, on Privacy and Photo Consent, created or updated | PR 1: Date and Start; PR 3: Start only |
| Eventbrite attendee sync (`upsertConsentRecords` in `eventbrite-sync.ts`) | The attendee's created time, **on new Records only**; an existing Record gets its Status changed, never its Date | PR 1: Date and Start; PR 3: Start only |
| Profile transfer (`POST /api/profiles/:slug/transfer`) | Moves Records to the other Profile; Date unchanged | No change |

## Readers

| Where | What it does with Date | Moves in |
|---|---|---|
| Profile Stats, targeted and nightly (`profile-stats.ts`) | **First Aider:** an `Expires` First Aid Certificate whose Date is after today | PR 1: the evaluator works out Expired from End |
| Profile page Records (`ProfileRecordList`) | Shows `Type · Status · Date` | PR 3: Profile chips |
| Edit Record form | Prefills the date input | PR 1: read-only |
| Records CSV (Tools → *Records Download*, `GET /api/records/export`) | Each Type column is `Status · Date` | PR 4: replaced by the selected-Records CSV |
| Email templates, Profile context: `{{charityMembershipDate}}` (`email-vars.ts`) | The Charity Membership Record's Date (the Accepted one, else the first), as "1 April 2024" | Needs a decision: Start is the closest match ("when they became a member") |
| Records summary (Tools → *Records Summary*) | Counts blank Dates and Date ranges per Type and Status | Read-only report; keep until Date is removed |

## Email templates

Template HTML and Text live in the SharePoint Templates list, so they aren't in this repository. The only Record date a template can use is `{{charityMembershipDate}}` (Profile context, listed in `types/email-template.ts`). Before Date is removed, check each Profile template on the Templates page for it.

## Not Record dates

These look similar but aren't the Records Date field: Session `Date`, Entry `Cancelled`, `Created` and `Modified`, and Eventbrite's own event and order dates.
