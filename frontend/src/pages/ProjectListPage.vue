<template>
  <DefaultLayout>
    <h1 class="sr-only">Projects</h1>
    <PageHeader>Projects</PageHeader>
    <div class="pb-6">
      <ProjectListFilter
        :projects="projectsStore.projects"
        :sessions="sessionsStore.sessions"
        @filtered="filtered = $event"
      />
      <ProjectListActions
        v-if="profile.isAdmin"
        :projects="filtered"
        :profile="profile.context"
        @add-project="showAddProject = true"
      />
      <ProjectListResults
        :projects="filtered"
        :loading="projectsStore.loading || sessionsStore.loading"
        :error="projectsStore.error"
      />
    </div>

    <ProjectAddModal
      v-if="showAddProject"
      :working="addProjectWorking"
      :error="addProjectError"
      @close="showAddProject = false; addProjectError = ''"
      @add="onAddProject"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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

usePageTitle('Projects')

const projectsStore = useProjectListStore()
const sessionsStore = useSessionListStore()
const profile = useViewer()
const router = useRouter()
const filtered = ref<ProjectWithStats[]>([])
const showAddProject = ref(false)
const addProjectWorking = ref(false)
const addProjectError = ref('')

async function onAddProject(data: AddProjectPayload) {
  addProjectWorking.value = true
  addProjectError.value = ''
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: data.key, name: data.name, description: data.description }),
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
})
</script>
