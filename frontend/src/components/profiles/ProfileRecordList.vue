<template>
  <div class="prl-wrap">
    <div class="prl-header">
      <h2 class="prl-title">Records</h2>
      <div class="prl-actions">
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
      <button
        v-for="r in records"
        :key="r.id"
        class="prl-pill"
        :class="`prl-pill--${r.status.toLowerCase().replace(/\s+/g, '-')}`"
        :disabled="!allowEdit"
        @click="allowEdit && openEdit(r)"
      >
        {{ r.type }} · {{ r.status }} · {{ formatDate(r.date) }}
      </button>
    </div>

    <RecordAddModal
      v-if="showAdd"
      :types="types"
      :statuses="statuses"
      :working="workingAdd"
      :error="addError"
      @close="showAdd = false"
      @add="onAdd"
    />

    <RecordEditModal
      v-if="editingRecord"
      :record="editingRecord"
      :statuses="statuses"
      :working="workingEdit"
      :error="editError"
      @close="editingRecord = null"
      @save="onSave"
      @delete="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ConsentRecordResponse } from '../../../../types/api-responses'
import RecordAddModal, { type AddRecordPayload } from '../../pages/modals/RecordAddModal.vue'
import RecordEditModal, { type SaveRecordPayload } from '../../pages/modals/RecordEditModal.vue'

const props = withDefaults(defineProps<{
  records: ConsentRecordResponse[]
  profileId: number
  profileSlug: string
  showConsentLink?: boolean
  allowEdit?: boolean
  types?: string[]
  statuses?: string[]
}>(), {
  types: () => [],
  statuses: () => [],
})

const emit = defineEmits<{
  addRecord: [payload: AddRecordPayload]
  saveRecord: [id: number, payload: SaveRecordPayload]
  deleteRecord: [id: number]
}>()

const showAdd = ref(false)
const editingRecord = ref<ConsentRecordResponse | null>(null)
const workingAdd = ref(false)
const workingEdit = ref(false)
const addError = ref('')
const editError = ref('')

function openAdd() {
  showAdd.value = true
}

function openEdit(r: ConsentRecordResponse) {
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

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

defineExpose({
  onAddSuccess() {
    showAdd.value = false
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

.prl-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  border: none;
  background: var(--color-dtv-sand);
  color: var(--color-text);
  cursor: default;
  appearance: none;
}

button.prl-pill:not(:disabled) {
  cursor: pointer;
}
button.prl-pill:not(:disabled):hover {
  opacity: 0.8;
}

.prl-pill--accepted { background: var(--color-dtv-sand); color: var(--color-dtv-green-dark); }
.prl-pill--invited  { background: var(--color-dtv-sand); color: var(--color-dtv-gold-dark); }
.prl-pill--declined { background: var(--color-dtv-sand); color: var(--color-dtv-dirt); }
</style>
