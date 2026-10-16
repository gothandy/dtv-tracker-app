<template>
  <div class="gab-wrap">
    <AppButton label="Add session" icon="add" mode="icon-responsive" @click="openAdd(null)" />
    <!-- A group linked to an Eventbrite series gets its sessions from the nightly sync. -->
    <AppButton v-if="!group.eventbriteSeriesId" label="Add" icon="brands/eventbrite" mode="icon-responsive" @click="openPicker" />
    <AppButton v-if="canEdit" label="Edit" icon="edit" mode="icon-responsive" @click="showEdit = true" />
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

    <GroupAddFromEventbriteModal
      v-if="showPicker"
      :events="eventbriteEvents"
      :events-loading="eventbriteLoading"
      :events-error="eventbriteError"
      @close="showPicker = false"
      @next="openAdd"
    />

    <GroupAddSessionModal
      v-if="showAdd"
      :group="group"
      :projects="projects"
      :eventbrite="pickedEvent ?? undefined"
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
import GroupAddFromEventbriteModal, { type EventbriteEventOption } from '../../pages/modals/GroupAddFromEventbriteModal.vue'
import type { ProjectItem } from '../../pages/modals/SessionEditModal.vue'
import DeleteModal from '../../pages/modals/DeleteModal.vue'

const props = defineProps<{
  group: GroupDetailResponse
  projects: ProjectItem[]
  /** Edit (and delete) the group: Admin only. Adding sessions is Check In and Admin. */
  canEdit: boolean
  /** One-off DTV Eventbrite events not yet in the tracker, loaded by the page on loadEventbrite. */
  eventbriteEvents: EventbriteEventOption[]
  eventbriteLoading?: boolean
  eventbriteError?: string
}>()
const emit = defineEmits<{
  editGroup: [data: EditGroupPayload]
  addSession: [data: AddSessionPayload]
  deleteGroup: []
  loadEventbrite: []
}>()

const showEdit = ref(false)
const showDelete = ref(false)
const showAdd = ref(false)
const showPicker = ref(false)
const pickedEvent = ref<EventbriteEventOption | null>(null)

function openPicker() {
  showPicker.value = true
  emit('loadEventbrite')
}

/** Add Session, blank or pre-filled from the picked Eventbrite event. */
function openAdd(event: EventbriteEventOption | null) {
  pickedEvent.value = event
  showPicker.value = false
  showAdd.value = true
}

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
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
}
</style>
