<template>
  <SessionTermList
    :metadata="metadata"
    :allow-edit="allowEdit"
    :working="working"
    :error="error"
    :tree="tree"
    :taxonomy-loading="taxonomyLoading"
    @save-tags="emit('saveTags', $event)"
  />
</template>

<script setup lang="ts">
import SessionTermList from './SessionTermList.vue'
import type { TaxNode } from '../../composables/useTaxonomy'
import type { MetadataTag } from '../../utils/taxonomyPath'

defineProps<{
  metadata?: MetadataTag[]
  allowEdit: boolean
  working: boolean
  error?: string
  tree: TaxNode[]
  taxonomyLoading?: boolean
}>()

const emit = defineEmits<{ saveTags: [tags: MetadataTag[]] }>()
</script>
