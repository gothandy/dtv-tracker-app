# Implementation Plan: SessionEntryList refactor

Internal plan `lazy-greeting-cascade.md`

## Context

`SessionDetailEntries.vue` owns its own data fetching and API calls, and the modals do the same. The goal is to lift all API calls to the page, make modals stateless forms, and introduce `SessionEntryList` as the new UI wrapper. The plan in `docs/plans/session-entry-list.md` describes the full scope. Two TODOs at the bottom amend it:

1. Use `working` (not `submitting`) as the prop name on modals — consistent with `EntryCard` which already uses `working`.
2. Consolidate emits: in `EntryCard`/`EntryList` rename `titleClick` → `editEntry` (semantic, not UI-mechanic). In `SessionEntryList` → page, combine `editEntry` + `deleteEntry` into one: `editEntry(id, data | null)` where `null` signals delete.

**Current state:** All old code still in place. Nothing from the plan has been implemented yet.

---

## Files to change

- `frontend/src/components/ModalLayout.vue`
- `frontend/src/components/EntryCard.vue`
- `frontend/src/components/EntryList.vue`
- `frontend/src/pages/modals/EditEntryModal.vue`
- `frontend/src/pages/modals/AddEntryModal.vue`
- `frontend/src/pages/modals/SetHoursModal.vue`
- `frontend/src/components/sessions/SessionEntryList.vue` *(new)*
- `frontend/src/components/sessions/SessionDetailEntries.vue` *(delete)*
- `frontend/src/pages/SessionDetailPage.vue`

And relevant Sandbox pages.

---

## Step-by-step changes

### 0. 'ModalLayout.vue'
- Needs to add a "isWorking: boolean" that disables the standard form. 3 layout buttons (cancel,delete,action) and overlays a transparent div to block controls. The button that was pressed (delete or action) goes into working state.
- Add working state example to sandbox. Implement using a 3 second timer on exit.
- Impacts #3,#4,#5

### 1. `EntryCard.vue`
- Session display + `allowEdit` → render name as `<button class="ec-name ec-name--btn">` instead of `RouterLink`.
- Emit `editEntry(entry)` on click (replaces plan's `titleClick`).
- Add `.ec-name--btn` scoped style.

### 2. `EntryList.vue`
- Passive lightweight control used only to arrange EntryCards on the page, no emits, no data props.
- Usage <EntryList><EntryCard/><EntryCard/></EntryList>
- SessionEntryList and ProfileEntryList do all the "work" orchestrating the EntryCards data direct.
- Initial layout is trivial list, but this will change in the future.

### 3. `EditEntryModal.vue`
- Remove `onMounted` fetch.
- Change prop: `entryId: number` → `entry: EntryItem` (use `entry.profile.name` for title, `entry.profile.slug` for View Profile).
- Initialise form from prop directly.
- Add `working: boolean` prop — disables buttons.
- Emits: `save(data: { checkedIn, count, hours, notes })`, `delete`, `close`. No API calls. Does not close itself.

### 4. `AddEntryModal.vue`
- Remove `onMounted` profile fetch.
- Add `profiles: PickerProfile[]` prop (passed from page/store).
- Add `working: boolean` prop — disables form including Add/Cancel/Delete buttons.
- Keep "Add New" flow (name + email) — the modal still assembles the payload.
- Emits: `addNew(payload: { profileId: number } | { newName: string; newEmail: string })`, `close`. No API calls. Does not close itself.
- Note: SessionEntryList will need an addNewEntry emit that sends this back to the page.

### 5. `SetHoursModal.vue`
- Remove API calls from `apply()`.
- Change prop: `entries: EntryResponse[]` → `entries: EntryItem[]` (only needs `id`, `checkedIn`, `hours`).
- Add `working: boolean` prop — disables Save button.
- Emits: `setHours(hours: number)`, `close`. Does not close itself.

### 6. New `SessionEntryList.vue` (`frontend/src/components/sessions/`)
**Props:** `entries: EntryItem[]`, `allowEdit: boolean`, `profiles: PickerProfile[]`

**Internal state:** `editingEntry: EntryItem | null`, `showAdd`, `showSetHours`, `workingEdit`, `workingAdd`, `workingSetHours`

**Emits (to page):**
- `refreshList` - In multi-user scenario goes checks server for new entry updates.
- `setHours(hours)` — SetHoursModal submitted
- `addEntry(payload)` — AddEntryModal submitted
- `editEntry(id, payload)` — EditEntryModal: `data` = save payload, used by modal and quick inline updates.
- `deleteEntry(id)`

**Wiring:**
- `EntryList @edit-entry` → `editingEntry = entry`
- `EditEntryModal @save` → emit `editEntry(id, data)`
- `EditEntryModal @delete` → emit `editEntry(id, null)`
- `AddEntryModal @add` → emit `addEntry(payload)`
- `setCheckedInHours @set-hours` → emit `setHours(hours)`
- in each case working UI is handled by SessionEntryList not the page. The page just holds waits for the operation to complete.
- Parent clears flag and closes modal on success; modal stays open + flag cleared on failure
- Header buttons (Add, Set Hours, Refresh) only when `allowEdit`

### 7. Delete `SessionDetailEntries.vue`

### 8. `SessionDetailPage.vue`
- Replace `SessionDetailEntries` import/usage with `SessionEntryList`.
- Add `entries` ref, fetch from `GET /api/sessions/:groupKey/:date` on mount (extract entries from response).
- Fetch profiles lazily (or on mount) for `AddEntryModal`.
- Pass `:entries`, `:allow-edit="profile.isOperational"`, `:profiles` to `SessionEntryList`.
- Handle emits:
  - `refreshList` → re-fetch entries
  - `setCheckedInHours(hours)` → PATCH all eligible entries in parallel, re-fetch
  - `addEntry(payload)` → `POST /api/sessions/:gk/:date/entries`, re-fetch
  - `editEntry(id, data)` → `PATCH /api/entries/:id data`, update local entry; close modal
  - `deleteEntry(id)` → `DELETE /api/entries/:id`, remove from entries; close modal

---

## Verification

**Admin/check-in:** entries load; name click → EditEntryModal opens with entry data; save/delete → page handles API, list re-renders. Add button → AddEntryModal with profiles; submit → page POSTs, list updates. Set Hours → page PATCHes. Refresh re-fetches.

**Read-only:** name is RouterLink to profile; no action buttons shown.
