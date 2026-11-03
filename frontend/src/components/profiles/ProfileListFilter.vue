<template>
  <div class="plf-wrap">
    <!-- Row 1: search + FY + group + sort -->
    <div class="plf-row">
      <input
        v-model="search"
        type="text"
        class="list-filter-search"
        placeholder="Search volunteers…"
        autocomplete="off"
      />
      <FyFilter v-model="fy" :years="financialYears" />
      <select v-model="group" class="list-filter-select">
        <option value="">All groups</option>
        <option v-for="g in groups" :key="g.key" :value="g.key">{{ g.displayName ?? g.key }}</option>
      </select>
      <select v-model="sort" class="list-filter-select">
        <option value="az">A–Z</option>
        <option value="hours">Hours</option>
      </select>
    </div>

    <!-- Row 2: advanced filters (always visible) -->
    <div class="plf-row plf-row--advanced">
      <select v-model="type" class="list-filter-select">
        <option value="">All profiles</option>
        <option value="individuals">Individuals</option>
        <option value="groups">Groups</option>
        <option value="users">Users</option>
      </select>
      <select v-model="hoursFilter" class="list-filter-select">
        <option value="">All hours</option>
        <option v-for="h in HOURS_FILTERS" :key="h.value" :value="h.value">{{ h.label }}</option>
      </select>
      <select v-model="recordType" class="list-filter-select">
        <option value="">All record types</option>
        <option v-for="t in recordFilterOptions.types" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="recordStatus" class="list-filter-select">
        <option value="">All statuses</option>
        <option v-if="recordFilterOptions.noRecord" :value="NO_RECORD">No record</option>
        <option v-for="s in recordFilterOptions.statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="warningsFilter" class="list-filter-select">
        <option value="">All profiles</option>
        <option value="__any__">All warnings</option>
        <option value="__none__">No warnings</option>
        <option v-for="w in warningOptions" :key="w" :value="w">{{ w }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { ProfileResponse } from '../../../../types/api-responses'
import type { GroupResponse } from '../../../../types/api-responses'
import { HOURS_FILTERS, hoursInView, matchesHoursFilter, sessionsInView } from '../../../../types/hours'
import { matchesProfileRecordFilter, NO_RECORD } from '../../../../types/profile-record-filter'
import { profileRecordFilterOptions } from '../../utils/profileRecordFilter'

const props = defineProps<{
  profiles: ProfileResponse[]
  /** FY keys for the FY dropdown, from Profile Stats (so it doesn't wait on Sessions). */
  financialYears: string[]
  /** True while the profiles are being refetched (e.g. after an FY change): they're stale. */
  loading?: boolean
  groups: GroupResponse[]
}>()

const emit = defineEmits<{
  filtered: [profiles: ProfileResponse[]]
  'filters-change': [filters: { fy: string; group: string }]
}>()

const route = useRoute()
const router = useRouter()

const fy          = ref((route.query.fy as string)           || 'future')
const group       = ref((route.query.group as string)        || '')
const search      = ref((route.query.search as string)       || '')
const sort        = ref((route.query.sort as string)         || 'az')
const type        = ref((route.query.type as string)         || '')
const hoursFilter = ref((route.query.hours as string)        || '')
const recordType     = ref((route.query.recordType as string)    || '')
const recordStatus   = ref((route.query.recordStatus as string)  || '')
const warningsFilter = ref((route.query.warnings as string)      || '')

// FY and group changes require a store re-fetch — emit upward as a single event
// immediate: true ensures deep-linked query params are emitted on first load
watch([fy, group], ([newFy, newGroup]) => emit('filters-change', { fy: newFy, group: newGroup }), { immediate: true })


const warningOptions = computed(() => {
  const set = new Set<string>()
  for (const p of props.profiles) p.warnings?.forEach(w => set.add(w.text))
  return Array.from(set).sort()
})

function hoursForProfile(p: ProfileResponse): number {
  return hoursInView(p, fy.value)
}

function sessionsForProfile(p: ProfileResponse): number {
  return sessionsInView(p, fy.value)
}

/** Profiles left by every filter except the Record ones: the Record choices come from these. */
const beforeRecordFilters = computed<ProfileResponse[]>(() => {
  let list = props.profiles

  // FY visibility: hide zero-activity profiles unless showing 'all' or filtering for 0h
  if (fy.value !== 'all' && hoursFilter.value !== '0') {
    list = list.filter(p => p.hoursThisFY > 0 || p.sessionsThisFY > 0)
  }

  // Search (3+ chars)
  if (search.value.length >= 3) {
    const q = search.value.toLowerCase()
    list = list.filter(p => (p.name ?? '').toLowerCase().includes(q))
  }

  // Type filter
  if (type.value === 'individuals') list = list.filter(p => !p.isGroup)
  else if (type.value === 'groups')  list = list.filter(p => p.isGroup)
  else if (type.value === 'users')   list = list.filter(p => !p.isGroup && !!p.user)

  // Hours filter
  if (hoursFilter.value) {
    list = list.filter(p => matchesHoursFilter(hoursForProfile(p), hoursFilter.value))
  }

  // Warnings filter
  if (warningsFilter.value === '__any__') {
    list = list.filter(p => !!p.warnings?.length)
  } else if (warningsFilter.value === '__none__') {
    list = list.filter(p => !p.warnings?.length)
  } else if (warningsFilter.value) {
    list = list.filter(p => p.warnings?.some(w => w.text === warningsFilter.value))
  }

  return list
})

const recordFilterOptions = computed(() =>
  profileRecordFilterOptions(beforeRecordFilters.value, recordType.value, recordStatus.value))

// Filters cascade: a Record choice the other filters leave no Profiles for goes back to All (once loaded)
watch(recordFilterOptions, opts => {
  // Not on stale profiles mid-refetch, or a valid choice could be cleared before the new FY arrives
  if (!props.profiles.length || props.loading) return
  if (recordType.value && !opts.types.includes(recordType.value)) recordType.value = ''
  if (recordStatus.value === NO_RECORD ? !opts.noRecord : recordStatus.value && !opts.statuses.includes(recordStatus.value)) recordStatus.value = ''
})

const filtered = computed<ProfileResponse[]>(() => {
  let list = beforeRecordFilters.value.filter(p => matchesProfileRecordFilter(p.records ?? [], recordType.value, recordStatus.value))

  // Sort
  list = [...list].sort((a, b) => {
    if (sort.value === 'hours') {
      const diff = hoursForProfile(b) - hoursForProfile(a)
      return diff !== 0 ? diff : (a.name ?? '').localeCompare(b.name ?? '')
    }
    const nameDiff = (a.name ?? '').localeCompare(b.name ?? '')
    return nameDiff !== 0 ? nameDiff : hoursForProfile(b) - hoursForProfile(a)
  })

  return list
})

watch(filtered, list => emit('filtered', list), { immediate: true })

watch([fy, group, search, sort, type, hoursFilter, recordType, recordStatus, warningsFilter], ([newFy, newGroup, newSearch, newSort, newType, newHours, newRecordType, newRecordStatus, newWarnings]) => {
  const query: Record<string, string> = {}
  if (newFy)           query.fy           = newFy
  if (newGroup)        query.group        = newGroup
  if (newSearch)       query.search       = newSearch
  if (newSort && newSort !== 'az') query.sort = newSort
  if (newType)         query.type         = newType
  if (newHours)        query.hours        = newHours
  if (newRecordType)   query.recordType   = newRecordType
  if (newRecordStatus) query.recordStatus = newRecordStatus
  if (newWarnings)     query.warnings     = newWarnings
  router.replace({ query })
})
</script>

<style scoped>
.plf-wrap {
  background: var(--color-dtv-sand);
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plf-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: stretch;
}
</style>
