<template>
  <div class="elf-bar">
    <input
      v-model="q"
      class="elf-input"
      type="search"
      placeholder="Search notes…"
      @input="onTextInput"
    />
    <select v-model="accompanyingAdult" class="elf-select" @change="emitFiltered">
      <option value="">All</option>
      <option value="notempty">Has Accompanying Adult</option>
      <option value="empty">No Accompanying Adult</option>
    </select>
    <select v-model="cancelled" class="elf-select" @change="emitFiltered">
      <option value="false">Not Cancelled</option>
      <option value="all">Show All</option>
      <option value="true">Cancelled</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface EntryFilterParams {
  q: string
  accompanyingAdult: string
  cancelled: string
}

const emit = defineEmits<{ filtered: [params: EntryFilterParams] }>()

const route = useRoute()
const router = useRouter()

const q = ref((route.query.q as string) || '')
const accompanyingAdult = ref((route.query.accompanyingAdult as string) || '')
const cancelled = ref((route.query.cancelled as string) || 'false')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onTextInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(emitFiltered, 300)
}

function emitFiltered() {
  emit('filtered', { q: q.value, accompanyingAdult: accompanyingAdult.value, cancelled: cancelled.value })
}

onMounted(() => emitFiltered())

watch([q, accompanyingAdult, cancelled], ([newQ, newAdult, newCancelled]) => {
  const query: Record<string, string> = {}
  if (newQ)       query.q                  = newQ
  if (newAdult)   query.accompanyingAdult  = newAdult
  if (newCancelled && newCancelled !== 'false') query.cancelled = newCancelled
  router.replace({ query })
})
</script>

<style scoped>
.elf-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-dtv-light);
  flex-wrap: wrap;
}

.elf-input {
  flex: 1;
  min-width: 10rem;
  background: var(--color-dtv-sand);
  border: none;
  color: var(--color-text);
  padding: 0.4rem 0.6rem;
  font-family: inherit;
  font-size: 0.9rem;
}

.elf-select {
  background: var(--color-dtv-sand);
  border: none;
  color: var(--color-text);
  padding: 0.4rem 0.6rem;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
</style>
