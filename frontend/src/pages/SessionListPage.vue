<template>
  <DefaultLayout>
    <h1 class="sr-only">Sessions</h1>
    <PageHeader>Sessions</PageHeader>
    <SessionListFilter :sessions="store.sessions" :profile="profile.context" @filtered="filtered = $event" />
    <SessionListActions
      :sessions="filtered"
      :can-bulk-tag="profile.isAdmin"
      :media-public-working="mediaPublicWorking"
      v-model:selected="selected"
      @add-tags="showTagModal = true"
      @update-project="openProjectModal"
      @media-public="showMediaPublicModal = true"
      @add-session="showAddSession = true"
    />
    <SessionListResults
      :sessions="filtered"
      :loading="store.loading"
      :show-cover-photos="showCoverPhotos"
      v-model:selected="selected"
    />

    <SessionAddTagsModal
      v-if="showTagModal"
      :count="visibleSelectedCount"
      :working="tagWorking"
      :error="tagError"
      @close="showTagModal = false"
      @save="onApplyTag"
    />

    <SessionBulkProjectModal
      v-if="showProjectModal"
      :count="visibleSelectedCount"
      :projects="projectOptions"
      :working="projectWorking"
      :error="projectError"
      @close="showProjectModal = false"
      @save="onApplyProject"
    />

    <SessionBulkMediaPublicModal
      v-if="showMediaPublicModal"
      :count="visibleSelectedCount"
      :working="mediaPublicWorking"
      :error="mediaPublicError"
      @close="showMediaPublicModal = false"
      @confirm="onApplyMediaPublic"
    />

    <GroupAddSessionModal
      v-if="showAddSession"
      :groups="groupOptions"
      :projects="projectOptions"
      :working="addSessionWorking"
      :error="addSessionError"
      @close="showAddSession = false"
      @add="onAddSession"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import SessionListFilter from '../components/sessions/SessionListFilter.vue'
import SessionListActions from '../components/sessions/SessionListActions.vue'
import SessionListResults from '../components/sessions/SessionListResults.vue'
import SessionAddTagsModal from './modals/SessionAddTagsModal.vue'
import SessionBulkProjectModal from './modals/SessionBulkProjectModal.vue'
import SessionBulkMediaPublicModal from './modals/SessionBulkMediaPublicModal.vue'
import GroupAddSessionModal from './modals/GroupAddSessionModal.vue'
import type { AddSessionPayload } from './modals/GroupAddSessionModal.vue'
import { useSessionListStore } from '../stores/sessionList'
import { useGroupListStore } from '../stores/groupList'
import { useProjectListStore } from '../stores/projectList'
import type { ProjectItem } from './modals/SessionEditModal.vue'
import { useViewer } from '../composables/useViewer'
import { sessionPath } from '../router'
import type { Session } from '../types/session'
import { pruneSelectionToVisible, visibleSelected } from '../utils/listSelection'

usePageTitle('Sessions')

const route = useRoute()
const store = useSessionListStore()
const groupsStore = useGroupListStore()
const projectsStore = useProjectListStore()
const profile = useViewer()
const router = useRouter()
const showCoverPhotos = computed(() => route.query.media === 'public')
const filtered = ref<Session[]>([])
const selected = ref<number[]>([])
const showTagModal = ref(false)
const tagWorking = ref(false)
const tagError = ref('')
const showProjectModal = ref(false)
const projectWorking = ref(false)
const projectError = ref('')
const showMediaPublicModal = ref(false)
const mediaPublicWorking = ref(false)
const mediaPublicError = ref('')
const showAddSession = ref(false)
const addSessionWorking = ref(false)
const addSessionError = ref('')

watch(filtered, list => {
  const pruned = pruneSelectionToVisible(selected.value, list)
  if (pruned.length !== selected.value.length) selected.value = pruned
})

store.fetch()
groupsStore.fetch()

watch(
  () => profile.ready && profile.isAdmin,
  shouldLoad => {
    if (shouldLoad) projectsStore.fetch()
  },
  { immediate: true },
)

const visibleSelectedCount = computed(() =>
  visibleSelected(selected.value, filtered.value).length,
)

const groupOptions = computed(() =>
  groupsStore.groups
    .map(g => ({ id: g.id, key: g.key, displayName: g.displayName }))
    .sort((a, b) => (a.displayName ?? a.key).localeCompare(b.displayName ?? b.key))
)

const projectOptions = computed<ProjectItem[]>(() =>
  projectsStore.projects
    .map(p => ({ id: p.id, key: p.key, name: p.displayName ?? p.key }))
    .sort((a, b) => a.name.localeCompare(b.name))
)

async function openProjectModal() {
  if (profile.isAdmin && !projectsStore.projects.length && !projectsStore.loading) {
    await projectsStore.fetch()
  }
  showProjectModal.value = true
}

async function onApplyTag(label: string, termGuid: string) {
  tagWorking.value = true
  tagError.value = ''
  const tag = { label, termGuid }
  const sessionIds = visibleSelected(selected.value, filtered.value).map(s => s.id)
  const res = await fetch('/api/sessions/bulk-tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionIds, tags: [tag] }),
  })
  if (!res.ok) {
    tagError.value = 'Bulk tag failed — please try again'
    tagWorking.value = false
    console.error('[SessionListPage] bulk-tag failed', res.status)
    return
  }
  store.applyTag(sessionIds, tag)
  showTagModal.value = false
  tagWorking.value = false
  tagError.value = ''
  selected.value = []
}

async function onApplyProject(projectId: number | null) {
  projectWorking.value = true
  projectError.value = ''
  const sessionIds = visibleSelected(selected.value, filtered.value).map(s => s.id)
  const res = await fetch('/api/sessions/bulk-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionIds, projectId }),
  })
  if (!res.ok) {
    projectError.value = 'Update project failed — please try again'
    projectWorking.value = false
    console.error('[SessionListPage] bulk-project failed', res.status)
    return
  }
  const project = projectId === null
    ? { id: null }
    : (() => {
        const p = projectsStore.projects.find(x => x.id === projectId)
        return {
          id: projectId,
          key: p?.key,
          title: p?.displayName ?? p?.key,
        }
      })()
  store.applyProject(sessionIds, project)
  showProjectModal.value = false
  projectWorking.value = false
  projectError.value = ''
  selected.value = []
}

async function onApplyMediaPublic() {
  mediaPublicWorking.value = true
  mediaPublicError.value = ''
  const sessionIds = visibleSelected(selected.value, filtered.value).map(s => s.id)
  try {
    const res = await fetch('/api/sessions/bulk-media-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(json.error || 'Make media public failed — please try again')
    }
    const json = await res.json() as { data?: { errors?: string[] } }
    if (json.data?.errors?.length) {
      console.error('[SessionListPage] bulk-media-public partial errors', json.data.errors)
    }
    showMediaPublicModal.value = false
    selected.value = []
    await store.fetch()
  } catch (e) {
    mediaPublicError.value = e instanceof Error ? e.message : 'An error occurred'
    console.error('[SessionListPage] bulk-media-public failed', e)
  } finally {
    mediaPublicWorking.value = false
  }
}

async function onAddSession(data: AddSessionPayload) {
  addSessionWorking.value = true
  addSessionError.value = ''
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to create session — please try again')
    }
    const json = await res.json()
    showAddSession.value = false
    await store.fetch()
    if (json.data?.groupKey && json.data?.date) {
      router.push(sessionPath(json.data.groupKey, json.data.date))
    }
  } catch (e) {
    addSessionError.value = e instanceof Error ? e.message : 'An error occurred'
    console.error('[SessionListPage] add-session failed', e)
  } finally {
    addSessionWorking.value = false
  }
}
</script>
