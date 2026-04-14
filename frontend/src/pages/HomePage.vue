<template>
  <DefaultLayout>
    <h1 class="sr-only">Home</h1>

    <!-- Personal prompt — shown to all logged-in users when a message applies -->
    <PersonalContainer
      v-if="profile.isAuthenticated"
      :is-admin="profile.isAdmin"
      :is-check-in="profile.isCheckIn"
      :is-read-only="profile.isReadOnly"
      :is-self-service="profile.isSelfService"
      :is-new="isNewVolunteer"
      :is-repeat="isRepeatVolunteer"
      :is-regular="isRegularVolunteer"
      :has-booking="hasBooking"
      :has-attended="hasAttended"
      :next-session="nextSession"
      :previous-session="previousSession"
    />

    <LayoutColumns class="pt-2 mb-8">
      <template #header>
        <SectionHeader>{{ calendarHeading }}</SectionHeader>
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
      <SectionHeader>{{ recentHeading }}</SectionHeader>
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

    <!-- Bar chart + Word cloud (+ personal contribution for logged-in users) -->
    <LayoutColumns :ratio="profile.isAuthenticated ? '1-1-1' : '2-1'" class="mb-16">
      <template #header>
        <SectionHeader>What we can do together?</SectionHeader>
      </template>
      <template #left>
        <template v-if="profile.isAuthenticated">
          <PersonalContribution
            :sessions="sessionsRollingYear"
            :hours="hoursRollingYear"
            :earned-card="earnedCard"
            :became-member="becameMember"
          />
        </template>
        <template v-else>
          <CardTitle>This many hours</CardTitle>
          <FyBarChart :sessions="(store.sessions as any)" v-model="selectedFy" @click-selected="onSelectedBarClick" />
        </template>
      </template>
      <template #middle>
        <template v-if="profile.isAuthenticated">
          <CardTitle>This many hours</CardTitle>
          <FyBarChart :sessions="(store.sessions as any)" v-model="selectedFy" @click-selected="onSelectedBarClick" />
        </template>
      </template>
      <template #right>
        <CardTitle>All these trails</CardTitle>
        <TermCloud :tags="tagHours" @click="onTagClick" />
      </template>
    </LayoutColumns>

    <!-- Recent sign-ups — admin/check-in only -->
    <section v-if="profile.isOperational" class="mb-8">
      <SectionHeader>Recent Sign-ups</SectionHeader>
      <RecentEntryList />
    </section>

    <DebugData label="homepage personal context" :item="{
      role: viewer.user?.role,
      profileSlug: viewer.user?.profileSlug,
      isAuthenticated: profile.isAuthenticated,
      profileStats: viewer.user?.profileStats,
      oneYearAgo: oneYearAgo,
      sessionsTotal: store.sessions.length,
      sessionsAttended: store.sessions.filter(s => s.isAttended).length,
      sessionsRegistered: store.sessions.filter(s => s.isRegistered).length,
      sessionsRollingYear,
      hoursRollingYear,
      hasBooking,
      hasAttended,
      isNewVolunteer,
      isRepeatVolunteer,
      isRegularVolunteer,
      nextSession,
      previousSession,
    }" />

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
import PersonalContainer from '../components/PersonalContainer.vue'
import PersonalContribution from '../components/PersonalContribution.vue'
import DebugData from '../components/DebugData.vue'
import RecentEntryList from '../components/RecentEntryList.vue'
import { useSessionListStore } from '../stores/sessionList'
import { useViewer } from '../composables/useViewer'
import { sessionPath } from '../router'
import type { Session } from '../types/session'
import type { TagHoursItem } from '../../../types/api-responses'
import type { MediaItem } from '../types/media'
import type { SessionSummary } from '../components/PersonalPrompt.vue'

const route = useRoute()
const router = useRouter()
const store = useSessionListStore()
const profile = useViewer()
const viewer = profile

const initialDate = typeof route.query.date === 'string' ? route.query.date : undefined
const selectedDate = ref<string | undefined>(initialDate)
const selectedSessions = ref<Session[]>([])
const selectedFy = ref('')
const tagHours = ref<TagHoursItem[]>([])
const selectedGalleryIndex = ref<number | null>(null)

// ── Personal context ─────────────────────────────────────────────────────────

const oneYearAgo = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
})

const nextPersonalSession = computed<SessionSummary | null>(() =>
  store.sessions
    .filter(s => s.isBookable && s.isRegistered)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ groupKey: s.groupKey!, groupName: s.groupName, date: s.date }))[0] ?? null
)

const prevPersonalSession = computed<SessionSummary | null>(() =>
  store.sessions
    .filter(s => !s.isBookable && s.isAttended)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(s => ({ groupKey: s.groupKey!, groupName: s.groupName, date: s.date }))[0] ?? null
)

const nextGlobalSession = computed<SessionSummary | null>(() =>
  store.sessions
    .filter(s => s.isBookable)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ groupKey: s.groupKey!, groupName: s.groupName, date: s.date }))[0] ?? null
)

const prevGlobalSession = computed<SessionSummary | null>(() =>
  store.sessions
    .filter(s => !s.isBookable)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(s => ({ groupKey: s.groupKey!, groupName: s.groupName, date: s.date }))[0] ?? null
)

// For admin: use global sessions; for all others: personal
const nextSession     = computed(() => profile.isAdmin ? nextGlobalSession.value  : nextPersonalSession.value)
const previousSession = computed(() => profile.isAdmin ? prevGlobalSession.value  : prevPersonalSession.value)

const hasBooking  = computed(() => nextPersonalSession.value  !== null)
const hasAttended = computed(() => prevPersonalSession.value  !== null)

// Volunteer type — derived from session history (applies to self-service users)
const pastAttendedCount  = computed(() => store.sessions.filter(s => !s.isBookable && s.isAttended).length)
const isNewVolunteer     = computed(() => pastAttendedCount.value <= 1)
const isRegularVolunteer = computed(() => (viewer.user?.profileStats?.regularGroupIds?.length ?? 0) > 0)
const isRepeatVolunteer  = computed(() => !isNewVolunteer.value && !isRegularVolunteer.value)

// Contribution stats — rolling 12 months
// Sessions: exact count from store (isAttended && date within last year)
const sessionsRollingYear = computed(() =>
  store.sessions.filter(s => !s.isBookable && s.isAttended && s.date >= oneYearAgo.value).length
)
// Hours: profileStats is FY-bucketed; prorate the two FYs that overlap the rolling window
const hoursRollingYear = computed(() => {
  const hoursByFY = viewer.user?.profileStats?.hoursByFY ?? {}
  const now = new Date()
  const currentFYYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const fyStart = new Date(currentFYYear, 3, 1) // April 1 of current FY
  const daysInCurrentFY = Math.round((now.getTime() - fyStart.getTime()) / 86400000)
  const daysInLastFY = 365 - daysInCurrentFY
  const thisFYHours = hoursByFY[`FY${currentFYYear}`] ?? 0
  const lastFYHours = hoursByFY[`FY${currentFYYear - 1}`] ?? 0
  const total = (daysInCurrentFY / 365) * thisFYHours + (daysInLastFY / 365) * lastFYHours
  return Math.round(total * 10) / 10
})
const earnedCard   = computed(() => viewer.user?.profileStats?.cardStatus === 'Accepted')
const becameMember = computed(() => viewer.user?.profileStats?.isMember === true)

// ── Section headings ──────────────────────────────────────────────────────────

const calendarHeading = computed(() => hasBooking.value ? 'Your next session' : 'Upcoming sessions')
const recentHeading   = computed(() => hasAttended.value ? 'Your last session' : "What's been happening?")

// ── Existing page logic ───────────────────────────────────────────────────────

function onDateSelect(sessions: Session[]) {
  selectedSessions.value = sessions
}

function onDateConfirm(sessions: Session[]) {
  if (sessions.length === 1) {
    router.push(sessionPath(sessions[0].groupKey!, sessions[0].date))
  }
}

watch(selectedDate, (date) => {
  router.replace({ query: { ...route.query, ...(date ? { date } : { date: undefined }) } })
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
