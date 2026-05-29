<template>
  <TaskLayout v-if="store.httpStatus === 404">
    <FormCard title="Project not found">
      <p class="pd-task-message">This project doesn't exist.</p>
      <FormSubmitRow>
        <AppButton usage="task" label="Back to projects" @click="router.push(projectsPath())" />
      </FormSubmitRow>
    </FormCard>
  </TaskLayout>

  <DefaultLayout v-else>
    <h1 v-if="store.project" class="sr-only">{{ store.project.displayName || store.project.key }}</h1>
    <LoadingSpinner v-if="store.loading" />
    <div v-else-if="store.error" class="pd-error">{{ store.error }}</div>
    <template v-else-if="store.project">
      <PageHeader>{{ store.project.displayName || store.project.key }}</PageHeader>

      <LayoutColumns ratio="2-1" align="start">
        <template #left>
          <ProjectDetailHeader
            :project="store.project"
            :allow-edit="profile.hasCheckInAccess"
            :tag-working="tagWorking"
            :tag-error="tagError"
            :tree="taxonomyTree"
            :taxonomy-loading="taxonomyLoading"
            @save-tags="onSaveTags"
          />
        </template>
        <template #right>
          <ProjectDetailActions
            ref="actionsRef"
            :project="store.project"
            :profile="profile.context"
            @edit-project="onEditProject"
            @delete-project="onDeleteProject"
          />
        </template>
      </LayoutColumns>

      <LayoutColumns v-if="coverItems.length" ratio="1">
        <template #header>
          <SectionHeader>What we've been up to</SectionHeader>
        </template>
        <template #left>
          <MediaCarousel title="Photos from linked sessions" :max-height="280">
            <MediaCard
              v-for="(item, i) in coverItems"
              :key="item.id"
              :item="item"
              :clickable="true"
              :selected="i === selectedCoverIndex"
              @select="onCoverSelect(i)"
            />
          </MediaCarousel>
        </template>
      </LayoutColumns>

      <LayoutColumns v-if="showDocumentsCard" ratio="1-2" align="start">
        <template #left>
          <ProjectDetailStats :stats="store.project.stats" />
        </template>
        <template #right>
          <ProjectDocsCard
            :attachments="store.attachments"
            :project-key="store.project.key"
            :loading="store.attachmentsLoading"
            :error="store.attachmentsError"
            :allow-manage="profile.isAdmin"
            :deleting-ids="store.docsDeletingIds"
            @delete="onDeleteDoc"
          />
        </template>
      </LayoutColumns>

      <LayoutColumns v-else ratio="1">
        <template #left>
          <ProjectDetailStats :stats="store.project.stats" />
        </template>
      </LayoutColumns>

      <LayoutColumns ratio="1">
        <template #header><SectionHeader>Linked sessions</SectionHeader></template>
        <template #left>
          <SessionListResults :sessions="linkedSessions" />
        </template>
      </LayoutColumns>
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router'
import { useProjectDetailStore } from '../stores/projectDetail'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { useViewer } from '../composables/useViewer'
import { useTaxonomy } from '../composables/useTaxonomy'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import AppButton from '../components/AppButton.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import MediaCarousel from '../components/MediaCarousel.vue'
import MediaCard from '../components/MediaCard.vue'
import ProjectDetailHeader from '../components/projects/ProjectDetailHeader.vue'
import ProjectDetailActions from '../components/projects/ProjectDetailActions.vue'
import ProjectDetailStats from '../components/projects/ProjectDetailStats.vue'
import ProjectDocsCard from '../components/projects/ProjectDocsCard.vue'
import SessionListResults from '../components/sessions/SessionListResults.vue'
import SectionHeader from '../components/SectionHeader.vue'
import { sessionPath, projectPath, projectsPath } from '../router/index'
import type { SessionResponse } from '../../../types/api-responses'
import type { Session, SessionStats } from '../types/session'
import type { MediaItem } from '../types/media'
import type { EditProjectPayload } from './modals/ProjectEditModal.vue'
import { buildSessionCoverCarouselItems } from '../utils/sessionCarousel'

const route = useRoute()
const router = useRouter()
const store = useProjectDetailStore()
const profile = useViewer()
const { tree: taxonomyTree, loading: taxonomyLoading } = useTaxonomy()

const actionsRef = ref<InstanceType<typeof ProjectDetailActions> | null>(null)
const tagWorking = ref(false)
const tagError = ref('')
const selectedCoverIndex = ref<number | null>(null)

const titleText = computed(() => store.project?.displayName || store.project?.key || '')
usePageTitle(titleText)

const coverItems = computed<MediaItem[]>(() =>
  store.project ? buildSessionCoverCarouselItems(store.project.sessions) : []
)

function mapSession(r: SessionResponse): Session {
  const profileStats = profile.user?.profileStats
  return {
    id: r.id,
    date: r.date,
    groupId: r.groupId,
    groupKey: r.groupKey,
    groupName: r.groupName,
    displayName: r.displayName,
    description: r.description,
    financialYear: r.financialYear,
    isBookable: r.isBookable,
    limits: r.limits,
    stats: r.stats as SessionStats,
    regularsCount: r.regularsCount,
    mediaCount: r.mediaCount,
    coverUrl: r.coverUrl,
    metadata: r.metadata,
    projectId: r.projectId,
    projectKey: r.projectKey,
    projectTitle: r.projectTitle,
    isRegistered: profileStats?.sessionIds?.includes(r.id) ?? false,
    isAttended: !r.isBookable && (profileStats?.sessionIds?.includes(r.id) ?? false),
    isRegular: profileStats?.regularGroupIds?.includes(r.groupId ?? -1) ?? false,
  }
}

const linkedSessions = computed<Session[]>(() =>
  (store.project?.sessions ?? []).map(mapSession)
)

const showDocumentsCard = computed(() => {
  if (profile.isAdmin) return true
  return store.attachmentsLoading || store.attachments.length > 0
})

function onCoverSelect(index: number) {
  selectedCoverIndex.value = index
  const item = coverItems.value[index]
  if (!item || !store.project) return
  const session = store.project.sessions.find(s => String(s.id) === item.id)
  if (session?.groupKey) router.push(sessionPath(session.groupKey, session.date))
}

async function onSaveTags(tags: Array<{ label: string; termGuid: string }>) {
  if (!store.project) return
  tagWorking.value = true
  tagError.value = ''
  try {
    const res = await fetch(`/api/projects/${store.project.key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: tags }),
    })
    if (!res.ok) throw new Error(`PATCH failed (${res.status})`)
    store.project.metadata = tags.length ? tags : undefined
  } catch (e) {
    tagError.value = 'Failed to save tags — please try again'
    console.error('[ProjectDetailPage] onSaveTags failed', e)
  } finally {
    tagWorking.value = false
  }
}

async function onEditProject(payload: EditProjectPayload) {
  if (!store.project) return
  try {
    const res = await fetch(`/api/projects/${store.project.key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: payload.displayName,
        key: payload.key,
        description: payload.description,
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to update project')
    }
    const json = await res.json()
    actionsRef.value?.onEditSuccess()
    const newKey = json.data?.key ?? payload.key
    if (newKey !== store.project.key) {
      router.replace(projectPath(newKey))
    } else {
      await store.refresh(newKey)
    }
  } catch (e) {
    actionsRef.value?.onEditError(e instanceof Error ? e.message : 'Update failed')
    console.error('[ProjectDetailPage] onEditProject', e)
  }
}

async function onDeleteDoc(itemId: string) {
  if (!store.project) return
  await store.deleteDocument(store.project.key, itemId)
}

async function onDeleteProject() {
  if (!store.project) return
  try {
    const res = await fetch(`/api/projects/${store.project.key}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    actionsRef.value?.onDeleteSuccess()
    router.push(projectsPath())
  } catch (e) {
    console.error('[ProjectDetailPage] onDeleteProject', e)
  }
}

watch(() => route.params.key, key => {
  if (typeof key === 'string') {
    store.fetch(key)
    store.fetchAttachments(key)
  }
}, { immediate: true })

onBeforeRouteUpdate(to => {
  const key = to.params.key
  if (typeof key === 'string' && !String(to.path).endsWith('/upload')) {
    store.fetchAttachments(String(key).toLowerCase())
  }
})

watchEffect(() => {
  if (coverItems.value.length && selectedCoverIndex.value === null) {
    selectedCoverIndex.value = 0
  }
})
</script>

<style scoped>
.pd-error { color: var(--color-dtv-red); padding: 2rem; text-align: center; }
.pd-task-message { margin-bottom: 1rem; }
</style>
