<template>
  <!-- Shown to everyone: if you can see the page you can share it and download its CSV. -->
  <div class="list-actions">
    <span class="list-actions-stats">
      <template v-if="canBulkEdit">{{ selectedProjects.length }} / </template>{{ projects.length }} projects &nbsp;&nbsp;
      <template v-if="canBulkEdit">{{ selectedHours }} / </template>{{ totalHours }} hours
      <template v-if="selectedTrails.length">&nbsp;&nbsp; {{ selectedTrails.length }} {{ selectedTrails.length === 1 ? 'trail' : 'trails' }} with no projects</template>
      <template v-if="taxonomyError">&nbsp;&nbsp; {{ taxonomyError }} The location report is unavailable; reload to try again.</template>
      <template v-else-if="downloadError">&nbsp;&nbsp; {{ downloadError }}</template>
    </span>
    <div class="list-actions-buttons">
      <AppButton
        v-if="canBulkEdit"
        label="Set status"
        icon="save"
        mode="icon-responsive"
        :disabled="!selectedProjects.length"
        @click="emit('set-status')"
      />
      <AppButton
        label="Download projects by location"
        icon="download"
        mode="icon-only"
        :disabled="!toDownload.projects.length && !toDownload.trails.length || taxonomyLoading || !!taxonomyError || !tree.length || downloading"
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
  /** Bulk actions on Projects: select, Set status (permission bulkEditProjects). */
  canBulkEdit: boolean
  /** Selected project IDs (Bulk actions) */
  selected: number[]
  /** Selected trail cards (FY "Show all trails"), for the CSV's No matches rows */
  selectedTrails: string[]
  /** The trail cards shown with no projects (FY "Show all trails"), for the CSV when nothing's ticked */
  emptyTrails: string[]
}>()

const { tree, loading: taxonomyLoading, error: taxonomyError } = useTaxonomy()

const emit = defineEmits<{ 'add-project': []; 'set-status': [] }>()

const totalHours = computed(() =>
  Math.round(props.projects.reduce((sum, p) => sum + p.hours, 0) * 10) / 10)

const selectedProjects = computed(() => visibleSelected(props.selected, props.projects))
const selectedHours = computed(() =>
  Math.round(selectedProjects.value.reduce((sum, p) => sum + p.hours, 0) * 10) / 10)

/** What the CSV covers: the ticked projects and trails (Bulk actions), or else everything shown. */
const toDownload = computed(() =>
  props.canBulkEdit && (selectedProjects.value.length || props.selectedTrails.length)
    ? { projects: selectedProjects.value, trails: props.selectedTrails }
    : { projects: props.projects, trails: props.emptyTrails })

const downloading = ref(false)
const downloadError = ref('')

// The projects by location (the ticked ones, or all shown), with a No matches row for each trail card.
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
    const rows = projectsByLocationRows(toDownload.value.projects, props.sessions, tree.value,
      toDownload.value.trails, window.location.origin, today, new Set(keys))
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
