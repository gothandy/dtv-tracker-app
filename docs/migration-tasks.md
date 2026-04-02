# Migration Tasks

Migrate remaining pages to Vue 3 (`frontend/`). Commit and push after each unit.

## 1. Foundation
- [x] `composables/useRole.ts` — isAdmin, isCheckIn, isTrusted, isSelfService
- [x] `styles/admin.css` — tables, forms, modals

## 2. Nav + routing
- [x] `AppHeader.vue` — auth-aware nav (Sessions, Groups, Volunteers, Tools)
- [x] Router path builders — groupsPath, groupPath, sessionsPath, profilesPath, profilePath, addEntryPath, entryPath, adminPath

## 3. Groups listing
- [x] `stores/groups.ts`
- [x] `FyFilterV1.vue`
- [x] `GroupsListV1.vue` + route `/groups`

## 4. Group detail
- [x] `stores/groupDetail.ts`
- [x] `GroupHeaderV1.vue`
- [x] `GroupRegularsV1.vue`
- [x] `FyBarChartV1.vue`
- [x] `WordCloudV1.vue`
- [x] `SessionsListV1.vue`
- [x] `GroupDetailV1.vue` (assembler)
- [x] `GroupDetailPage.vue` + route `/groups/:key`

## 5. Homepage additions
- [x] `FyBarChartV1` + `WordCloudV1` — below calendar, using all sessions
- [x] `MediaGallery` — all sessions with cover photos, newest first, click → session

## 6. Sessions listing
- [x] `SessionsFilterV1.vue` — FY, search, group, tag (Advanced)
- [x] `TagPickerV1.vue` — reusable tag tree picker (used by filter; will be reused for bulk tagging)
- [x] `SessionResultsV1.vue` — results list
- [x] `SessionsPage.vue` + route `/sessions`

## 7. Session detail — admin panel
- [x] `SessionTagsV1.vue` — tag pills (all); add/remove (checkin/admin)
- [x] `SessionActionButtonsV1.vue` — own component (not in header); Upload Photos + Edit Session
- [x] `SessionEditModalV1.vue` — edit modal; admin: date/group/eventbriteId/delete
- [x] `AddEntryModalV1.vue` — volunteer search → POST entry (modal, no separate page)
- [x] `SetHoursModalV1.vue` — bulk hours for checked-in/0h entries
- [x] `EntriesListV1.vue` — self-contained; check-in/hours/tags; Add/Set Hours/Refresh
- [x] `SessionDetailPage.vue` — wired in all new components

## 8. Profiles listing
- [ ] `stores/profiles.ts`
- [ ] `ProfilesPage.vue` + route `/profiles`

## 9. Profile detail
- [ ] `stores/profileDetail.ts`
- [ ] `ProfileDetailPage.vue` + route `/profiles/:slug`

## 10. Admin page
- [ ] `AdminPage.vue` + route `/admin`

## Tech debt
- [x] `WordCloudV1.vue` — accepts `TagHoursItem[]`; callers fetch from `/api/tags/hours-by-taxonomy` and pass result in
- [ ] V1 components to receive clean typed props rather than raw `SessionResponse[]` (post-migration incremental pass)
- [x] `main.css` colour palette tidy — consolidate `--color-dtv-*` brand colours and `--color-*` neutral/state tokens into a single well-organised block with section comments; remove any unused vars
