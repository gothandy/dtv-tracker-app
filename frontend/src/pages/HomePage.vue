<template>
  <DefaultLayout>
    <h1 class="sr-only">Home</h1>
    <LayoutColumns class="pt-2 mb-8">
      <template #header>
        <SectionHeader>What's going on?</SectionHeader>
      </template>
      <template #left>
        <div class="cta cta-right">
          <div class="cta-title cta-green w-fit text-4xl p-6"><h2>Pick a date</h2></div>
          <div class="cta-body cta-dark w-1/2 text-2xl p-4 -mt-2">Choose a session</div>
          <div class="cta-body cta-white w-2/3 text-base m-4 p-4">Use the calendar to book your spot</div>
        </div>
      </template>

      

      <!-- Calendar -->
      <template #middle>
          <CalendarWidget
            v-if="!store.error"
            v-model="selectedDate"
            :sessions="store.sessions"
            :class="store.loading ? 'animate-pulse' : ''"
            @select="onDateSelect"
            @confirm="onDateConfirm"
          />
          <div v-else class="text-red-500 text-sm">{{ store.error }}</div>
      </template>



      <!-- Session picker -->
      <template #right>
        <SessionConcertina
          :sessions="selectedSessions"
          :profile="profile.context"
          :loading="store.loading"
        />
      </template>
    </LayoutColumns>

    <section>
      <SectionHeader>What's been happening?</SectionHeader>
      <!-- Cover photo gallery — all sessions with photos, newest first -->
      <MediaCarousel
        v-if="coverItems.length"
        :max-height="280"
        title="Photos from recent events"
      >
        <MediaCard
          v-for="(item, i) in coverItems"
          :key="item.id"
          :item="item"
          :clickable="true"
          :selected="i === selectedGalleryIndex"
          @select="onGallerySelect(i)"
        />
      </MediaCarousel>
    </section>

    <!-- Bar chart + Word cloud -->
    <LayoutColumns ratio="2-1" class="mb-16">
      <template #header>
        <SectionHeader>What we can do together?</SectionHeader>
      </template>
      <template #left>
        <CardTitle>This many hours</CardTitle>
        <FyBarChart :sessions="(store.sessions as any)" v-model="selectedFy" @click-selected="onSelectedBarClick" />
      </template>
      <template #right>
        <CardTitle>All these trails</CardTitle>
        <TermCloud :tags="tagHours" @click="onTagClick" />
      </template>
    </LayoutColumns>

  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue'
import { usePageTitle } from '../composables/usePageTitle'
import SectionHeader from '../components/SectionHeader.vue'

usePageTitle('Home')
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import CalendarWidget from '../components/CalendarWidget.vue'
import SessionConcertina from '../components/sessions/SessionConcertina.vue'
import MediaCarousel from '../components/MediaCarousel.vue'
import MediaCard from '../components/MediaCard.vue'
import FyBarChart from '../components/FyBarChart.vue'
import TermCloud from '../components/TermCloud.vue'
import CardTitle from '../components/CardTitle.vue'
import { useSessionsStore } from '../stores/sessions'
import { useProfile } from '../composables/useProfile'
import { sessionPath } from '../router'
import type { Session } from '../types/session'
import type { TagHoursItem } from '../../../types/api-responses'
import type { MediaItem } from '../types/media'

const route = useRoute()
const router = useRouter()
const store = useSessionsStore()
const profile = useProfile()

const initialDate = typeof route.query.date === 'string' ? route.query.date : undefined
const selectedDate = ref<string | undefined>(initialDate)
const selectedSessions = ref<Session[]>([])
const selectedFy = ref('')
const tagHours = ref<TagHoursItem[]>([])
const selectedGalleryIndex = ref<number | null>(null)

function onDateSelect(sessions: Session[]) {
  selectedSessions.value = sessions
}

function onDateConfirm(sessions: Session[]) {
  if (sessions.length === 1) {
    router.push(sessionPath(sessions[0].groupKey!, sessions[0].date))
  }
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
      listItemId: 0,
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
  selectedGalleryIndex.value = index
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

function onSelectedBarClick() {
  router.push({ path: '/sessions', query: { fy: 'all' } })
}

function onTagClick(_termGuid: string, label: string) {
  const query: Record<string, string> = { tag: label }
  if (selectedFy.value && selectedFy.value !== 'all') query.fy = selectedFy.value
  router.push({ path: '/sessions', query })
}

store.fetch()
</script>
