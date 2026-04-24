# Frontend Features

All pages are Vue 3 SPA routes. See [docs/app-dev-guidelines.md](../app-dev-guidelines.md) for component architecture and patterns.

## FY Filtering and Bar Charts

All list pages (sessions, volunteers, groups) support financial year filtering: This FY / Last FY / All / Rolling FY. FY runs April 1 – March 31. Group detail and profile detail pages include a FY bar chart showing hours per year.

## Personalised Homepage Calendar

Authenticated users with a linked profile see:
- Filled dots on dates they are registered for or have attended
- Outline dots on dates with sessions from their regular groups (not yet joined)
- Registered / Attended pills on session cards
- Next / Last buttons jump to own sessions, falling back to any session if none

Public and Read Only users see the standard global session calendar.

## Taxonomy Word Cloud

Shown on homepage, group detail, and profile detail. Aggregates hours by taxonomy term with ancestor rollup via `GET /api/tags/hours-by-taxonomy`. Homepage shows top 5 by default; expands to full cloud on Show History. Includes CSV download. Respects FY / group / profile filters.

## Media

Gallery, upload, and cover photo — see [docs/features/media.md](media.md).

## Session Taxonomy Picker

Term picker on session detail (Admin/Check In). Hierarchical picker backed by SharePoint Term Store. Terms are stored as managed metadata on the session. Bulk application from sessions listing (checkbox selection + Apply Terms). See [docs/features/tagging.md](tagging.md) for the full taxonomy design.

## CSV Exports

- Sessions listing: export selected sessions (columns: Date, Group, Name, Registrations, Hours, New, Children, Regulars, FY); public-accessible
- Volunteers listing: export selected or all visible profiles
- Records export from admin page

## Admin Page

Buttons for: Eventbrite sync (sessions + attendees + nightly), stats refresh, cache clear, backup export. Unmatched Eventbrite events list. Site shortcuts (SharePoint Site Contents, Term Store, Backups). Icon legend.

## PWA

`site.webmanifest` enables Add to Home Screen on Android (Chrome). App icon set included.

## Email Sandbox

Preview page at `/sandbox/email-pre-session` renders the pre-session Handlebars email template with fixture data for design review without sending.

## Planned

- PWA share target — register app as a native share target so volunteers can share photos directly from their camera roll
