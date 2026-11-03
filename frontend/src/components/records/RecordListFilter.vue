<template>
  <div class="list-filter">
    <select v-model="filters.type" class="list-filter-select">
      <option value="">All record types</option>
      <option v-for="t in options.types" :key="t" :value="t">{{ t }}</option>
    </select>
    <select v-model="filters.status" class="list-filter-select">
      <option value="">All statuses</option>
      <option v-for="s in options.statuses" :key="s" :value="s">{{ s }}</option>
    </select>
    <FyFilter v-model="filters.fy" :options="options.fyOptions" class="list-filter-select" />
    <button v-if="filters.profileId !== undefined" class="list-filter-chip" @click="clearProfileFilter">
      {{ profileName || 'Profile' }} ×
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { RecordListItemResponse } from '../../../../types/api-responses'
import { DEFAULT_RECORD_FILTERS, matchesRecordFilters, recordFilterOptions, sortRecords, type RecordFilters } from '../../utils/recordFilters'

const props = defineProps<{
  records: RecordListItemResponse[]
}>()

const emit = defineEmits<{ filtered: [records: RecordListItemResponse[]] }>()

const route = useRoute()
const router = useRouter()

const filters = reactive<RecordFilters>({
  type: (route.query.type as string) || DEFAULT_RECORD_FILTERS.type,
  status: (route.query.status as string) || DEFAULT_RECORD_FILTERS.status,
  fy: (route.query.fy as string) || DEFAULT_RECORD_FILTERS.fy,
  profileId: route.query.profileId ? parseInt(route.query.profileId as string, 10) : undefined,
})
/** Shown in the chip; comes with profileId from the Profile page's link. */
const profileName = ref((route.query.profileName as string) || '')

// Links to this page from this page (View Archive) change the address, not the component:
// take filters from the address when it differs from them.
watch(() => route.query, q => {
  const profileId = q.profileId ? parseInt(q.profileId as string, 10) : undefined
  if (profileId !== filters.profileId) {
    filters.profileId = profileId
    profileName.value = (q.profileName as string) || ''
  }
  const type = (q.type as string) || DEFAULT_RECORD_FILTERS.type
  if (type !== filters.type) filters.type = type
  const status = (q.status as string) || DEFAULT_RECORD_FILTERS.status
  if (status !== filters.status) filters.status = status
  const fy = (q.fy as string) || DEFAULT_RECORD_FILTERS.fy
  if (fy !== filters.fy) filters.fy = fy
})

function clearProfileFilter() {
  filters.profileId = undefined
  profileName.value = ''
}

const options = computed(() => recordFilterOptions(props.records, filters))

const filtered = computed(() => sortRecords(props.records.filter(r => matchesRecordFilters(r, filters))))

watch(filtered, list => emit('filtered', list), { immediate: true })

// Filters cascade: a choice the other filters leave no Records for goes back to All (once loaded)
watch(options, opts => {
  if (!props.records.length) return
  if (filters.type && !opts.types.includes(filters.type)) filters.type = ''
  if (filters.status && !opts.statuses.includes(filters.status)) filters.status = ''
  if (filters.fy !== 'all' && !opts.fyOptions.some(o => o.value === filters.fy)) filters.fy = 'all'
})

watch(filters, f => {
  const query: Record<string, string> = {}
  if (f.type) query.type = f.type
  if (f.status) query.status = f.status
  if (f.fy !== DEFAULT_RECORD_FILTERS.fy) query.fy = f.fy
  if (f.profileId !== undefined) {
    query.profileId = String(f.profileId)
    if (profileName.value) query.profileName = profileName.value
  }
  router.replace({ query })
})
</script>
