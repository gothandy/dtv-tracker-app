<template>
  <div class="list-filter pf-wrap">
    <MultiSelectFilter v-model:excluded="hiddenStatuses" :options="statusOptions" all-label="All statuses" aria-label="Status filter" />
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
import { FUTURE_OR_NEW, ALL_TRAILS, NO_STATUS, isFutureOrNew, statusShown } from '../../utils/projectFilters'
import MultiSelectFilter from '../MultiSelectFilter.vue'
import { parseValueList, valueListParam } from '../../utils/multiSelect'
import { trailsWithoutProjects } from '../../utils/projectsByLocation'

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
const emit = defineEmits<{
  filtered: [projects: ProjectWithStats[]]
  /** With FY "Show all trails": the trails with none of the filtered projects; otherwise none. */
  emptyTrails: [trails: string[]]
  /** Whether FY is "Show all trails" (the list is grouped by trail) */
  allTrails: [on: boolean]
}>()

const route = useRoute()
const router = useRouter()

const fy = ref((route.query.fy as string) || ALL_TRAILS)   // Show all trails by default
/** Statuses crossed out in the Status filter (`?hide=Closed,none`) */
const hiddenStatuses = ref<string[]>(parseValueList(route.query.hide))
const tagLabel = ref((route.query.tag as string) || '')

const { tree: taxonomyTree, loading: taxonomyLoading } = useTaxonomy()

// SharePoint often gives a project's tags as the term's own name ("Corkscrew"), not its
// path ("DH:Corkscrew"); the picker and the filter work in paths, so look each one up.
const projects = computed<ProjectResponse[]>(() => props.projects.map(p => p.metadata?.length
  ? { ...p, metadata: resolveMetadataTags(p.metadata, taxonomyTree.value) }
  : p))

const linkSession = (p: ProjectResponse, s: Session) => s.projectId === p.id

// Each filter narrows the list, and each offers only what the other two leave (as on Sessions).
const byStatus = (list: ProjectResponse[]) => list.filter(p => statusShown(p.status, hiddenStatuses.value))
const byTag = (list: ProjectResponse[]) => list.filter(p => matchesTag(p.metadata, tagLabel.value))
/** "Show all trails" is all years, plus the trails without projects. */
const fyValue = computed(() => fy.value === ALL_TRAILS ? 'all' : fy.value)
function byFy(list: ProjectResponse[]): ProjectResponse[] {
  if (fy.value === FUTURE_OR_NEW) return list.filter(p => isFutureOrNew(p, props.sessions, linkSession))
  return entitiesWithSessionsInFy(list, props.sessions, linkSession, fyValue.value)
}

const fyOptions = computed(() => {
  const others = byStatus(byTag(projects.value))
  const options = fyOptionsForEntities(others, props.sessions, linkSession)
  if (others.some(p => isFutureOrNew(p, props.sessions, linkSession))) {
    options.push({ value: FUTURE_OR_NEW, label: 'Future + New' })
  }
  if (taxonomyTree.value.length) options.push({ value: ALL_TRAILS, label: 'Show all trails' })
  return options
})

// Status choices in SharePoint's order: those on the projects FY and tags leave, plus any
// crossed out (so they can be ticked again). A status on a project that's no longer one of the
// column's choices (e.g. after renaming a choice in SharePoint) is offered too, after them.
const statusOptions = computed(() => {
  const others = byFy(byTag(projects.value))
  const present = new Set(others.map(p => p.status || NO_STATUS))
  const offered = (v: string) => present.has(v) || hiddenStatuses.value.includes(v)
  const notChoices = [...present, ...hiddenStatuses.value]
    .filter((v, i, all) => v !== NO_STATUS && !props.statuses.includes(v) && all.indexOf(v) === i)
  return [
    ...props.statuses.filter(offered).map(s => ({ value: s, label: s })),
    ...notChoices.map(s => ({ value: s, label: s })),
    ...(offered(NO_STATUS) ? [{ value: NO_STATUS, label: 'No status' }] : []),
  ]
})

const availableTagLabels = computed(() => {
  const labels = new Set<string>()
  for (const p of byStatus(byFy(projects.value))) p.metadata?.forEach(t => labels.add(t.label))
  // Showing all trails: the trails without projects can be picked too.
  if (fy.value === ALL_TRAILS) {
    trailsWithoutProjects(byStatus(projects.value), taxonomyTree.value, '').forEach(t => labels.add(t))
  }
  return labels
})

const filtered = computed<ProjectWithStats[]>(() =>
  withSessionTotals(byTag(byFy(byStatus(projects.value))), props.sessions, linkSession,
    fy.value === FUTURE_OR_NEW ? 'future' : fyValue.value),
)

const emptyTrails = computed(() => fy.value === ALL_TRAILS
  ? trailsWithoutProjects(filtered.value, taxonomyTree.value, tagLabel.value)
  : [])

watch([fyOptions, taxonomyLoading], ([opts]) => {
  // "Show all trails" is offered once the tags have loaded; don't drop it while they're
  // loading, but do if they couldn't load (it would put every project under No location).
  if (fy.value === ALL_TRAILS && taxonomyLoading.value) return
  if (opts.length && !opts.some(o => o.value === fy.value)) fy.value = 'all'
}, { immediate: true })

watch(filtered, list => emit('filtered', list), { immediate: true })
watch(emptyTrails, trails => emit('emptyTrails', trails), { immediate: true })
watch(() => fy.value === ALL_TRAILS, on => emit('allTrails', on), { immediate: true })

// The tag can also be set from the list (a top-level heading under Show all trails).
watch(() => route.query.tag, tag => {
  if ((tag ?? '') !== tagLabel.value) tagLabel.value = (tag as string) ?? ''
})

watch([fy, hiddenStatuses, tagLabel], ([newFy, newHidden, newTag]) => {
  const query: Record<string, string> = {}
  if (newFy) query.fy = newFy
  const hide = valueListParam(newHidden)
  if (hide) query.hide = hide
  if (newTag) query.tag = newTag
  router.replace({ query })
})
</script>

<style scoped>
/* Same full-width row as the Sessions filter. */
.pf-wrap :deep(.tp-wrap) { flex: 1 1 140px; display: flex; flex-direction: column; }
.pf-wrap :deep(.tp-btn) { flex: 1; width: 100%; justify-content: space-between; }
</style>
