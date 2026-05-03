<template>
  <TaskLayout v-if="store.httpStatus === 404">
    <FormCard title="Group not found">
      <p class="gd-task-message">This group doesn't exist.</p>
      <FormSubmitRow>
        <AppButton usage="task" label="Back to groups" @click="router.push('/groups')" />
      </FormSubmitRow>
    </FormCard>
  </TaskLayout>

  <DefaultLayout v-else>
    <h1 v-if="store.group" class="sr-only">{{ store.group.displayName || store.group.key }}</h1>
    <LoadingSpinner v-if="store.loading" />
    <div v-else-if="store.error" class="gd-error">{{ store.error }}</div>
    <template v-else-if="store.group">
      <PageHeader>{{ store.group.displayName || store.group.key }}</PageHeader>

      <!-- Header: description left, actions right -->
      <LayoutColumns ratio="2-1" align="start">
        <template #left>
          <GroupDetailHeader :group="store.group" />
        </template>
        <template #right>
          <GroupDetailActions
            v-if="profile.isAdmin"
            ref="actionsRef"
            :group="store.group"
            @edit-group="onEditGroup"
            @add-session="onAddSession"
            @delete-group="onDeleteGroup"
          />
        </template>
      </LayoutColumns>

      <!-- Repeats and Regulars: full width -->
      <RegularList
        v-if="profile.isAdmin || profile.isCheckIn"
        :items="regularItems"
        :working-slug="workingRegularSlug ?? undefined"
        :error="regularError"
        @edit-regular="onRegularEdit"
      />

      <RegularEditModal
        v-if="editingRegular"
        :regular="editingRegular"
        :adults="regularAdults"
        :accompanying-for="regularAccompanyingFor"
        :working="regularWorking"
        :error="regularModalError"
        @close="editingRegular = null"
        @view-link="router.push(profilePath(editingRegular.slug))"
        @save="onRegularSave"
        @delete="onRegularDelete"
      />

      <!-- Previous session covers (this group only), same pattern as homepage -->
      <LayoutColumns v-if="coverItems.length" ratio="1">
        <template #header>
          <SectionHeader>What we've been up to</SectionHeader>
        </template>
        <template #left>
          <MediaCarousel title="Photos from recent events" :max-height="280">
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

      <!-- Group Contribution: bar chart left, word cloud right -->
      <LayoutColumns ratio="2-1" align="start">
        <template #header><SectionHeader>How it all adds up</SectionHeader></template>
        <template #left>
          <CardTitle>This many hours</CardTitle>
          <FyBarChart :sessions="store.group.sessions" v-model="selectedFy" @click-selected="onSelectedBarClick" />
        </template>
        <template #right>
          <CardTitle>All these trails</CardTitle>
          <TermCloud :tags="tagHours" @click="onTagClick" />
        </template>
      </LayoutColumns>

      <!-- Find a Session: upcoming sessions full width -->
      <LayoutColumns ratio="1">
        <template #header><SectionHeader>Find a Session</SectionHeader></template>
        <template #left>
          <SessionListResults :sessions="futureSessions" />
        </template>
      </LayoutColumns>

    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupDetailStore } from '../stores/groupDetail'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { useViewer } from '../composables/useViewer'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import AppButton from '../components/AppButton.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import MediaCarousel from '../components/MediaCarousel.vue'
import MediaCard from '../components/MediaCard.vue'
import GroupDetailHeader from '../components/groups/GroupDetailHeader.vue'
import GroupDetailActions from '../components/groups/GroupDetailActions.vue'
import RegularList from '../components/RegularList.vue'
import type { RegularListItem } from '../components/RegularList.vue'
import RegularEditModal from './modals/RegularEditModal.vue'
import type { RegularEditItem } from './modals/RegularEditModal.vue'
import SessionListResults from '../components/sessions/SessionListResults.vue'
import FyBarChart from '../components/FyBarChart.vue'
import TermCloud from '../components/TermCloud.vue'
import CardTitle from '../components/CardTitle.vue'
import SectionHeader from '../components/SectionHeader.vue'
import { sessionPath, groupPath, groupsPath, profilePath } from '../router/index'
import type { SessionResponse, TagHoursItem } from '../../../types/api-responses'
import type { Session, SessionStats } from '../types/session'
import type { MediaItem } from '../types/media'
import type { EditGroupPayload } from './modals/GroupEditModal.vue'
import type { AddSessionPayload } from './modals/GroupAddSessionModal.vue'

const route = useRoute()
const router = useRouter()
const store = useGroupDetailStore()
const profile = useViewer()

const actionsRef = ref<InstanceType<typeof GroupDetailActions> | null>(null)
const workingRegularSlug = ref<string | null>(null)
const regularError = ref('')
const editingRegular = ref<RegularEditItem | null>(null)
const regularAccompanyingFor = ref<string[]>([])
const regularWorking = ref(false)
const regularModalError = ref('')

const regularItems = computed<RegularListItem[]>(() =>
  (store.group?.regulars ?? []).map(r => ({
    profileId: r.profileId,
    slug: r.slug,
    name: r.name,
    hours: r.hours,
    isRegular: r.isRegular,
    regularId: r.regularId,
    accompanyingAdultId: r.accompanyingAdultId,
  }))
)

const regularAdults = computed(() =>
  regularItems.value
    .filter(r => r.isRegular && r.accompanyingAdultId === undefined && r.profileId !== undefined)
    .map(r => ({ id: r.profileId as number, name: r.name }))
)

const titleText = computed(() => store.group?.displayName || store.group?.key || '')
usePageTitle(titleText)

const selectedFy = ref('')
const tagHours = ref<TagHoursItem[]>([])
const selectedCoverIndex = ref<number | null>(null)

const today = new Date().toISOString().slice(0, 10)

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
    isRegistered: profileStats?.sessionIds?.includes(r.id) ?? false,
    isAttended: !r.isBookable && (profileStats?.sessionIds?.includes(r.id) ?? false),
    isRegular: profileStats?.regularGroupIds?.includes(r.groupId ?? -1) ?? false,
  }
}

const futureSessions = computed<Session[]>(() =>
  (store.group?.sessions ?? [])
    .filter(s => s.date >= today)
    .map(mapSession)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
)

function previousWorkCoverTitle(s: SessionResponse): string {
  const dateStr = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const sessionName = s.displayName?.trim()
  return sessionName ? `${dateStr}, ${sessionName}` : dateStr
}

const coverItems = computed<MediaItem[]>(() =>
  !store.group ? [] :
  [...store.group.sessions]
    .filter(s => !!s.coverUrl)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(s => ({
      id: String(s.id),
      listItemId: 0,
      url: s.coverUrl!,
      mimeType: 'image/jpeg',
      title: previousWorkCoverTitle(s),
      isPublic: true,
    }))
)

function onCoverSelect(index: number) {
  selectedCoverIndex.value = index
  const item = coverItems.value[index]
  if (!item || !store.group) return
  const session = store.group.sessions.find(s => String(s.id) === item.id)
  if (session) router.push(sessionPath(store.group.key, session.date))
}


watchEffect(async () => {
  const key = store.group?.key
  if (!key) return
  const fy = selectedFy.value
  const params = new URLSearchParams({ group: key })
  if (fy && fy !== 'all') params.set('fy', fy)
  try {
    const res = await fetch(`/api/tags/hours-by-taxonomy?${params}`)
    if (!res.ok) return
    const json = await res.json()
    tagHours.value = json.data as TagHoursItem[]
  } catch (e) {
    console.error('[GroupDetail] tag hours', e)
  }
})

function onSelectedBarClick() {
  const key = store.group?.key
  if (!key) return
  router.push({ path: '/sessions', query: { fy: 'all', group: key } })
}

function onTagClick(_termGuid: string, label: string) {
  const key = store.group?.key
  if (!key) return
  const query: Record<string, string> = { group: key, tag: label }
  if (selectedFy.value && selectedFy.value !== 'all') query.fy = selectedFy.value
  router.push({ path: '/sessions', query })
}

function reload() {
  store.fetch(route.params.key as string)
}

async function onEditGroup(data: EditGroupPayload) {
  const currentKey = store.group!.key
  try {
    const res = await fetch(`/api/groups/${currentKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to save')
    const json = await res.json()
    actionsRef.value?.onEditSuccess()
    if (json.data?.key && json.data.key !== currentKey) {
      router.push(groupPath(json.data.key))
    } else {
      reload()
    }
  } catch (e) {
    console.error('[GroupDetailPage] edit group', e)
    actionsRef.value?.onEditError('Failed to save group')
  }
}

async function onAddSession(data: AddSessionPayload) {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create session')
    const json = await res.json()
    actionsRef.value?.onAddSuccess()
    router.push(sessionPath(store.group!.key, json.data?.date ?? data.date))
  } catch (e) {
    console.error('[GroupDetailPage] add session', e)
    actionsRef.value?.onAddError('Failed to create session')
  }
}

async function onDeleteGroup() {
  try {
    const res = await fetch(`/api/groups/${store.group!.key}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete')
    actionsRef.value?.onDeleteSuccess()
    router.push(groupsPath())
  } catch (e) {
    console.error('[GroupDetailPage] delete group', e)
  }
}

function onRegularEdit(slug: string) {
  const item = regularItems.value.find(r => r.slug === slug)
  if (!item) return
  regularModalError.value = ''
  regularAccompanyingFor.value = item.profileId !== undefined
    ? regularItems.value.filter(r => r.accompanyingAdultId === item.profileId).map(r => r.name)
    : []
  editingRegular.value = {
    name: item.name,
    slug: item.slug,
    regularId: item.regularId,
    accompanyingAdultId: item.accompanyingAdultId,
  }
}

async function onRegularSave(data: { accompanyingAdultId: number | null }) {
  if (!editingRegular.value || !store.group) return
  const { slug, regularId } = editingRegular.value
  workingRegularSlug.value = slug
  regularWorking.value = true
  regularModalError.value = ''
  try {
    if (regularId !== undefined) {
      const res = await fetch(`/api/regulars/${regularId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accompanyingAdultId: data.accompanyingAdultId }),
      })
      if (!res.ok) throw new Error(`Update failed (${res.status})`)
      const item = store.group.regulars.find(r => r.slug === slug)
      if (item) item.accompanyingAdultId = data.accompanyingAdultId ?? undefined
    } else {
      const res = await fetch(`/api/profiles/${slug}/regulars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: store.group.id,
          ...(data.accompanyingAdultId !== null && { accompanyingAdultId: data.accompanyingAdultId }),
        }),
      })
      if (!res.ok) throw new Error(`Add failed (${res.status})`)
      const json = await res.json()
      const item = store.group.regulars.find(r => r.slug === slug)
      if (item) {
        item.isRegular = true
        item.regularId = json.data.id
        item.accompanyingAdultId = data.accompanyingAdultId ?? undefined
      }
    }
    editingRegular.value = null
  } catch (e) {
    console.error('[GroupDetailPage] onRegularSave failed', e)
    regularModalError.value = 'Failed to save — please try again'
  } finally {
    regularWorking.value = false
    workingRegularSlug.value = null
  }
}

async function onRegularDelete() {
  if (!editingRegular.value?.regularId || !store.group) return
  const { slug, regularId } = editingRegular.value
  workingRegularSlug.value = slug
  regularWorking.value = true
  regularModalError.value = ''
  try {
    const res = await fetch(`/api/regulars/${regularId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    const item = store.group.regulars.find(r => r.slug === slug)
    if (item) { item.isRegular = false; item.regularId = undefined; item.accompanyingAdultId = undefined }
    editingRegular.value = null
  } catch (e) {
    console.error('[GroupDetailPage] onRegularDelete failed', e)
    regularModalError.value = 'Failed to delete — please try again'
  } finally {
    regularWorking.value = false
    workingRegularSlug.value = null
  }
}

onMounted(reload)

watch(() => route.params.key, key => {
  if (key) store.fetch(key as string)
})
</script>

<style scoped>
.gd-error { padding: 2rem; color: var(--color-dtv-red); }


.gd-task-message {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  text-align: center;
  margin: 0 0 0.5rem;
}
</style>
