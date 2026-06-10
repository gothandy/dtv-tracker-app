<template>
  <div class="pdc-wrap">
    <div class="pdc-header">
      <h2 class="font-hero text-dtv-dark text-xl uppercase leading-none m-0">Documents</h2>
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

    <p v-else-if="allowManage && !hasFiles" class="pdc-empty">No documents yet.</p>

    <div v-else-if="hasFiles" class="pdc-tree">
      <DocsSection
        :nodes="tree"
        :depth="0"
        subsection-headings
        :allow-manage="allowManage"
        :deleting-ids="deletingIds"
        @delete="onDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import DocsSection from '../docs/DocsSection.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import { projectUploadPath } from '../../router/index'
import { docsTreeHasFiles } from '../../utils/docsTree'
import type { DocsTreeNode } from '../../../../types/api-responses'

const props = withDefaults(
  defineProps<{
    tree: DocsTreeNode[]
    projectKey: string
    loading?: boolean
    error?: string | null
    allowManage?: boolean
    deletingIds?: Set<string>
  }>(),
  { deletingIds: () => new Set<string>() }
)

const emit = defineEmits<{ delete: [itemId: string] }>()

const hasFiles = computed(() => docsTreeHasFiles(props.tree))

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
  margin-bottom: 1rem;
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
