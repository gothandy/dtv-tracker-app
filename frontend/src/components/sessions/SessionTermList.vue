<template>
  <div v-if="expandedPills.length || allowEdit" class="stags-wrap">
    <span
      v-for="pill in expandedPills"
      :key="pill.pathKey"
      class="stags-pill"
      :class="{ 'stags-pill--deleting': pill.termGuid !== null && deletingGuids.has(pill.termGuid) }"
    >
      {{ pill.shortLabel }}
      <button
        v-if="allowEdit && pill.termGuid !== null"
        class="stags-remove"
        aria-label="Remove tag"
        @click="removeTag(pill.termGuid)"
        :disabled="working || deletingGuids.has(pill.termGuid)"
      >
        <img src="/icons/close.svg" width="10" height="10" alt="" class="svg-black" />
      </button>
    </span>
    <div v-if="allowEdit" class="stags-add-wrap">
      <TermPicker
        v-model="pickedLabel"
        :tree="tree"
        :loading="taxonomyLoading"
        placeholder="+ Add tag"
        @select="onPick"
      />
    </div>
    <span v-if="error" class="stags-error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TermPicker from '../TermPicker.vue'
import type { TaxNode } from '../../composables/useTaxonomy'
import type { SessionDetailResponse } from '../../../../types/api-responses'

type TagItem = { label: string; termGuid: string }

interface TagPill {
  shortLabel: string
  pathKey: string
  depth: number
  termGuid: string | null
}

const props = defineProps<{
  session: SessionDetailResponse
  allowEdit: boolean
  working: boolean
  error?: string
  tree: TaxNode[]
  taxonomyLoading?: boolean
}>()

const emit = defineEmits<{ saveTags: [tags: TagItem[]] }>()

const tags = computed<TagItem[]>(() => props.session.metadata ?? [])
const pickedLabel = ref('')
const deletingGuids = ref(new Set<string>())

// Build the expanded list of ancestor + leaf pills from session.metadata.
// Each tag label is a colon-separated path, e.g. "XC:Verderers:Red Option".
// We expand every prefix into a separate pill, deduplicate by pathKey,
// and attach termGuid only when the full path matches a metadata entry.
const expandedPills = computed<TagPill[]>(() => {
  const byPath = new Map<string, TagPill>()

  const metaByPath = new Map<string, string>() // pathKey → termGuid
  for (const tag of tags.value) {
    metaByPath.set(tag.label, tag.termGuid)
  }

  for (const tag of tags.value) {
    const parts = tag.label.split(':')
    for (let d = 0; d < parts.length; d++) {
      const pathKey = parts.slice(0, d + 1).join(':')
      const termGuid = metaByPath.get(pathKey) ?? null

      if (!byPath.has(pathKey)) {
        byPath.set(pathKey, { shortLabel: parts[d], pathKey, depth: d, termGuid })
      } else if (termGuid !== null) {
        // Merge termGuid if this path exists directly in metadata
        byPath.get(pathKey)!.termGuid = termGuid
      }
    }
  }

  return [...byPath.values()].sort((a, b) => a.depth - b.depth)
})

watch(tags, (newTags) => {
  for (const guid of deletingGuids.value) {
    if (!newTags.some(t => t.termGuid === guid)) {
      deletingGuids.value.delete(guid)
    }
  }
})

function removeTag(termGuid: string) {
  deletingGuids.value.add(termGuid)
  emit('saveTags', tags.value.filter(t => t.termGuid !== termGuid))
}

function onPick(label: string, termGuid: string) {
  if (!label || !termGuid) return
  pickedLabel.value = ''
  if (tags.value.some(t => t.termGuid === termGuid)) return
  emit('saveTags', [...tags.value, { label, termGuid }])
}
</script>

<style scoped>
.stags-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.stags-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--color-border);
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  background: var(--color-white);
  color: var(--color-text);
}

.stags-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stags-remove:hover img { filter: invert(20%) sepia(95%) saturate(5000%) hue-rotate(0deg) brightness(90%) contrast(90%); }

.stags-pill--deleting {
  opacity: 0.45;
  cursor: wait;
  text-decoration: line-through;
}

.stags-add-wrap {
  font-size: 0.85rem;
}

.stags-error {
  font-size: 0.8rem;
  color: var(--color-error);
}
</style>
