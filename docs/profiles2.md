# Plan: Profiles Pages Migration (v2)

> **Status**: Parked. Prerequisite: dual-field strategy (see `fluttering-tickling-rain.md`) must be complete so all new `profile*` field names are in place before building these pages.

## Context
Full migration of v1 volunteers/profile pages to Vue v2. The v1 pages (`public/volunteers.html`, `public/profile-detail.html`) are operationally critical. This plan assumes the API contract already uses `profileName`, `profileSlug` etc. and that the AppHeader nav already reads "Profiles".

---

## Part D: New Profiles pages (v2 migration)

### Store: `frontend/src/stores/profiles.ts`
- Fetch `GET /api/profiles?fy=X&group=Y`
- State: `profiles: ProfileResponse[]`, `loading`, `error`
- Composition API pattern — same as `sessions.ts`

### Store: `frontend/src/stores/profileDetail.ts`
- Fetch `GET /api/profiles/:slug`
- State: `profile: ProfileDetailResponse | null`, `loading`, `error`
- Watch slug param with `watchEffect` → refetch on navigation

### Page: `frontend/src/pages/ProfilesPage.vue`
FY filter + sort + search + advanced filters. Calls `profilesStore.fetch(fy, group)` on mount.

**UI sections:**
1. `PageHeader` with profile count
2. FY filter tabs (Last FY / This FY / All)
3. Sort toggle: A-Z / Hours (client-side)
4. Search input (3+ chars, client-side)
5. Advanced toggle → group select, type select (Individuals/Groups/Users), hours select, record type/status selects
6. Admin controls in advanced: Select All, Add Records button, Download CSV button
7. Profile list (`ProfileList`)

### Page: `frontend/src/pages/ProfileDetailPage.vue`
Two-column layout with `LayoutColumns`. Full profile view.

**Left column (main):**
1. Profile header: name + badges + Edit/Transfer/Delete buttons (role-gated)
2. Duplicates warning (if any)
3. Linked profiles (if any)
4. `FyBarChart` — click to filter entries by FY
5. Group filter dropdown
6. `TagCloud` — fetches `GET /api/tags/hours-by-taxonomy?profile=X&fy=Y&group=Z`
7. Entries list — grouped; inline hours edit (checkin+)

**Right column (sidebar):**
8. Groups card with hours breakdown + Regular checkbox (checkin+)
9. Records section (checkin+/selfservice-own): consent pills, Add Record (admin), Consent link

### New components: `frontend/src/components/profiles/`

| Component | Responsibility |
|-----------|----------------|
| `ProfileCard.vue` | Card for listing: name, badges, hours, sessions, checkbox |
| `ProfileList.vue` | Grid of ProfileCard |
| `ProfileListFilters.vue` | Advanced filter controls; emits `bulk-records`, `download-csv` |
| `ProfileDetailHeader.vue` | Name, badges, action buttons; emits `edit`, `transfer`, `delete` |
| `ProfileDetailGroups.vue` | Group hours breakdown + Regular toggle; calls regulars API |
| `ProfileDetailEntries.vue` | Entry history with FY/group filter; inline hours edit |
| `ProfileDetailRecords.vue` | Record pills; Add Record button; Consent link |
| `ProfileDetailDuplicates.vue` | Severity-coloured duplicate + linked profile cards |

### New modals: `frontend/src/pages/modals/`

| Modal | Role gate | API call |
|-------|-----------|---------|
| `BulkRecordsModal.vue` | Admin | `POST /api/records/bulk` |
| `EditProfileModal.vue` | Checkin+ | `PATCH /api/profiles/:slug` |
| `TransferProfileModal.vue` | Admin | `POST /api/profiles/:slug/transfer` |
| `AddRecordModal.vue` | Admin | `POST /api/profiles/:id/records` |
| `EditRecordModal.vue` | Admin | `PATCH /api/records/:id` + `DELETE /api/records/:id` |

### Reuse
- `FyBarChart`, `TagCloud`, `ProfilePicker`, `LayoutColumns`, `AppButton`, `CardTitle`, `PageHeader`
- Path builders `profilesPath()`, `profilePath(slug)` — already in `router/index.ts`
- Types `ProfileResponse`, `ProfileDetailResponse` — from `types/api-responses.ts`

---

## Implementation Order

1. Profiles store + ProfilesPage (list: FY/sort/search, no advanced yet)
2. ProfileCard + ProfileList (enough to render the list)
3. Advanced filters (ProfileListFilters + group/type/hours/record filters)
4. Admin list operations (BulkRecordsModal, CSV download, checkbox selection)
5. profileDetail store + ProfileDetailPage scaffold (layout + loading/error)
6. ProfileDetailHeader + ProfileDetailGroups (read-only)
7. FyBarChart + TagCloud wiring (reuse existing components)
8. ProfileDetailEntries (with inline hours editing)
9. ProfileDetailRecords (admin)
10. EditProfileModal (checkin+)
11. AddRecordModal + EditRecordModal (admin)
12. TransferProfileModal + delete (admin)
13. ProfileDetailDuplicates (admin)

---

## Verification

- `/v2/profiles` lists profiles with FY/sort/search working
- `/v2/profiles/:slug` detail shows entries, groups, bar chart, tag cloud
- Checkin: Edit profile works; Regular toggle works; inline hours edit works
- Admin: Add/edit/delete records; Transfer; Bulk records from listing
- Self-service: own profile only, no edit controls visible
- Nav label reads "Profiles"
