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
- [ ] `stores/sessions.ts` — extend with FY/group/tag filter + search state
- [ ] `SessionsPage.vue` + route `/sessions`

## 7. Session detail — admin panel
- [ ] `EntriesListV1.vue`
- [ ] `ConfirmModalV1.vue`
- [ ] `SessionDetailPage.vue` — add admin panel

## 8. Add entry
- [ ] `AddEntryPage.vue` + route `/sessions/:groupKey/:date/add-entry`

## 9. Entry detail
- [ ] `stores/entryDetail.ts`
- [ ] `EntryDetailPage.vue` + route `/entries/:id`

## 10. Volunteers
- [ ] `stores/profiles.ts`
- [ ] `VolunteersPage.vue` + route `/profiles`

## 11. Profile detail
- [ ] `stores/profileDetail.ts`
- [ ] `ProfileDetailPage.vue` + route `/profiles/:slug`

## 12. Admin page
- [ ] `AdminPage.vue` + route `/admin`

## Tech debt
- [x] `WordCloudV1.vue` — accepts `TagHoursItem[]`; callers fetch from `/api/tags/hours-by-taxonomy` and pass result in
- [ ] V1 components to receive clean typed props rather than raw `SessionResponse[]` (post-migration incremental pass)
