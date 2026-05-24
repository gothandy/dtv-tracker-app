<template>
  <div class="pdh-header">
    <p v-if="project.description" class="pdh-description">{{ project.description }}</p>
    <MetadataTagsPanel
      v-if="(project.metadata?.length ?? 0) > 0 || allowEdit"
      :metadata="project.metadata"
      :allow-edit="allowEdit"
      :working="tagWorking"
      :error="tagError"
      :tree="tree"
      :taxonomy-loading="taxonomyLoading"
      @save-tags="emit('saveTags', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import MetadataTagsPanel from '../sessions/MetadataTagsPanel.vue'
import type { TaxNode } from '../../composables/useTaxonomy'
import type { ProjectDetailResponse } from '../../../../types/api-responses'

defineProps<{
  project: ProjectDetailResponse
  allowEdit: boolean
  tagWorking: boolean
  tagError?: string
  tree: TaxNode[]
  taxonomyLoading?: boolean
}>()

const emit = defineEmits<{ saveTags: [tags: Array<{ label: string; termGuid: string }>] }>()
</script>

<style scoped>
.pdh-header {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}

.pdh-description {
  color: var(--color-text-secondary);
  margin-top: 0;
  margin-bottom: 0.75rem;
  line-height: 1.5;
}
</style>
