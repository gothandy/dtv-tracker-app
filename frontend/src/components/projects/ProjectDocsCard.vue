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
      <span
        v-for="doc in attachments"
        :key="doc.id"
        class="pdc-lozenge"
        :class="{ 'pdc-lozenge-deleting': props.deletingIds.has(doc.id) }"
      >
        <a
          :href="doc.webUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="pdc-name"
          :title="doc.name"
        >{{ doc.name }}</a>
        <button
          v-if="allowManage"
          type="button"
          class="pdc-remove"
          aria-label="Remove document"
          :disabled="props.deletingIds.has(doc.id)"
          @click="onDelete(doc.id)"
        >
          <img src="/icons/close.svg" width="10" height="10" alt="" class="svg-black" />
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../AppButton.vue'
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

.pdc-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pdc-lozenge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-dtv-sand);
  padding: 0.5rem 0.75rem;
  border: 2px solid transparent;
  max-width: 100%;
}

.pdc-lozenge:hover {
  background: var(--color-dtv-sand-dark);
}

.pdc-lozenge-deleting {
  opacity: 0.55;
}

.pdc-name {
  font-size: 0.9rem;
  color: var(--color-text);
  text-decoration: none;
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdc-name:hover {
  text-decoration: underline;
}

.pdc-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pdc-remove:hover img {
  filter: invert(20%) sepia(95%) saturate(5000%) hue-rotate(0deg) brightness(90%) contrast(90%);
}

.pdc-remove:disabled {
  cursor: wait;
  opacity: 0.5;
}
</style>
