<template>
  <div class="prl-wrap">
    <div class="prl-header">
      <h2 class="prl-title">Records</h2>
      <div class="prl-actions">
        <RouterLink v-if="viewAllTo" :to="viewAllTo" class="prl-link">View All</RouterLink>
        <a
          v-if="showConsentLink"
          :href="`/profiles/${profileSlug}/consent`"
          class="prl-link"
        >Consent</a>
        <button
          v-if="allowEdit"
          class="prl-add-btn"
          @click="openAdd"
        >+ Add</button>
      </div>
    </div>

    <p v-if="!records.length" class="prl-empty">No records.</p>

    <div v-else class="prl-list">
      <RecordChip
        v-for="r in records"
        :key="r.id"
        :record="r"
        :disabled="!allowEdit"
        @click="allowEdit && openEdit(r)"
      />
    </div>

    <RecordAddModal
      v-if="showAdd"
      :states="states"
      :initial-type="addPrefill?.type"
      :initial-status="addPrefill?.status"
      :working="workingAdd"
      :error="addError"
      @close="showAdd = false; addPrefill = null"
      @add="onAdd"
    />

    <RecordEditModal
      v-if="editingRecord"
      :record="editingRecord"
      :states="states"
      :working="workingEdit"
      :error="editError"
      :archive-click="showArchive ? () => emit('viewArchive', editingRecord!) : undefined"
      :is-current="isCurrentRecord(records, editingRecord)"
      @change-state="onChangeState"
      @close="editingRecord = null"
      @save="onSave"
      @delete="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { RecordResponse } from '../../../../types/api-responses'
import type { RecordState } from '../../../../types/record-state'
import RecordChip from '../records/RecordChip.vue'
import { isCurrentRecord } from '../../utils/currentRecord'
import RecordAddModal, { type AddRecordPayload } from '../../pages/modals/RecordAddModal.vue'
import RecordEditModal, { type SaveRecordPayload } from '../../pages/modals/RecordEditModal.vue'

const props = withDefaults(defineProps<{
  records: RecordResponse[]
  profileId: number
  profileSlug: string
  showConsentLink?: boolean
  allowEdit?: boolean
  /** The Records page filtered to this Profile; shows View All (viewRecords). */
  viewAllTo?: string
  /** Shows View Archive in Edit Record (viewRecords); the page goes there on viewArchive. */
  showArchive?: boolean
  /** The States list, for Add and Edit. */
  states?: RecordState[]
}>(), {
  states: () => [],
})

const emit = defineEmits<{
  addRecord: [payload: AddRecordPayload]
  saveRecord: [id: number, payload: SaveRecordPayload]
  deleteRecord: [id: number]
  viewArchive: [record: RecordResponse]
}>()

const showAdd = ref(false)
const editingRecord = ref<RecordResponse | null>(null)
const workingAdd = ref(false)
const workingEdit = ref(false)
const addError = ref('')
const editError = ref('')

/** Type and State for Add, when it opens from Edit Record's change of State. */
const addPrefill = ref<{ type: string; status: string } | null>(null)

function openAdd() {
  addPrefill.value = null
  showAdd.value = true
}

/** A new State for the current Record: add a new Record, pre-filled (#322 §1). */
function onChangeState(status: string) {
  addPrefill.value = { type: editingRecord.value!.type, status }
  editingRecord.value = null
  showAdd.value = true
}

function openEdit(r: RecordResponse) {
  editingRecord.value = r
}

function onAdd(payload: AddRecordPayload) {
  workingAdd.value = true
  addError.value = ''
  emit('addRecord', payload)
}

function onSave(payload: SaveRecordPayload) {
  workingEdit.value = true
  editError.value = ''
  emit('saveRecord', editingRecord.value!.id, payload)
}

function onDelete() {
  workingEdit.value = true
  editError.value = ''
  emit('deleteRecord', editingRecord.value!.id)
}

defineExpose({
  onAddSuccess() {
    showAdd.value = false
    addPrefill.value = null
    workingAdd.value = false
    addError.value = ''
  },
  onAddError(msg: string) {
    workingAdd.value = false
    addError.value = msg
  },
  onSaveSuccess() {
    editingRecord.value = null
    workingEdit.value = false
    editError.value = ''
  },
  onSaveError(msg: string) {
    workingEdit.value = false
    editError.value = msg
  },
  onDeleteSuccess() {
    editingRecord.value = null
    workingEdit.value = false
    editError.value = ''
  },
})
</script>

<style scoped>
.prl-wrap {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}

.prl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.prl-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.prl-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.prl-link {
  font-size: 0.85rem;
  color: var(--color-dtv-green);
  text-decoration: none;
}
.prl-link:hover { text-decoration: underline; }

.prl-add-btn {
  font-size: 0.85rem;
  background: none;
  border: none;
  color: var(--color-dtv-green);
  cursor: pointer;
  padding: 0;
}

.prl-empty {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
}

.prl-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
