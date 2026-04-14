<template>
  <div class="gab-wrap">
    <AppButton label="Add session" icon="add" mode="icon-responsive" @click="showAdd = true" />
    <AppButton label="Edit" icon="edit" mode="icon-responsive" @click="showEdit = true" />
    <AppButton
      v-if="group.eventbriteSeriesId"
      label="View on Eventbrite"
      icon="brands/eventbrite"
      mode="icon-only"
      :href="`https://www.eventbrite.co.uk/e/${group.eventbriteSeriesId}`"
      target="_blank"
    />

    <GroupEditModal
      v-if="showEdit"
      :group="group"
      :working="workingEdit"
      :error="editError"
      @close="showEdit = false"
      @save="onSaveEdit"
      @delete="showEdit = false; showDelete = true"
    />

    <GroupAddSessionModal
      v-if="showAdd"
      :group="group"
      :working="workingAdd"
      :error="addError"
      @close="showAdd = false"
      @add="onAdd"
    />

    <DeleteModal
      v-if="showDelete"
      :title="`Delete ${group.displayName || group.key}?`"
      body="This will permanently delete the group and cannot be undone."
      :working="workingDelete"
      @close="showDelete = false"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { GroupDetailResponse } from '../../../../types/api-responses'
import AppButton from '../AppButton.vue'
import GroupEditModal, { type EditGroupPayload } from '../../pages/modals/GroupEditModal.vue'
import GroupAddSessionModal, { type AddSessionPayload } from '../../pages/modals/GroupAddSessionModal.vue'
import DeleteModal from '../../pages/modals/DeleteModal.vue'

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

function onSaveEdit(payload: EditGroupPayload) {
  workingEdit.value = true
  editError.value = ''
  emit('editGroup', payload)
}

function onAdd(payload: AddSessionPayload) {
  workingAdd.value = true
  addError.value = ''
  emit('addSession', payload)
}

function onConfirmDelete() {
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
</style>
