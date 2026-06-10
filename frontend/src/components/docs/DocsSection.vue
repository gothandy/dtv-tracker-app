<template>
  <div v-if="fileNodes.length" class="pdc-grid docs-file-grid">
    <DocLozengeLink
      v-for="file in fileNodes"
      :key="file.slug"
      :label="file.name"
      :url="file.url!"
      :removable="allowManage && !!file.id"
      :deleting="!!file.id && deletingIds?.has(file.id)"
      @remove="file.id && emit('delete', file.id)"
    />
  </div>

  <section
    v-for="node in folderNodes"
    :key="node.slug"
    :id="sectionId(node)"
    class="docs-folder"
  >
    <h3
      v-if="folderHeadingLevel === 3"
      :class="folderHeadingClass(3)"
    >{{ node.name }}</h3>
    <h4
      v-else-if="folderHeadingLevel === 4"
      :class="folderHeadingClass(4)"
    >{{ node.name }}</h4>
    <p
      v-else
      :class="folderHeadingClass(0)"
    >{{ node.name }}</p>

    <DocsSection
      v-if="node.children?.length"
      :nodes="node.children"
      :depth="depth + 1"
      :prefix="sectionId(node)"
      :subsection-headings="subsectionHeadings"
      :allow-manage="allowManage"
      :deleting-ids="deletingIds"
      @delete="emit('delete', $event)"
    />
  </section>
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
  /** When true (project detail card), folder headings sit below a hero section title. */
  subsectionHeadings?: boolean
  allowManage?: boolean
  deletingIds?: Set<string>
}>()

const emit = defineEmits<{ delete: [itemId: string] }>()

const byName = (a: DocsTreeNode, b: DocsTreeNode) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

const fileNodes = computed(() =>
  props.nodes.filter(n => n.type === 'file' && n.url).sort(byName)
)
const folderNodes = computed(() =>
  props.nodes.filter(n => n.type === 'folder').sort(byName)
)

const folderHeadingLevel = computed(() => {
  if (props.depth === 0) return 3
  if (props.depth === 1) return 4
  return 0
})

function folderHeadingClass(level: 0 | 3 | 4): string {
  if (props.subsectionHeadings) {
    if (level === 3) return 'text-base font-bold mb-2 mt-4'
    if (level === 4) return 'text-sm font-bold mb-2 mt-3'
    return 'text-sm font-bold mb-2 mt-2'
  }
  if (level === 3) return 'text-xl font-bold mb-2 mt-6'
  if (level === 4) return 'text-lg font-bold mb-2 mt-4'
  return 'font-bold mb-2 mt-3'
}

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
