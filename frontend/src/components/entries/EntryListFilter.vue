<template>
  <div class="list-filter">
    <input
      v-model="q"
      class="list-filter-search"
      type="search"
      placeholder="Search notes…"
      @input="onTextInput"
    />
    <select v-model="accompanyingAdult" class="list-filter-select" @change="emitFiltered">
      <option value="">All</option>
      <option value="notempty">Has Accompanying Adult</option>
      <option value="empty">No Accompanying Adult</option>
    </select>
    <select v-model="cancelled" class="list-filter-select" @change="emitFiltered">
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
