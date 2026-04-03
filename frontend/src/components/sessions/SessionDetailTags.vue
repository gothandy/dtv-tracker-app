<template>
  <div v-if="tags.length || canEdit" class="stags-wrap">
    <span
      v-for="tag in tags"
      :key="tag.termGuid"
      class="stags-pill"
      :class="{ 'stags-pill--deleting': deletingGuid === tag.termGuid }"
    >
      {{ shortLabel(tag.label) }}
      <button v-if="canEdit" class="stags-remove" @click="removeTag(tag.termGuid)" :disabled="deletingGuid === tag.termGuid">×</button>
    </span>
    <div v-if="canEdit" class="stags-add-wrap">
      <TagPicker
        v-model="pickedLabel"
        placeholder="+ Add tag"
        @select="onPick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRole } from '../../composables/useRole'
import TagPicker from '../TagPicker.vue'
import type { SessionDetailResponse } from '../../../../types/api-responses'

const props = defineProps<{
  session: SessionDetailResponse
  groupKey: string
  date: string
}>()

const emit = defineEmits<{ updated: [] }>()

const { isAdmin, isCheckIn } = useRole()
const canEdit = computed(() => isAdmin.value || isCheckIn.value)

const tags = computed(() => props.session.metadata ?? [])
const pickedLabel = ref('')
const deletingGuid = ref<string | null>(null)
watch(tags, (newTags) => {
  if (deletingGuid.value && !newTags.some(t => t.termGuid === deletingGuid.value)) {
    deletingGuid.value = null
  }
})

function shortLabel(label: string): string {
  const parts = label.split(':')
  return parts[parts.length - 1]
}

async function removeTag(termGuid: string) {
  deletingGuid.value = termGuid
  const updated = tags.value.filter(t => t.termGuid !== termGuid)
  await patch(updated)
}

async function onPick(label: string, termGuid: string) {
  if (!label || !termGuid) return
  pickedLabel.value = ''
  if (tags.value.some(t => t.termGuid === termGuid)) return
  const updated = [...tags.value, { label, termGuid }]
  await patch(updated)
}

async function patch(metadata: Array<{ label: string; termGuid: string }>) {
  const res = await fetch(`/api/sessions/${props.groupKey}/${props.date}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata }),
  })
  if (!res.ok) {
    console.error('[SessionTagsV1] PATCH failed', res.status)
    return
  }
  emit('updated')
}
</script>

<style scoped>
.stags-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1.5rem;
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
  font-size: 0.9rem;
  color: var(--color-text-faint);
  padding: 0;
  line-height: 1;
}
.stags-remove:hover { color: var(--color-error); }

.stags-pill--deleting {
  opacity: 0.45;
  cursor: wait;
  text-decoration: line-through;
}

.stags-add-wrap {
  font-size: 0.85rem;
}
</style>
