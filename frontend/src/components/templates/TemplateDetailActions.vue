<template>
  <div class="tda-wrap">
    <AppButton icon="share" label="Share" mode="icon-only" @click="onShare" />
    <AppButton v-if="canEdit" label="Edit" icon="edit" mode="icon-responsive" @click="onEditClick" />

    <TemplateEditModal
      v-if="showEdit"
      :template="template"
      :working="workingEdit"
      :error="editError"
      @close="showEdit = false"
      @save="onSaveEdit"
      @delete="showEdit = false; showDelete = true"
    />

    <DeleteModal
      v-if="showDelete"
      :title="`Delete ${template.title}?`"
      body="This will permanently delete the email template."
      :working="workingDelete"
      @close="showDelete = false"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { confirmDiscard } from '../../composables/useUnsavedChanges'
import type { TemplateDetailResponse } from '../../../../types/api-responses'
import AppButton from '../AppButton.vue'
import TemplateEditModal, { type EditTemplatePayload } from '../../pages/modals/TemplateEditModal.vue'
import DeleteModal from '../../pages/modals/DeleteModal.vue'
import { shareCurrentUrl } from '../../utils/shareUrl'

const props = defineProps<{
  template: TemplateDetailResponse
  /** Edit and delete templates (permission editTemplates) */
  canEdit: boolean
  /** The page has unsaved Source edits: Edit asks to discard them first */
  unsaved?: boolean
}>()

const emit = defineEmits<{
  editTemplate: [data: EditTemplatePayload]
  deleteTemplate: []
  /** The user agreed to discard the page's unsaved Source edits */
  discardEdits: []
}>()

const showEdit = ref(false)
const showDelete = ref(false)
const workingEdit = ref(false)
const workingDelete = ref(false)
const editError = ref('')

// The source is edited on the page, so Edit (and Delete, inside it) can't run alongside
// unsaved edits: ask to discard them first, or stay.
function onEditClick() {
  if (!confirmDiscard(!!props.unsaved, 'You have unsaved changes to this template. Discard them?')) return
  if (props.unsaved) emit('discardEdits')
  showEdit.value = true
}

function onShare() {
  shareCurrentUrl()
}

function onSaveEdit(payload: EditTemplatePayload) {
  workingEdit.value = true
  editError.value = ''
  emit('editTemplate', payload)
}

function onConfirmDelete() {
  workingDelete.value = true
  emit('deleteTemplate')
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
.tda-wrap {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
}
</style>
