<template>
  <div class="tda-wrap">
    <AppButton icon="share" label="Share" mode="icon-only" @click="onShare" />
    <AppButton v-if="canEdit" label="Edit" icon="edit" mode="icon-responsive" @click="showEdit = true" />

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
import type { TemplateDetailResponse } from '../../../../types/api-responses'
import AppButton from '../AppButton.vue'
import TemplateEditModal, { type EditTemplatePayload } from '../../pages/modals/TemplateEditModal.vue'
import DeleteModal from '../../pages/modals/DeleteModal.vue'
import { shareCurrentUrl } from '../../utils/shareUrl'

defineProps<{
  template: TemplateDetailResponse
  /** Edit and delete templates (permission editTemplates) */
  canEdit: boolean
}>()

const emit = defineEmits<{
  editTemplate: [data: EditTemplatePayload]
  deleteTemplate: []
}>()

const showEdit = ref(false)
const showDelete = ref(false)
const workingEdit = ref(false)
const workingDelete = ref(false)
const editError = ref('')

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
