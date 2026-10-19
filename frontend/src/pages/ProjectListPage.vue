<template>
  <DefaultLayout>
    <h1 class="sr-only">Projects</h1>
    <PageHeader>Projects</PageHeader>
    <div class="pb-6">
      <ProjectListFilter
        :projects="projectsStore.projects"
        :sessions="sessionsStore.sessions"
        :statuses="statuses"
        @filtered="filtered = $event"
        @empty-trails="emptyTrails = $event"
        @all-trails="allTrails = $event"
      />
      <ProjectListActions
        :projects="filtered"
        :profile="profile.context"
        :can-edit="profile.can('editProjects')"
        :sessions="sessionsStore.sessions"
        :can-download="profile.can('bulkProjects')"
        :selected="selected"
        :empty-trails="emptyTrails"
        @add-project="onAddProjectAt('')"
      />
      <ProjectListResults
        :projects="filtered"
        :empty-trails="emptyTrails"
        :groups="groups"
        :can-add="profile.can('editProjects')"
        :selected="profile.can('bulkProjects') ? selected : undefined"
        :loading="projectsStore.loading || sessionsStore.loading"
        :error="projectsStore.error"
        @update:selected="selected = $event"
        @add-project="onAddProjectAt"
        @filter-tag="tag => router.replace({ query: { ...route.query, tag } })"
      />
    </div>

    <ProjectAddModal
      v-if="showAddProject"
      :statuses="statuses"
      :initial-tag="addProjectTag"
      :working="addProjectWorking"
      :error="addProjectError || statusesError"
      @close="showAddProject = false; addProjectError = ''"
      @add="onAddProject"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { pruneSelectionToVisible } from '../utils/listSelection'
import { useRoute, useRouter } from 'vue-router'
import { useTaxonomy } from '../composables/useTaxonomy'
import { projectsByLocation } from '../utils/projectsByLocation'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import ProjectListFilter from '../components/projects/ProjectListFilter.vue'
import ProjectListActions from '../components/projects/ProjectListActions.vue'
import ProjectListResults from '../components/projects/ProjectListResults.vue'
import ProjectAddModal from './modals/ProjectAddModal.vue'
import type { AddProjectPayload } from './modals/ProjectAddModal.vue'
import { useProjectListStore } from '../stores/projectList'
import { useSessionListStore } from '../stores/sessionList'
import { useViewer } from '../composables/useViewer'
import { projectPath } from '../router'
import type { ProjectWithStats } from '../components/projects/ProjectListFilter.vue'
import { fetchProjectStatuses, STATUSES_ERROR } from '../utils/projectStatuses'

usePageTitle('Projects')

const projectsStore = useProjectListStore()
const sessionsStore = useSessionListStore()
const profile = useViewer()
const router = useRouter()
const route = useRoute()
const { tree } = useTaxonomy()
const filtered = ref<ProjectWithStats[]>([])
const emptyTrails = ref<string[]>([])
const allTrails = ref(false)
/** Show all trails: the projects grouped by trail, the same order as the CSV */
const groups = computed(() => allTrails.value
  ? projectsByLocation(filtered.value, sessionsStore.sessions, tree.value, emptyTrails.value)
  : null)
const selected = ref<number[]>([])
const showAddProject = ref(false)
/** The trail a new project starts at, when added from a No projects card */
const addProjectTag = ref('')

// Keep the selection to the projects the filters show.
watch(filtered, list => {
  const pruned = pruneSelectionToVisible(selected.value, list)
  if (pruned.length !== selected.value.length) selected.value = pruned
})

function onAddProjectAt(trail: string) {
  addProjectTag.value = trail
  showAddProject.value = true
}
const addProjectWorking = ref(false)
const addProjectError = ref('')
const statuses = ref<string[]>([])
const statusesError = ref('')

async function onAddProject(data: AddProjectPayload) {
  addProjectWorking.value = true
  addProjectError.value = ''
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: data.key, name: data.name, description: data.description, status: data.status, metadata: data.metadata }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to create project')
    }
    const json = await res.json()
    showAddProject.value = false
    await projectsStore.fetch()
    if (json.data?.key) router.push(projectPath(json.data.key))
  } catch (e) {
    addProjectError.value = e instanceof Error ? e.message : 'An error occurred'
    console.error('[ProjectListPage] onAddProject', e)
  } finally {
    addProjectWorking.value = false
  }
}

onMounted(() => {
  projectsStore.fetch()
  sessionsStore.fetch()
  fetchProjectStatuses()
    .then(list => { statuses.value = list })
    .catch(e => {
      console.error('[ProjectListPage] load statuses', e)
      statusesError.value = STATUSES_ERROR
    })
})
</script>
