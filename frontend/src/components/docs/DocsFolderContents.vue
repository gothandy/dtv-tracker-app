<template>
  <div class="docs-folder-contents">
    <div v-if="files.length" class="pdc-grid docs-file-grid">
      <DocLozengeLink
        v-for="file in files"
        :key="file.slug"
        :label="file.name"
        :url="file.url!"
      />
    </div>

    <div v-if="subfolders.length" class="docs-subfolder-list">
      <DocsFolderLink
        v-for="folder in subfolders"
        :key="folder.slug"
        :label="folder.name"
        :to="docsSectionPath(...pathSegments, folder.slug)"
      />
    </div>

    <p v-if="!files.length && !subfolders.length" class="docs-empty">No documents in this section.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DocsTreeNode } from '../../../../types/api-responses'
import { docsSectionPath } from '../../router/index'
import { partitionDocsNodes } from '../../utils/docsTree'
import DocLozengeLink from './DocLozengeLink.vue'
import DocsFolderLink from './DocsFolderLink.vue'

const props = defineProps<{
  folder: DocsTreeNode
  pathSegments: string[]
}>()

const contents = computed(() => partitionDocsNodes(props.folder.children ?? []))
const subfolders = computed(() => contents.value.folders)
const files = computed(() => contents.value.files)
</script>

<style scoped>
.docs-folder-contents {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.docs-file-grid {
  margin-bottom: 0;
}

.docs-subfolder-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.docs-empty {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
</style>
