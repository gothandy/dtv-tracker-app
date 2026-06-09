<template>
  <section
    v-for="node in folderNodes"
    :key="node.slug"
    :id="sectionId(node)"
    class="docs-folder"
  >
    <h2 v-if="headingLevel === 2" class="text-xl font-bold mb-2 mt-6">{{ node.name }}</h2>
    <h3 v-else-if="headingLevel === 3" class="text-lg font-bold mb-2 mt-4">{{ node.name }}</h3>
    <p v-else class="font-bold mb-2 mt-3">{{ node.name }}</p>

    <DocsSection
      v-if="node.children?.length"
      :nodes="node.children"
      :depth="depth + 1"
      :prefix="sectionId(node)"
    />
  </section>

  <div v-if="fileNodes.length" class="pdc-grid docs-file-grid">
    <DocLozengeLink
      v-for="file in fileNodes"
      :key="file.slug"
      :label="file.name"
      :url="file.url!"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DocsTreeNode } from '../../../../types/api-responses'
import DocLozengeLink from './DocLozengeLink.vue'

defineOptions({ name: 'DocsSection' })

const props = defineProps<{
  nodes: DocsTreeNode[]
  depth: number
  prefix?: string
}>()

const folderNodes = computed(() => props.nodes.filter(n => n.type === 'folder'))
const fileNodes = computed(() => props.nodes.filter(n => n.type === 'file' && n.url))

const headingLevel = computed(() => {
  if (props.depth === 0) return 2
  if (props.depth === 1) return 3
  return 0
})

function sectionId(node: DocsTreeNode): string {
  const segment = node.slug
  return props.prefix ? `${props.prefix}/${segment}` : segment
}
</script>

<style scoped>
.docs-file-grid {
  margin-bottom: 0.75rem;
}
</style>
