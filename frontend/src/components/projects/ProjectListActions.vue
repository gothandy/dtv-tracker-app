<template>
  <!-- Shown to everyone: if you can see the page you can share it. -->
  <div class="list-actions">
    <span class="list-actions-stats">
      <template v-if="canDownload">{{ selectedProjects.length }} / </template>{{ projects.length }} projects &nbsp;&nbsp;
      <template v-if="canDownload">{{ selectedHours }} / </template>{{ totalHours }} hours
      <template v-if="selectedTrails.length">&nbsp;&nbsp; {{ selectedTrails.length }} {{ selectedTrails.length === 1 ? 'trail' : 'trails' }} with no projects</template>
      <template v-if="canDownload && taxonomyError">&nbsp;&nbsp; {{ taxonomyError }} The location report is unavailable; reload to try again.</template>
      <template v-else-if="downloadError">&nbsp;&nbsp; {{ downloadError }}</template>
    </span>
    <div class="list-actions-buttons">
      <AppButton
        v-if="canDownload"
        label="Download projects by location"
        icon="download"
        mode="icon-only"
        :disabled="!selectedProjects.length && !selectedTrails.length || taxonomyLoading || !!taxonomyError || !tree.length || downloading"
        @click="onDownload"
      />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
      <AppButton v-if="canEdit" label="New project" icon="add" mode="icon-only" @click="emit('add-project')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '../AppButton.vue'
import { shareCurrentUrl } from '../../utils/shareUrl'
import { downloadCsv } from '../../utils/listCsv'
import { useTaxonomy } from '../../composables/useTaxonomy'
import { projectsByLocationRows, PROJECTS_BY_LOCATION_HEADERS } from '../../utils/projectsByLocation'
import { visibleSelected } from '../../utils/listSelection'
import type { Session } from '../../types/session'
import type { ProjectWithStats } from './ProjectListFilter.vue'
import type { RoleContext } from '../../composables/useViewer'

const props = defineProps<{
  projects: ProjectWithStats[]
  profile: RoleContext
  /** Add projects (permission editProjects) */
  canEdit: boolean
  /** All sessions, for each project's next and last session dates. */
  sessions: Session[]
  /** Bulk actions on Projects, e.g. the Projects by location CSV (permission bulkProjects). */
  canDownload: boolean
  /** Selected project IDs (Bulk actions) */
  selected: number[]
  /** Selected trail cards (FY "Show all trails"), for the CSV's No projects rows */
  selectedTrails: string[]
}>()

const { tree, loading: taxonomyLoading, error: taxonomyError } = useTaxonomy()

const emit = defineEmits<{ 'add-project': [] }>()

const totalHours = computed(() =>
  Math.round(props.projects.reduce((sum, p) => sum + p.hours, 0) * 10) / 10)

const selectedProjects = computed(() => visibleSelected(props.selected, props.projects))
const selectedHours = computed(() =>
  Math.round(selectedProjects.value.reduce((sum, p) => sum + p.hours, 0) * 10) / 10)

const downloading = ref(false)
const downloadError = ref('')

// The selected projects by location, with a No projects row for each selected trail card.
// Which projects have documents comes from the server; if it can't say, no report rather
// than one saying No for every project.
async function onDownload() {
  downloading.value = true
  downloadError.value = ''
  try {
    const res = await fetch('/api/projects/documents')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const keys: string[] = (await res.json()).data?.keys ?? []
    const today = new Date().toISOString().slice(0, 10)
    const rows = projectsByLocationRows(selectedProjects.value, props.sessions, tree.value,
      props.selectedTrails, window.location.origin, today, new Set(keys))
    downloadCsv(`${today} Projects by location.csv`, PROJECTS_BY_LOCATION_HEADERS, rows)
  } catch (e) {
    console.error('[ProjectListActions] onDownload', e)
    downloadError.value = "Couldn't check the projects' documents, so the report wasn't downloaded. Try again."
  } finally {
    downloading.value = false
  }
}

function onShare() {
  shareCurrentUrl()
}
</script>
