<template>
  <DefaultLayout>
    <h1 v-if="store.group" class="sr-only">{{ store.group.displayName || store.group.key }}</h1>
    <div v-if="store.loading" class="gd-loading">Loading…</div>
    <div v-else-if="store.error" class="gd-error">{{ store.error }}</div>
    <template v-else-if="store.group">
      <PageTitle>{{ store.group.displayName || store.group.key }}</PageTitle>

      <!-- Left: header / bar chart / tag cloud  |  Right: actions / regulars / calendar -->
      <LayoutColumns ratio="2-1" align="start">
        <template #left>
          <GroupDetailHeader :group="store.group" />
          <FyBarChart :sessions="store.group.sessions" v-model="selectedFy" />
          <WordCloud :tags="tagHours" />
        </template>
        <template #right>
          <GroupDetailActions v-if="isAdmin" :group="store.group" @updated="reload" />
          <GroupDetailRegulars v-if="isAdmin || isCheckIn" :group="store.group" />
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
      <MediaGallery v-if="coverItems.length" :items="coverItems" :max-height="280" />

    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupDetailStore } from '../../stores/groupDetail'
import { usePageTitle } from '../../composables/usePageTitle'
import PageTitle from '../PageTitle.vue'
import { useRole } from '../../composables/useRole'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import LayoutColumns from '../LayoutColumns.vue'
import CalendarWidget from '../CalendarWidget.vue'
import MediaGallery from '../MediaGallery.vue'
import GroupDetailHeader from './GroupDetailHeader.vue'
import GroupDetailActions from './GroupDetailActions.vue'
import GroupDetailRegulars from './GroupDetailRegulars.vue'
import FyBarChart from '../FyBarChart.vue'
import WordCloud from '../WordCloud.vue'
import { sessionPath } from '../../router/index'
import type { Session } from '../../types/session'
import type { SessionResponse, TagHoursItem } from '../../../../types/api-responses'
import type { MediaItem } from '../../types/media'

const route = useRoute()
const router = useRouter()
const store = useGroupDetailStore()
const { isAdmin, isCheckIn } = useRole()

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
    spacesAvailable: r.spacesAvailable,
    registrations: r.registrations,
    hours: r.hours,
    mediaCount: r.mediaCount,
    newCount: r.newCount,
    childCount: r.childCount,
    regularCount: r.regularCount,
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
    console.error('[GroupDetailV1] tag hours', e)
  }
})

function reload() {
  store.fetch(route.params.key as string)
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
