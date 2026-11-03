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
    <FyFilter v-model="filters.fy" :options="fyOptions" class="list-filter-select" />
    <select v-model="filters.hours" class="list-filter-select">
      <option value="">All hours</option>
      <option v-for="h in hoursOptions" :key="h.value" :value="h.value">{{ h.label }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { RecordListItemResponse } from '../../../../types/api-responses'
import { HOURS_FILTERS } from '../../../../types/hours'
import { fyKeyToLabel } from '../../utils/entitySessionTotals'
import { DEFAULT_RECORD_FILTERS, matchesRecordFilters, recordFilterOptions, sortRecords, type RecordFilters } from '../../utils/recordFilters'

const props = defineProps<{
  records: RecordListItemResponse[]
  /** FY keys from Profile Stats. Records FY is the linked Profile's volunteering year, so there's no Rolling or Future. */
  financialYears: string[]
}>()

const emit = defineEmits<{ filtered: [records: RecordListItemResponse[]] }>()

const route = useRoute()
const router = useRouter()

const filters = reactive<RecordFilters>({
  type: (route.query.type as string) || DEFAULT_RECORD_FILTERS.type,
  status: (route.query.status as string) || DEFAULT_RECORD_FILTERS.status,
  fy: (route.query.fy as string) || DEFAULT_RECORD_FILTERS.fy,
  hours: (route.query.hours as string) || DEFAULT_RECORD_FILTERS.hours,
})

const options = computed(() => recordFilterOptions(props.records, filters, props.financialYears))

const fyOptions = computed(() => [
  { value: 'all', label: 'All FY' },
  ...options.value.financialYears.map(k => ({ value: k, label: fyKeyToLabel(k) })),
])

const hoursOptions = computed(() => HOURS_FILTERS.filter(h => options.value.hours.includes(h.value)))

const filtered = computed(() => sortRecords(props.records.filter(r => matchesRecordFilters(r, filters))))

watch(filtered, list => emit('filtered', list), { immediate: true })

// Filters cascade: a choice the other filters leave no Records for goes back to All (once loaded)
watch(options, opts => {
  if (!props.records.length) return
  if (filters.type && !opts.types.includes(filters.type)) filters.type = ''
  if (filters.status && !opts.statuses.includes(filters.status)) filters.status = ''
  if (filters.fy !== 'all' && !opts.financialYears.includes(filters.fy)) filters.fy = 'all'
  if (filters.hours && !opts.hours.includes(filters.hours)) filters.hours = ''
})

watch(filters, f => {
  const query: Record<string, string> = {}
  if (f.type) query.type = f.type
  if (f.status) query.status = f.status
  if (f.fy !== DEFAULT_RECORD_FILTERS.fy) query.fy = f.fy
  if (f.hours) query.hours = f.hours
  router.replace({ query })
})
</script>
