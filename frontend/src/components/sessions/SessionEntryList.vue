<template>
  <div class="sel-wrap">

    <!-- Header -->
    <div class="sel-header">
      <h2 class="sel-title">
        Check-ins
        <span v-if="entries.length" class="sel-count">({{ checkedCount }} / {{ entries.length }})</span>
      </h2>
      <div v-if="allowEdit" class="sel-actions">
        <AppButton label="Refresh" icon="refresh" mode="icon-responsive" :working="refreshWorking" @click="emit('refreshRequest')" />
        <AppButton label="Set Hours" icon="clock" mode="icon-responsive" :disabled="eligibleCount === 0" @click="showSetHours = true" />
        <AppButton label="Add" icon="add" mode="icon-responsive" @click="showAdd = true" />
      </div>
    </div>

    <EntryList>
      <EntryCard
        v-for="e in entries"
        :key="e.id"
        :title="e.profile.name"
        :title-to="allowEdit ? undefined : (e.profile.slug ? profilePath(e.profile.slug) : undefined)"
        :checked-in="e.checkedIn"
        :hours="e.hours"
        :icons="iconsForEntry({ ...e.profile, notes: e.notes })"
        :allow-edit="allowEdit"
        :working="workingId === e.id"
        @update="(c, h) => emit('update', e, c, h)"
        @edit-entry="editingEntry = e"
      />
    </EntryList>

    <EntryEditModal
      v-if="editingEntry"
      :entry="editingEntry"
      view-label="View Profile"
      view-icon="profile"
      :view-to="editingEntry.profile.slug ? profilePath(editingEntry.profile.slug) : undefined"
      :working="workingEdit"
      :error="editError"
      @close="closeEditModal"
      @save="onSave"
      @delete="onDelete"
    />

    <EntryAddModal
      v-if="showAdd"
      :profiles="profiles"
      :working="workingAdd"
      :error="addError"
      @close="closeAddModal"
      @add="onAdd"
    />

    <SessionSetHoursModal
      v-if="showSetHours"
      :entry-count="eligibleCount"
      :default-hours="3"
      :working="workingSetHours"
      :error="setHoursError"
      @close="closeSetHoursModal"
      @set-hours="onSetHours"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EntryItem } from '../../types/entry'
import type { PickerProfile } from '../ProfilePicker.vue'
import AppButton from '../AppButton.vue'
import EntryList from '../EntryList.vue'
import EntryCard from '../EntryCard.vue'
import EntryEditModal from '../../pages/modals/EntryEditModal.vue'
import EntryAddModal from '../../pages/modals/EntryAddModal.vue'
import SessionSetHoursModal from '../../pages/modals/SessionSetHoursModal.vue'
import { profilePath } from '../../router/index'
import { iconsForEntry } from '../../utils/tagIcons'

type AddPayload = { profileId: number } | { newName: string; newEmail: string }
type EditData = { checkedIn: boolean; count: number; hours: number; notes: string }

const props = defineProps<{
  entries: EntryItem[]
  allowEdit: boolean
  profiles: PickerProfile[]
  workingId?: number | null
  refreshWorking?: boolean
}>()

const emit = defineEmits<{
  refreshRequest: []
  update: [entry: EntryItem, checkedIn: boolean, hours: number]
  setHours: [hours: number]
  addEntry: [payload: AddPayload]
  editEntry: [id: number, data: EditData | null]
}>()

const editingEntry = ref<EntryItem | null>(null)
const showAdd = ref(false)
const showSetHours = ref(false)
const workingEdit = ref(false)
const workingAdd = ref(false)
const workingSetHours = ref(false)
const editError = ref('')
const addError = ref('')
const setHoursError = ref('')

const checkedCount = computed(() => props.entries.filter(e => e.checkedIn).length)
const eligibleCount = computed(() => props.entries.filter(e => e.checkedIn && !e.hours).length)

function closeEditModal() {
  editingEntry.value = null
  workingEdit.value = false
  editError.value = ''
}

function closeAddModal() {
  showAdd.value = false
  workingAdd.value = false
  addError.value = ''
}

function closeSetHoursModal() {
  showSetHours.value = false
  workingSetHours.value = false
  setHoursError.value = ''
}

function onSave(data: EditData) {
  if (!editingEntry.value) return
  workingEdit.value = true
  editError.value = ''
  emit('editEntry', editingEntry.value.id, data)
}

function onDelete() {
  if (!editingEntry.value) return
  workingEdit.value = true
  editError.value = ''
  emit('editEntry', editingEntry.value.id, null)
}

function onAdd(payload: AddPayload) {
  workingAdd.value = true
  addError.value = ''
  emit('addEntry', payload)
}

function onSetHours(hours: number) {
  workingSetHours.value = true
  setHoursError.value = ''
  emit('setHours', hours)
}

defineExpose({
  onEditSuccess: closeEditModal,
  onEditError(msg: string) { workingEdit.value = false; editError.value = msg },
  onAddSuccess: closeAddModal,
  onAddError(msg: string) { workingAdd.value = false; addError.value = msg },
  onSetHoursSuccess: closeSetHoursModal,
  onSetHoursError(msg: string) { workingSetHours.value = false; setHoursError.value = msg },
})
</script>

<style scoped>
.sel-wrap {
  padding: 1.5rem;
  background: var(--color-white);
  color: var(--color-text);
}

.sel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.sel-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.sel-count {
  font-weight: 400;
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.sel-actions {
  display: flex;
  gap: 0.4rem;
}
</style>
