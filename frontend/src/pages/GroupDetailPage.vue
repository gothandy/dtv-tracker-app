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

      <!-- Gallery: full width -->
      <MediaCarousel v-if="coverItems.length" title="What we've been up to" :max-height="280">
        <MediaCard
          v-for="(item, i) in coverItems"
          :key="item.id"
          :item="item"
          :clickable="true"
          @select="onCoverSelect(i)"
        />
      </MediaCarousel>

      <!-- Repeats and Regulars: full width -->
      <RegularList
        v-if="profile.isAdmin || profile.isCheckIn"
        :items="regularItems"
        :allow-toggle-regular="profile.isAdmin || profile.isCheckIn"
        :working-slug="workingRegularSlug ?? undefined"
        :error="regularError"
        @add-regular="onGroupAddRegular"
        @remove-regular="onGroupRemoveRegular"
      />

      <!-- Group Contribution: bar chart left, word cloud right -->
      <LayoutColumns ratio="2-1" align="start">
        <template #header><SectionHeader>Group Contribution</SectionHeader></template>
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
import SessionListResults from '../components/sessions/SessionListResults.vue'
import FyBarChart from '../components/FyBarChart.vue'
import TermCloud from '../components/TermCloud.vue'
import CardTitle from '../components/CardTitle.vue'
import SectionHeader from '../components/SectionHeader.vue'
import { sessionPath, groupPath, groupsPath, profilePath } from '../router/index'
import type { SessionResponse, TagHoursItem } from '../../../types/api-responses'
import type { Session } from '../types/session'
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

const regularItems = computed<RegularListItem[]>(() =>
  (store.group?.regulars ?? []).map(r => ({
    slug: r.slug,
    name: r.name,
    linkTo: profilePath(r.slug),
    hours: r.hours,
    isRegular: r.isRegular,
    regularId: r.regularId,
  }))
)

const titleText = computed(() => store.group?.displayName || store.group?.key || '')
usePageTitle(titleText)

const selectedFy = ref('')
const tagHours = ref<TagHoursItem[]>([])

const today = new Date().toISOString().slice(0, 10)

function mapSession(r: SessionResponse): Session {
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
    registrations: r.registrations,
    hours: r.hours,
    mediaCount: r.mediaCount,
    newCount: r.newCount,
    childCount: r.childCount,
    regularCount: r.regularCount,
    regularsCount: r.regularsCount,
    eventbriteCount: r.eventbriteCount,
    metadata: r.metadata,
    isRegistered: r.isRegistered ?? false,
    isAttended: r.isAttended ?? false,
    isRegular: r.isRegular ?? false,
  }
}

const futureSessions = computed<Session[]>(() =>
  (store.group?.sessions ?? [])
    .filter(s => s.date >= today)
    .map(mapSession)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
)

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
      title: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      isPublic: true,
    }))
)

function onCoverSelect(index: number) {
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

async function onGroupAddRegular(profileSlug: string) {
  if (!store.group) return
  workingRegularSlug.value = profileSlug
  regularError.value = ''
  try {
    const res = await fetch(`/api/profiles/${profileSlug}/regulars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: store.group.id }),
    })
    if (!res.ok) throw new Error(`Add failed (${res.status})`)
    const json = await res.json()
    const item = store.group.regulars.find(r => r.slug === profileSlug)
    if (item) { item.isRegular = true; item.regularId = json.data.id }
  } catch (e) {
    console.error('[GroupDetailPage] onGroupAddRegular failed', e)
    regularError.value = 'Failed to update — please try again'
  } finally {
    workingRegularSlug.value = null
  }
}

async function onGroupRemoveRegular(profileSlug: string, regularId: number | undefined) {
  if (!store.group || regularId === undefined) return
  workingRegularSlug.value = profileSlug
  regularError.value = ''
  try {
    const res = await fetch(`/api/regulars/${regularId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    const item = store.group.regulars.find(r => r.slug === profileSlug)
    if (item) { item.isRegular = false; item.regularId = undefined }
  } catch (e) {
    console.error('[GroupDetailPage] onGroupRemoveRegular failed', e)
    regularError.value = 'Failed to update — please try again'
  } finally {
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
