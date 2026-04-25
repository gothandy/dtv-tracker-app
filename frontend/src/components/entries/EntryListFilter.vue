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
    <button v-if="profileName" class="elf-profile-chip" @click="clearProfileFilter">
      {{ profileName }} ×
    </button>
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
  profileId?: number
}

const emit = defineEmits<{ filtered: [params: EntryFilterParams] }>()

const route = useRoute()
const router = useRouter()

const q = ref((route.query.q as string) || '')
const fy = ref((route.query.fy as string) || 'future')
const accompanyingAdult = ref((route.query.accompanyingAdult as string) || '')
const cancelled = ref((route.query.cancelled as string) || 'false')
const profileId = ref(route.query.profileId ? parseInt(route.query.profileId as string, 10) : undefined)
const profileName = ref((route.query.profileName as string) || '')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onTextInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(emitFiltered, 300)
}

function emitFiltered() {
  emit('filtered', {
    q: q.value,
    fy: fy.value,
    accompanyingAdult: accompanyingAdult.value,
    cancelled: cancelled.value,
    profileId: profileId.value,
  })
}

function clearProfileFilter() {
  profileId.value = undefined
  profileName.value = ''
  emitFiltered()
}

onMounted(() => emitFiltered())

watch(fy, () => emitFiltered())

watch([q, fy, accompanyingAdult, cancelled, profileId, profileName], ([newQ, newFy, newAdult, newCancelled, newProfileId, newProfileName]) => {
  const query: Record<string, string> = {}
  if (newQ)       query.q                 = newQ
  if (newFy && newFy !== 'future') query.fy = newFy
  if (newAdult)   query.accompanyingAdult = newAdult
  if (newCancelled && newCancelled !== 'false') query.cancelled = newCancelled
  if (newProfileId) query.profileId       = String(newProfileId)
  if (newProfileName) query.profileName   = newProfileName
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
