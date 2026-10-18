<template>
  <div v-if="profile.isAdmin || canDownload" class="list-actions">
    <span class="list-actions-stats">
      {{ projects.length }} projects &nbsp;&nbsp; {{ totalHours }} hours
    </span>
    <div class="list-actions-buttons">
      <AppButton
        v-if="canDownload"
        label="Download projects by location"
        icon="download"
        mode="icon-only"
        :disabled="taxonomyLoading"
        @click="onDownload"
      />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
      <AppButton v-if="profile.isAdmin" label="New project" icon="add" mode="icon-only" @click="emit('add-project')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '../AppButton.vue'
import { shareCurrentUrl } from '../../utils/shareUrl'
import { downloadCsv } from '../../utils/listCsv'
import { useTaxonomy } from '../../composables/useTaxonomy'
import { projectsByLocationRows, PROJECTS_BY_LOCATION_HEADERS } from '../../utils/projectsByLocation'
import type { Session } from '../../types/session'
import type { ProjectWithStats } from './ProjectListFilter.vue'
import type { RoleContext } from '../../composables/useViewer'

const props = defineProps<{
  projects: ProjectWithStats[]
  profile: RoleContext
  /** All sessions, for each project's next and last session dates. */
  sessions: Session[]
  /** May download the Projects by location report (permission downloadProjectReport). */
  canDownload: boolean
}>()

const route = useRoute()
const { tree, loading: taxonomyLoading } = useTaxonomy()

const emit = defineEmits<{ 'add-project': [] }>()

const totalHours = computed(() =>
  Math.round(props.projects.reduce((sum, p) => sum + p.hours, 0) * 10) / 10)

// The projects on the page (as filtered) by location tag; the tag filter narrows the locations.
function onDownload() {
  const today = new Date().toISOString().slice(0, 10)
  const rows = projectsByLocationRows(props.projects, props.sessions, tree.value, String(route.query.tag ?? ''), window.location.origin)
  downloadCsv(`${today} Projects by location.csv`, PROJECTS_BY_LOCATION_HEADERS, rows)
}

function onShare() {
  shareCurrentUrl()
}
</script>
