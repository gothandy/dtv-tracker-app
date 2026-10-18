<template>
  <div class="pf-wrap">
    <div class="pf-title-row">
      <div class="pf-actions">
        <FyFilter v-model="status" :options="statusOptions" />
        <FyFilter v-model="fy" :options="fyOptions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { ProjectResponse } from '../../../../types/api-responses'
import type { Session } from '../../types/session'
import {
  withSessionTotals,
  entitiesWithSessionsInFy,
  fyOptionsForEntities,
} from '../../utils/entitySessionTotals'
import { FUTURE_OR_NEW, ALL_STATUSES, NO_STATUS, isFutureOrNew, matchesStatus } from '../../utils/projectFilters'

export interface ProjectWithStats extends ProjectResponse {
  sessionCount: number
  hours: number
}

const props = defineProps<{
  projects: ProjectResponse[]
  sessions: Session[]
  /** The Projects list's Status choices (GET /api/projects/options). */
  statuses: string[]
}>()
const emit = defineEmits<{ filtered: [projects: ProjectWithStats[]] }>()

const route = useRoute()
const router = useRouter()

const fy = ref((route.query.fy as string) || 'all')
const status = ref((route.query.status as string) || ALL_STATUSES)

const linkSession = (p: ProjectResponse, s: Session) => s.projectId === p.id

const fyOptions = computed(() => {
  const options = fyOptionsForEntities(props.projects, props.sessions, linkSession)
  if (props.projects.some(p => isFutureOrNew(p, props.sessions, linkSession))) {
    options.push({ value: FUTURE_OR_NEW, label: 'Future + New' })
  }
  return options
})

const statusOptions = computed(() => [
  { value: ALL_STATUSES, label: 'All statuses' },
  ...props.statuses.map(s => ({ value: s, label: s })),
  { value: NO_STATUS, label: 'No status' },
])

const filtered = computed<ProjectWithStats[]>(() => {
  const byStatus = props.projects.filter(p => matchesStatus(p.status, status.value))
  if (fy.value === FUTURE_OR_NEW) {
    const futureOrNew = byStatus.filter(p => isFutureOrNew(p, props.sessions, linkSession))
    return withSessionTotals(futureOrNew, props.sessions, linkSession, 'future')
  }
  const fyProjects = entitiesWithSessionsInFy(byStatus, props.sessions, linkSession, fy.value)
  return withSessionTotals(fyProjects, props.sessions, linkSession, fy.value)
})

watch(fyOptions, opts => {
  if (opts.length && !opts.some(o => o.value === fy.value)) fy.value = 'all'
}, { immediate: true })

watch(statusOptions, opts => {
  // Wait for the choices to load before dropping an unknown ?status=.
  if (props.statuses.length && !opts.some(o => o.value === status.value)) status.value = ALL_STATUSES
})

watch(filtered, list => emit('filtered', list), { immediate: true })

watch([fy, status], ([newFy, newStatus]) => {
  const query: Record<string, string> = {}
  if (newFy) query.fy = newFy
  if (newStatus !== ALL_STATUSES) query.status = newStatus
  router.replace({ query })
})
</script>

<style scoped>
.pf-wrap {
  background: var(--color-dtv-sand);
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.pf-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pf-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
