<template>
  <div class="pdc-wrap">
    <div class="pdc-header">
      <h3 class="pdc-title">Documents</h3>
      <AppButton
        v-if="allowManage && projectKey"
        label="Upload docs"
        icon="upload"
        mode="icon-responsive"
        variant="subtle"
        :href="projectUploadPath(projectKey)"
      />
    </div>

    <LoadingSpinner v-if="loading" />

    <p v-else-if="error" class="pdc-error">{{ error }}</p>

    <p v-else-if="allowManage && !attachments.length" class="pdc-empty">No documents yet.</p>

    <div v-else-if="attachments.length" class="pdc-grid">
      <DocLozengeLink
        v-for="doc in attachments"
        :key="doc.id"
        :label="doc.name"
        :url="doc.url"
        :removable="allowManage"
        :deleting="props.deletingIds.has(doc.id)"
        @remove="onDelete(doc.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../AppButton.vue'
import DocLozengeLink from '../docs/DocLozengeLink.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import { projectUploadPath } from '../../router/index'
import type { ProjectAttachmentResponse } from '../../../../types/api-responses'

const props = withDefaults(
  defineProps<{
    attachments: ProjectAttachmentResponse[]
    projectKey: string
    loading?: boolean
    error?: string | null
    allowManage?: boolean
    deletingIds?: Set<string>
  }>(),
  { deletingIds: () => new Set<string>() }
)

const emit = defineEmits<{ delete: [itemId: string] }>()

function onDelete(itemId: string) {
  emit('delete', itemId)
}
</script>

<style scoped>
.pdc-wrap {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
  height: 100%;
}

.pdc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.pdc-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-dtv-dark);
}

.pdc-empty {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
}

.pdc-error {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-dtv-dirt);
}

</style>
