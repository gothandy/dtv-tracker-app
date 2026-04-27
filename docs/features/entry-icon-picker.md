# Entry Icon Picker

## Overview

The `EntryIconPicker` component renders the editable label buttons inside the entry edit modal. It handles all manual labels an organiser can set or unset on a specific entry.

**File:** `frontend/src/components/EntryIconPicker.vue`

---

## Picker buttons

All buttons are always visible. Selected state is derived from the current labels array or native fields.

| Button | Label stored | Notes |
|--------|-------------|-------|
| Child | *(no label)* | Fake button — toggles the Accompanying Adult dropdown; not stored as a label |
| Dig Lead | `DigLead` | |
| CSR | `CSR` | |
| Late | `Late` | |
| First Aider | `FirstAider` | Always shown; tooltip shows "On Duty" when active |

Child is hardcoded inside `EntryIconPicker` itself. It is always displayed; its selected state is driven by the `isChild` prop. When clicked, the picker emits `toggleChild` and the modal handles enabling/disabling the Accompanying Adult dropdown.

---

## First Aider button

The button is always shown and acts as a simple yes/no toggle for the `FirstAider` label.

- Unselected → tooltip: *"Set First Aider"*
- Selected → tooltip: *"Unset First Aider (On Duty)"*

---

## Icon summary

The component renders a read-only icon summary above the buttons. The parent computes the icon list via `iconsForEntry()` and passes it as the `summary` prop. The summary updates live as the user toggles labels and the child button.

> **Note:** The icons displayed on `EntryCard` (entry list rows) must mirror this summary table. Any addition here should be reflected there.

| Icon | Source | Notes |
|------|--------|-------|
| Charity Member | `profile.isMember` | If a group entry ever has isMember=true, a warning should be raised |
| Benefits Card | `profile.cardStatus === 'Accepted'` | |
| Card Invited | `profile.cardStatus === 'Invited'` | Orange variant |
| Group / Company | `profile.isGroup` | |
| Profile Warning | `profile.hasProfileWarning` | Red |
| Child | `accompanyingAdultId !== null` | Reflects current dropdown selection, not a label |
| Eventbrite | `entry.eventbriteAttendeeId` | |
| New | `entry.isNew` | Profile's first-ever session |
| No Photo | `profile.noPhoto` | GDPR — always reflects current consent status |
| Regular | `labels.includes('Regular')` | Set by session refresh, not the picker |
| First Aider (On Duty) | `labels.includes('FirstAider')` | Green |
| First Aider (Certified) | `isFirstAiderAvailable && !labels.includes('FirstAider')` | Subdued; based on valid cert for session date |
| Dig Lead | `labels.includes('DigLead')` | |
| CSR | `labels.includes('CSR')` | |
| Late | `labels.includes('Late')` | |

---

## Props

| Prop | Type | Description |
|------|------|-------------|
| `modelValue` | `string[]` | Current labels array (v-model) |
| `summary` | `LabelIcon[]?` | Icons to display above the buttons — computed by parent via `iconsForEntry()` |
| `isChild` | `boolean?` | Whether the Child button is selected (accompanying adult is set) |
| `disabled` | `boolean?` | Disables all buttons (while save is in progress) |

**Emits:**

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string[]` | New labels array after a label is toggled |
| `toggleChild` | — | Child button was clicked; parent enables/disables the Accompanying Adult dropdown |

---

## Related files

- `frontend/src/utils/labelIcons.ts` — `EDITABLE_LABEL_ICONS`, `LabelIcon` type, `iconsForEntry()`
- `frontend/src/pages/modals/EntryEditModal.vue` — hosts the picker; computes `entryIcons` via `iconsForEntry()`
- `frontend/src/components/EntryCard.vue` — entry list row; should mirror the summary icon set
- `types/entry-labels.ts` — `EntryLabel` type (`'Regular' | 'CSR' | 'Late' | 'FirstAider' | 'DigLead'`)
- `backend/services/profile-stats.ts` — computes `isFirstAider` on profile stats
