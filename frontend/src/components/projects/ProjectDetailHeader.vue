<template>
  <div class="pdh-header">
    <p v-if="project.description" class="pdh-description">{{ project.description }}</p>
    <!-- Read-only: the tag is set in the Edit modal, as a project has just one. -->
    <MetadataTagsPanel
      v-if="(project.metadata?.length ?? 0) > 0"
      :metadata="project.metadata"
      :allow-edit="false"
      :working="false"
      :tree="tree"
      :taxonomy-loading="taxonomyLoading"
    />
  </div>
</template>

<script setup lang="ts">
import MetadataTagsPanel from '../sessions/MetadataTagsPanel.vue'
import type { TaxNode } from '../../composables/useTaxonomy'
import type { ProjectDetailResponse } from '../../../../types/api-responses'

defineProps<{
  project: ProjectDetailResponse
  tree: TaxNode[]
  taxonomyLoading?: boolean
}>()
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
  white-space: pre-line;
}
</style>
