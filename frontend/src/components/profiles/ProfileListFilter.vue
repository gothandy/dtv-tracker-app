<template>
  <div class="plf-wrap">
    <!-- Row 1: search + FY + group + sort -->
    <div class="plf-row">
      <input
        v-model="search"
        type="text"
        class="plf-search"
        placeholder="Search volunteers…"
        autocomplete="off"
      />
      <FyFilter v-model="fy" />
      <select v-model="group" class="plf-select">
        <option value="">All groups</option>
        <option v-for="g in groups" :key="g.key" :value="g.key">{{ g.displayName ?? g.key }}</option>
      </select>
      <select v-model="sort" class="plf-select">
        <option value="az">A–Z</option>
        <option value="hours">Hours</option>
      </select>
    </div>

    <!-- Row 2: advanced filters (always visible) -->
    <div class="plf-row plf-row--advanced">
      <select v-model="type" class="plf-select">
        <option value="">All profiles</option>
        <option value="individuals">Individuals</option>
        <option value="groups">Groups</option>
        <option value="users">Users</option>
      </select>
      <select v-model="hoursFilter" class="plf-select">
        <option value="">All hours</option>
        <option value="0">0h</option>
        <option value="lt15">&lt;15h</option>
        <option value="15plus">15h+</option>
        <option value="15to30">15–30h</option>
        <option value="30plus">30h+</option>
      </select>
      <select v-model="recordType" class="plf-select">
        <option value="">All record types</option>
        <option v-for="t in recordOptions.types" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="recordStatus" class="plf-select" :disabled="!recordType">
        <option value="">All statuses</option>
        <option value="none">No record</option>
        <option v-for="s in recordOptions.statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { ProfileResponse } from '../../../../types/api-responses'
import type { GroupResponse } from '../../../../types/api-responses'

const props = defineProps<{
  profiles: ProfileResponse[]
  groups: GroupResponse[]
  recordOptions: { types: string[]; statuses: string[] }
}>()

const emit = defineEmits<{
  filtered: [profiles: ProfileResponse[]]
  'fy-change': [fy: string]
  'group-change': [group: string]
}>()

const route = useRoute()

const fy          = ref((route.query.fy as string)           || 'rolling')
const group       = ref((route.query.group as string)        || '')
const search      = ref((route.query.search as string)       || '')
const sort        = ref((route.query.sort as string)         || 'az')
const type        = ref((route.query.type as string)         || '')
const hoursFilter = ref((route.query.hours as string)        || '')
const recordType  = ref((route.query.recordType as string)   || '')
const recordStatus = ref((route.query.recordStatus as string) || '')

// FY and group changes require a store re-fetch — emit upward
// immediate: true ensures deep-linked query params are emitted on first load
watch(fy, val => emit('fy-change', val), { immediate: true })
watch(group, val => emit('group-change', val), { immediate: true })

// Clear record status when record type is cleared
watch(recordType, val => { if (!val) recordStatus.value = '' })

function hoursForProfile(p: ProfileResponse): number {
  return fy.value === 'all' ? p.hoursAll : p.hoursThisFY
}

function sessionsForProfile(p: ProfileResponse): number {
  return fy.value === 'all' ? p.sessionsAll : p.sessionsThisFY
}

const filtered = computed<ProfileResponse[]>(() => {
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
    list = list.filter(p => {
      const h = hoursForProfile(p)
      if (hoursFilter.value === '0')      return h === 0
      if (hoursFilter.value === 'lt15')   return h > 0 && h < 15
      if (hoursFilter.value === '15plus') return h >= 15
      if (hoursFilter.value === '15to30') return h >= 15 && h <= 30
      if (hoursFilter.value === '30plus') return h > 30
      return true
    })
  }

  // Record filter
  if (recordType.value) {
    list = list.filter(p => {
      const recs = (p.records ?? []).filter(r => r.type === recordType.value)
      if (recordStatus.value === 'none') return recs.length === 0
      if (recordStatus.value)           return recs.some(r => r.status === recordStatus.value)
      return recs.length > 0
    })
  } else if (recordStatus.value === 'none') {
    // Status 'none' with no type means no records at all
    list = list.filter(p => !(p.records ?? []).length)
  }

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

.plf-search {
  flex: 2 1 180px;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--color-border);
  font-size: 0.95rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-white);
  box-sizing: border-box;
}
.plf-search:focus { outline: none; border-color: var(--color-dtv-green); }

.plf-select {
  flex: 1 1 130px;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-white);
  cursor: pointer;
}
.plf-select:disabled { opacity: 0.5; cursor: default; }
</style>
