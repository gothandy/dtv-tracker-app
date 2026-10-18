<template>
  <div class="list-filter pf-wrap">
    <select v-model="status" class="list-filter-select" aria-label="Status filter">
      <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <select v-model="fy" class="list-filter-select" aria-label="Financial year filter">
      <option v-for="o in fyOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <TermPicker
      v-model="tagLabel"
      :tree="taxonomyTree"
      :loading="taxonomyLoading"
      :show-no-tags="true"
      :available-labels="availableTagLabels"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TermPicker from '../TermPicker.vue'
import { useTaxonomy } from '../../composables/useTaxonomy'
import { matchesTag } from '../../utils/tagFilter'
import { resolveMetadataTags } from '../../utils/taxonomyPath'
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
const tagLabel = ref((route.query.tag as string) || '')

const { tree: taxonomyTree, loading: taxonomyLoading } = useTaxonomy()

// SharePoint often gives a project's tags as the term's own name ("Corkscrew"), not its
// path ("DH:Corkscrew"); the picker and the filter work in paths, so look each one up.
const projects = computed<ProjectResponse[]>(() => props.projects.map(p => p.metadata?.length
  ? { ...p, metadata: resolveMetadataTags(p.metadata, taxonomyTree.value) }
  : p))

const linkSession = (p: ProjectResponse, s: Session) => s.projectId === p.id

// Each filter narrows the list, and each offers only what the other two leave (as on Sessions).
const byStatus = (list: ProjectResponse[]) => list.filter(p => matchesStatus(p.status, status.value))
const byTag = (list: ProjectResponse[]) => list.filter(p => matchesTag(p.metadata, tagLabel.value))
function byFy(list: ProjectResponse[]): ProjectResponse[] {
  if (fy.value === FUTURE_OR_NEW) return list.filter(p => isFutureOrNew(p, props.sessions, linkSession))
  return entitiesWithSessionsInFy(list, props.sessions, linkSession, fy.value)
}

const fyOptions = computed(() => {
  const others = byStatus(byTag(projects.value))
  const options = fyOptionsForEntities(others, props.sessions, linkSession)
  if (others.some(p => isFutureOrNew(p, props.sessions, linkSession))) {
    options.push({ value: FUTURE_OR_NEW, label: 'Future + New' })
  }
  return options
})

// Status choices in SharePoint's order, but only those on the projects FY and tags leave.
const statusOptions = computed(() => {
  const others = byFy(byTag(projects.value))
  const present = new Set(others.map(p => p.status ?? ''))
  return [
    { value: ALL_STATUSES, label: 'All statuses' },
    ...props.statuses.filter(s => present.has(s)).map(s => ({ value: s, label: s })),
    ...(present.has('') ? [{ value: NO_STATUS, label: 'No status' }] : []),
  ]
})

const availableTagLabels = computed(() => {
  const labels = new Set<string>()
  for (const p of byStatus(byFy(projects.value))) p.metadata?.forEach(t => labels.add(t.label))
  return labels
})

const filtered = computed<ProjectWithStats[]>(() =>
  withSessionTotals(byTag(byFy(byStatus(projects.value))), props.sessions, linkSession,
    fy.value === FUTURE_OR_NEW ? 'future' : fy.value),
)

watch(fyOptions, opts => {
  if (opts.length && !opts.some(o => o.value === fy.value)) fy.value = 'all'
}, { immediate: true })

watch(statusOptions, opts => {
  // Wait for the choices and projects to load before dropping a status that isn't offered.
  if (props.statuses.length && props.projects.length && !opts.some(o => o.value === status.value)) {
    status.value = ALL_STATUSES
  }
})

watch(filtered, list => emit('filtered', list), { immediate: true })

watch([fy, status, tagLabel], ([newFy, newStatus, newTag]) => {
  const query: Record<string, string> = {}
  if (newFy) query.fy = newFy
  if (newStatus !== ALL_STATUSES) query.status = newStatus
  if (newTag) query.tag = newTag
  router.replace({ query })
})
</script>

<style scoped>
/* Same full-width row as the Sessions filter. */
.pf-wrap :deep(.tp-wrap) { flex: 1 1 140px; display: flex; flex-direction: column; }
.pf-wrap :deep(.tp-btn) { flex: 1; width: 100%; justify-content: space-between; }
</style>
