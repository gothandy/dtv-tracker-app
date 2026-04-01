<template>
  <DefaultLayout>
    <LayoutColumns class="pt-8">
      <!-- CTA card: adapts to user's session history -->
      <template #left>
        <NextActionCard :sessions="store.sessions" @select="onCtaSelect" />
      </template>

      <!-- Calendar -->
      <template #middle>
        <div :class="['bg-dtv-green/25 min-h-[340px] h-full flex items-start justify-center p-2', store.loading ? 'animate-pulse' : '']">
          <CalendarWidget
            v-if="!store.error"
            v-model="selectedDate"
            :sessions="store.sessions"
            @select="onDateSelect"
            @confirm="onDateConfirm"
          />
          <div v-else class="text-red-500 text-sm">{{ store.error }}</div>
        </div>
      </template>

      <!-- Session picker -->
      <template #right>
        <SessionList
          ref="sessionListEl"
          :sessions="selectedSessions"
          :selected-date="selectedDate"
          :loading="store.loading"
        />
      </template>
    </LayoutColumns>

    <!-- Bar chart + Word cloud -->
    <LayoutColumns ratio="2-1">
      <template #left>
        <FyBarChartV1 :sessions="(store.sessions as any)" v-model="selectedFy" />
      </template>
      <template #right>
        <WordCloudV1 :tags="tagHours" />
      </template>
    </LayoutColumns>

    <!-- Cover photo gallery — all sessions with photos, newest first -->
    <MediaGallery
      v-if="coverItems.length"
      :items="coverItems"
      :max-height="280"
      :clickable="true"
      @select="onGallerySelect"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import CalendarWidget from '../components/CalendarWidget.vue'
import SessionList from '../components/SessionList.vue'
import MediaGallery from '../components/MediaGallery.vue'
import FyBarChartV1 from '../components/FyBarChartV1.vue'
import WordCloudV1 from '../components/WordCloudV1.vue'
import NextActionCard from './homepage/NextActionCard.vue'
import { useSessionsStore } from '../stores/sessions'
import { useAuth } from '../composables/useAuth'
import { sessionPath } from '../router'
import type { Session } from '../types/session'
import type { TagHoursItem } from '../../../types/api-responses'
import type { MediaItem } from '../types/media'

const route = useRoute()
const router = useRouter()
const store = useSessionsStore()
const { user } = useAuth()

const initialDate = typeof route.query.date === 'string' ? route.query.date : undefined
const selectedDate = ref<string | undefined>(initialDate)
const selectedSessions = ref<Session[]>([])
const sessionListEl = ref<{ $el: HTMLElement } | null>(null)
const selectedFy = ref('')
const tagHours = ref<TagHoursItem[]>([])

function onDateSelect(sessions: Session[]) {
  selectedSessions.value = sessions
}

function onDateConfirm(sessions: Session[]) {
  if (sessions.length === 1) {
    router.push(sessionPath(sessions[0].groupKey!, sessions[0].date))
  } else {
    sessionListEl.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onCtaSelect(date: string) {
  selectedDate.value = date
}

watch(selectedDate, (date) => {
  router.replace({ query: date ? { date } : {} })
})

const coverItems = computed<MediaItem[]>(() =>
  [...store.sessions]
    .filter(s => (s.mediaCount ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(s => ({
      id: String(s.id),
      thumbnailUrl: `/media/${s.groupKey}/${s.date}/cover.jpg`,
      largeUrl: `/media/${s.groupKey}/${s.date}/cover.jpg`,
      mimeType: 'image/jpeg',
      title: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      isPublic: true,
    }))
)

// Parallel array so onGallerySelect can look up the session by slide index
const coverSessions = computed<Session[]>(() =>
  [...store.sessions]
    .filter(s => (s.mediaCount ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
)

function onGallerySelect(index: number) {
  const s = coverSessions.value[index]
  if (s?.groupKey) router.push(sessionPath(s.groupKey, s.date))
}

watchEffect(async () => {
  const fy = selectedFy.value
  const params = new URLSearchParams()
  if (fy && fy !== 'all') params.set('fy', fy)
  try {
    const qs = params.toString()
    const res = await fetch(`/api/tags/hours-by-taxonomy${qs ? '?' + qs : ''}`)
    if (!res.ok) return
    const json = await res.json()
    tagHours.value = json.data as TagHoursItem[]
  } catch (e) {
    console.error('[HomePage] tag hours', e)
  }
})

store.fetch()
</script>
