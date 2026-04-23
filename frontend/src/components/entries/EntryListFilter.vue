<template>
  <div class="list-filter">
    <input
      v-model="q"
      class="list-filter-search"
      type="search"
      placeholder="Search notes…"
      @input="onTextInput"
    />
    <FyFilter v-model="fy" class="list-filter-select" />
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
import FyFilter from '../FyFilter.vue'

export interface EntryFilterParams {
  q: string
  fy: string
  accompanyingAdult: string
  cancelled: string
}

const emit = defineEmits<{ filtered: [params: EntryFilterParams] }>()

const route = useRoute()
const router = useRouter()

const q = ref((route.query.q as string) || '')
const fy = ref((route.query.fy as string) || 'future')
const accompanyingAdult = ref((route.query.accompanyingAdult as string) || '')
const cancelled = ref((route.query.cancelled as string) || 'false')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onTextInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(emitFiltered, 300)
}

function emitFiltered() {
  emit('filtered', { q: q.value, fy: fy.value, accompanyingAdult: accompanyingAdult.value, cancelled: cancelled.value })
}

onMounted(() => emitFiltered())

// FY change triggers a re-fetch
watch(fy, () => emitFiltered())

// URL sync
watch([q, fy, accompanyingAdult, cancelled], ([newQ, newFy, newAdult, newCancelled]) => {
  const query: Record<string, string> = {}
  if (newQ)       query.q                  = newQ
  if (newFy && newFy !== 'future') query.fy = newFy
  if (newAdult)   query.accompanyingAdult  = newAdult
  if (newCancelled && newCancelled !== 'false') query.cancelled = newCancelled
  router.replace({ query })
})
</script>
