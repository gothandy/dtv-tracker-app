<template>
  <DefaultLayout>
    <h1 v-if="store.group" class="sr-only">{{ store.group.displayName || store.group.key }}</h1>
    <div v-if="store.loading" class="gd-loading">Loading…</div>
    <div v-else-if="store.error" class="gd-error">{{ store.error }}</div>
    <template v-else-if="store.group">
      <PageHeader>{{ store.group.displayName || store.group.key }}</PageHeader>

      <!-- Left: header / bar chart / tag cloud  |  Right: actions / regulars / calendar -->
      <LayoutColumns ratio="2-1" align="start">
        <template #left>
          <GroupDetailHeader :group="store.group" />
          <CardTitle>Hours by year</CardTitle>
          <FyBarChart :sessions="store.group.sessions" v-model="selectedFy" @click-selected="onSelectedBarClick" />
          <CardTitle>Activity</CardTitle>
          <TermCloud :tags="tagHours" @click="onTagClick" />
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
          <GroupDetailRegulars v-if="profile.isAdmin || profile.isCheckIn" :group="store.group" />
          <div class="bg-dtv-green/25 flex items-start justify-center p-2">
            <CalendarWidget
              v-model="selectedDate"
              :sessions="groupSessions"
              :immediate-confirm="true"
              @confirm="onDateSelect"
            />
          </div>
        </template>
      </LayoutColumns>

      <!-- Gallery: full width -->
      <MediaCarousel v-if="coverItems.length" :max-height="280">
        <MediaCard v-for="item in coverItems" :key="item.id" :item="item" />
      </MediaCarousel>

    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupDetailStore } from '../stores/groupDetail'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import { useViewer } from '../composables/useViewer'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import CalendarWidget from '../components/CalendarWidget.vue'
import MediaCarousel from '../components/MediaCarousel.vue'
import MediaCard from '../components/MediaCard.vue'
import GroupDetailHeader from '../components/groups/GroupDetailHeader.vue'
import GroupDetailActions from '../components/groups/GroupDetailActions.vue'
import GroupDetailRegulars from '../components/groups/GroupDetailRegulars.vue'
import FyBarChart from '../components/FyBarChart.vue'
import TermCloud from '../components/TermCloud.vue'
import CardTitle from '../components/CardTitle.vue'
import { sessionPath, groupPath, groupsPath } from '../router/index'
import type { Session } from '../types/session'
import type { SessionResponse, TagHoursItem } from '../../../types/api-responses'
import type { MediaItem } from '../types/media'
import type { EditGroupPayload } from './modals/GroupEditModal.vue'
import type { AddSessionPayload } from './modals/GroupAddSessionModal.vue'

const route = useRoute()
const router = useRouter()
const store = useGroupDetailStore()
const profile = useViewer()

const actionsRef = ref<InstanceType<typeof GroupDetailActions> | null>(null)

const titleText = computed(() => store.group?.displayName || store.group?.key || '')
usePageTitle(titleText)

const selectedFy = ref('')
const selectedDate = ref<string | undefined>(undefined)
const tagHours = ref<TagHoursItem[]>([])

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

const groupSessions = computed<Session[]>(() =>
  store.group ? store.group.sessions.map(mapSession) : []
)

const coverItems = computed<MediaItem[]>(() => {
  if (!store.group) return []
  return [...store.group.sessions]
    .filter(s => (s.mediaCount ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(s => ({
      id: String(s.id),
      listItemId: 0,
      thumbnailUrl: `/media/${store.group!.key}/${s.date}/cover.jpg`,
      largeUrl: `/media/${store.group!.key}/${s.date}/cover.jpg`,
      mimeType: 'image/jpeg',
      title: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      isPublic: true,
    }))
})

// One-click navigate — on a group page there's at most one session per date
function onDateSelect(sessions: Session[]) {
  if (sessions.length === 1) {
    router.push(sessionPath(sessions[0].groupKey!, sessions[0].date))
  }
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

onMounted(reload)

watch(() => route.params.key, key => {
  if (key) {
    selectedDate.value = undefined
    store.fetch(key as string)
  }
})
</script>

<style scoped>
.gd-loading { padding: 2rem; color: var(--color-text-muted); }
.gd-error { padding: 2rem; color: var(--color-dtv-red); }
</style>
