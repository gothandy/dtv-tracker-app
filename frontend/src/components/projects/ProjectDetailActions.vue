<template>
  <div class="pda-wrap">
    <AppButton icon="share" label="Share" mode="icon-only" @click="onShare" />
    <AppButton v-if="canEdit" label="Edit" icon="edit" mode="icon-responsive" @click="showEdit = true" />

    <ProjectEditModal
      v-if="showEdit"
      :project="project"
      :statuses="statuses"
      :can-delete="profile.isAdmin"
      :working="workingEdit"
      :error="editError || statusesError"
      @close="showEdit = false"
      @save="onSaveEdit"
      @delete="showEdit = false; showDelete = true"
    />

    <DeleteModal
      v-if="showDelete"
      :title="`Delete ${project.displayName || project.key}?`"
      body="This will permanently delete the project. Linked sessions will keep their data but lose the project link."
      :working="workingDelete"
      @close="showDelete = false"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ProjectDetailResponse } from '../../../../types/api-responses'
import type { RoleContext } from '../../composables/useViewer'
import AppButton from '../AppButton.vue'
import ProjectEditModal, { type EditProjectPayload } from '../../pages/modals/ProjectEditModal.vue'
import DeleteModal from '../../pages/modals/DeleteModal.vue'
import { shareCurrentUrl } from '../../utils/shareUrl'

defineProps<{
  project: ProjectDetailResponse
  profile: RoleContext
  /** Add and edit projects (permission editProjects) */
  canEdit: boolean
  /** The Projects list's Status choices, for Edit */
  statuses: string[]
  /** Set when the choices couldn't be loaded */
  statusesError?: string
}>()

const emit = defineEmits<{
  editProject: [data: EditProjectPayload]
  deleteProject: []
}>()

const showEdit = ref(false)
const showDelete = ref(false)
const workingEdit = ref(false)
const workingDelete = ref(false)
const editError = ref('')

function onShare() {
  shareCurrentUrl()
}

function onSaveEdit(payload: EditProjectPayload) {
  workingEdit.value = true
  editError.value = ''
  emit('editProject', payload)
}

function onConfirmDelete() {
  workingDelete.value = true
  emit('deleteProject')
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
  onDeleteSuccess() {
    showDelete.value = false
    workingDelete.value = false
  },
})
</script>

<style scoped>
.pda-wrap {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
}
</style>
