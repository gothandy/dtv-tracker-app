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
    <select v-model="accompanyingAdult" class="list-filter-select" @change="emitServerFetch">
      <option value="">All</option>
      <option value="notempty">Has Accompanying Adult</option>
      <option value="empty">No Accompanying Adult</option>
    </select>
    <select v-model="cancelled" class="list-filter-select" @change="emitServerFetch">
      <option value="false">Not Cancelled</option>
      <option value="all">Show All</option>
      <option value="true">Cancelled</option>
    </select>
    <select
      v-if="showQualityFilter"
      v-model="entryQuality"
      class="list-filter-select"
    >
      <option value="">All entries</option>
      <option v-for="opt in qualityOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <button v-if="profileName" class="elf-profile-chip" @click="clearProfileFilter">
      {{ profileName }} ×
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { EntryListItemResponse } from '../../../../types/api-responses'
import {
  entryQualityOptionsForEntries,
  isEntryQualityFilterAvailable,
  matchesEntryQualityFilter,
  showEntryQualityFilter,
} from '../../utils/entryQuality'

export interface EntryFilterParams {
  q: string
  fy: string
  accompanyingAdult: string
  cancelled: string
  profileId?: number
  entryQuality: string
}

export type EntryServerFilterParams = Omit<EntryFilterParams, 'entryQuality'>

const props = defineProps<{
  entries: EntryListItemResponse[]
}>()

const emit = defineEmits<{
  fetch: [params: EntryServerFilterParams]
  filtered: [entries: EntryListItemResponse[]]
  'filter-change': [params: EntryFilterParams]
}>()

const route = useRoute()
const router = useRouter()

const q = ref((route.query.q as string) || '')
const fy = ref((route.query.fy as string) || 'future')
const accompanyingAdult = ref((route.query.accompanyingAdult as string) || '')
const cancelled = ref((route.query.cancelled as string) || 'false')
const entryQuality = ref((route.query.entryQuality as string) || '')
const profileId = ref(route.query.profileId ? parseInt(route.query.profileId as string, 10) : undefined)
const profileName = ref((route.query.profileName as string) || '')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const qualityOptions = computed(() => entryQualityOptionsForEntries(props.entries))
const showQualityFilter = computed(() => showEntryQualityFilter(props.entries))

function fullParams(): EntryFilterParams {
  return {
    q: q.value,
    fy: fy.value,
    accompanyingAdult: accompanyingAdult.value,
    cancelled: cancelled.value,
    profileId: profileId.value,
    entryQuality: entryQuality.value,
  }
}

function serverParams(): EntryServerFilterParams {
  const { entryQuality: _eq, ...rest } = fullParams()
  return rest
}

const filteredEntries = computed(() => {
  const eq = entryQuality.value
  if (!eq) return props.entries
  return props.entries.filter(e => matchesEntryQualityFilter(e, eq))
})

function onTextInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(emitServerFetch, 300)
}

function emitServerFetch() {
  emit('fetch', serverParams())
  emitFilterChange()
}

function emitFilterChange() {
  emit('filter-change', fullParams())
}

function clearProfileFilter() {
  profileId.value = undefined
  profileName.value = ''
  emitServerFetch()
}

watch(filteredEntries, list => {
  emit('filtered', list)
  emitFilterChange()
}, { immediate: true })

watch(qualityOptions, () => {
  if (entryQuality.value && !isEntryQualityFilterAvailable(entryQuality.value, props.entries)) {
    entryQuality.value = ''
  }
})

watch(entryQuality, () => emitFilterChange())

watch(fy, () => emitServerFetch())

onMounted(() => emitServerFetch())

watch([q, fy, accompanyingAdult, cancelled, entryQuality, profileId, profileName], ([newQ, newFy, newAdult, newCancelled, newQuality, newProfileId, newProfileName]) => {
  const query: Record<string, string> = {}
  if (newQ) query.q = newQ
  if (newFy && newFy !== 'future') query.fy = newFy
  if (newAdult) query.accompanyingAdult = newAdult
  if (newCancelled && newCancelled !== 'false') query.cancelled = newCancelled
  if (newQuality) query.entryQuality = newQuality
  if (newProfileId) query.profileId = String(newProfileId)
  if (newProfileName) query.profileName = newProfileName
  router.replace({ query })
})
</script>

<style scoped>
.elf-profile-chip {
  background: var(--color-dtv-dirt);
  color: var(--color-white);
  border: none;
  border-radius: 3px;
  padding: 0.25rem 0.6rem;
  font-family: var(--font-head);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}
.elf-profile-chip:hover {
  opacity: 0.85;
}
</style>
