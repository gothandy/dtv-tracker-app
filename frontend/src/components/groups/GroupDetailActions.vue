<template>
  <div class="gab-wrap">
    <AppButton label="Add session" icon="add" mode="icon-responsive" @click="showAdd = true" />
    <AppButton label="Edit" icon="edit" mode="icon-responsive" @click="openEdit" />
    <AppButton
      v-if="group.eventbriteSeriesId"
      label="View on Eventbrite"
      icon="eventbrite"
      mode="icon-only"
      :href="`https://www.eventbrite.co.uk/e/${group.eventbriteSeriesId}`"
      target="_blank"
    />

    <!-- Edit modal -->
    <div v-if="showEdit" class="v1-modal-overlay" @click.self="showEdit = false">
      <div class="v1-modal">
        <h3>Edit group</h3>
        <div class="v1-modal-field">
          <label>Display name</label>
          <input v-model="editName" type="text" />
        </div>
        <div class="v1-modal-field">
          <label>Key</label>
          <input v-model="editKey" type="text" />
        </div>
        <div class="v1-modal-field">
          <label>Description</label>
          <textarea v-model="editDesc"></textarea>
        </div>
        <div class="v1-modal-field">
          <label>Eventbrite series ID</label>
          <input v-model="editEbId" type="text" />
        </div>
        <p v-if="editError" class="v1-modal-error">{{ editError }}</p>
        <div class="v1-modal-buttons">
          <AppButton label="Cancel" @click="showEdit = false" />
          <AppButton label="Delete" icon="delete" mode="icon-responsive" variant="danger" style="margin-right:auto" @click="showEdit = false; showDelete = true" />
          <AppButton label="Save" :working="workingEdit" @click="saveEdit" />
        </div>
      </div>
    </div>

    <!-- Add session modal -->
    <div v-if="showAdd" class="v1-modal-overlay" @click.self="showAdd = false">
      <div class="v1-modal">
        <h3>New session</h3>
        <div class="v1-modal-field">
          <label>Date</label>
          <input v-model="newDate" type="date" />
        </div>
        <div class="v1-modal-field">
          <label>Display name (optional)</label>
          <input v-model="newName" type="text" :placeholder="group.displayName || group.key" />
        </div>
        <p v-if="addError" class="v1-modal-error">{{ addError }}</p>
        <div class="v1-modal-buttons">
          <AppButton label="Cancel" @click="showAdd = false" />
          <AppButton label="Create" :disabled="!newDate" :working="workingAdd" @click="submitAddSession" />
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="showDelete" class="v1-modal-overlay" @click.self="showDelete = false">
      <div class="v1-modal">
        <h3>Delete group?</h3>
        <p class="v1-modal-body">This will permanently delete <strong>{{ group.displayName || group.key }}</strong> and cannot be undone.</p>
        <div class="v1-modal-buttons">
          <AppButton label="Cancel" @click="showDelete = false" />
          <AppButton label="Delete" icon="delete" mode="icon-responsive" variant="danger" :working="workingDelete" @click="confirmDelete" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { GroupDetailResponse } from '../../../../types/api-responses'
import AppButton from '../AppButton.vue'

type EditGroupPayload = { name?: string; key: string; description?: string; eventbriteSeriesId?: string }
type AddSessionPayload = { groupId: number; date: string; name?: string }

const props = defineProps<{ group: GroupDetailResponse }>()
const emit = defineEmits<{
  editGroup: [data: EditGroupPayload]
  addSession: [data: AddSessionPayload]
  deleteGroup: []
}>()

const showEdit = ref(false)
const showDelete = ref(false)
const showAdd = ref(false)

const workingEdit = ref(false)
const workingAdd = ref(false)
const workingDelete = ref(false)
const editError = ref('')
const addError = ref('')

const newDate = ref('')
const newName = ref('')

const editName = ref('')
const editKey = ref('')
const editDesc = ref('')
const editEbId = ref('')

function openEdit() {
  editName.value = props.group.displayName || ''
  editKey.value = props.group.key
  editDesc.value = props.group.description || ''
  editEbId.value = props.group.eventbriteSeriesId || ''
  showEdit.value = true
}

function saveEdit() {
  workingEdit.value = true
  editError.value = ''
  emit('editGroup', {
    name: editName.value || undefined,
    key: editKey.value,
    description: editDesc.value || undefined,
    eventbriteSeriesId: editEbId.value || undefined,
  })
}

function submitAddSession() {
  workingAdd.value = true
  addError.value = ''
  emit('addSession', {
    groupId: props.group.id,
    date: newDate.value,
    name: newName.value || undefined,
  })
}

function confirmDelete() {
  workingDelete.value = true
  emit('deleteGroup')
}

defineExpose({
  onEditSuccess() {
    showEdit.value = false
    workingEdit.value = false
    editError.value = ''
  },
  onEditError(msg: string) {
    workingEdit.value = false
    editError.value = msg
  },
  onAddSuccess() {
    showAdd.value = false
    workingAdd.value = false
    addError.value = ''
    newDate.value = ''
    newName.value = ''
  },
  onAddError(msg: string) {
    workingAdd.value = false
    addError.value = msg
  },
  onDeleteSuccess() {
    showDelete.value = false
    workingDelete.value = false
  },
})
</script>

<style scoped>
.gab-wrap {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
}

.v1-modal-overlay {
  position: fixed; inset: 0; background: var(--color-overlay);
  z-index: 100; display: flex; align-items: center; justify-content: center;
}

.v1-modal {
  background: var(--color-white); padding: 1.5rem;
  box-shadow: var(--shadow-lg); width: 90%; max-width: 420px;
}

.v1-modal h3 { color: var(--color-text); margin-bottom: 1rem; font-size: 1.1rem; }

.v1-modal-body { color: var(--color-text-secondary); margin-bottom: 1rem; line-height: 1.5; }

.v1-modal-error { color: var(--color-dtv-red); font-size: 0.85rem; margin-bottom: 0.75rem; }

.v1-modal-field { margin-bottom: 1rem; }

.v1-modal-field label {
  display: block; font-size: 0.85rem; color: var(--color-text-label); margin-bottom: 0.3rem;
}

.v1-modal-field input,
.v1-modal-field textarea {
  width: 100%; font-size: 1rem; padding: 0.6rem 0.75rem;
  border: 2px solid var(--color-border); font-family: inherit;
  color: var(--color-text); background: var(--color-white); box-sizing: border-box;
}

.v1-modal-field textarea { min-height: 60px; resize: vertical; }

.v1-modal-field input:focus,
.v1-modal-field textarea:focus { outline: none; border-color: var(--color-dtv-green); }

.v1-modal-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
</style>
