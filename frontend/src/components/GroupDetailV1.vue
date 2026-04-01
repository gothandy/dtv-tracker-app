<template>
  <DefaultLayout>
    <div v-if="store.loading" class="gd-loading">Loading…</div>
    <div v-else-if="store.error" class="gd-error">{{ store.error }}</div>
    <template v-else-if="store.group">
      <!-- V1 cards with padding -->
      <div class="gd-padded">
        <GroupHeaderV1 :group="store.group" @updated="reload" />
        <GroupRegularsV1 :group="store.group" />
      </div>

      <!-- Cover photo gallery — full width, latest first, only sessions with media -->
      <MediaGallery v-if="coverItems.length" :items="coverItems" :max-height="280" />

      <!-- Bar chart + word cloud -->
      <div class="gd-padded">
        <div class="gd-charts">
          <FyBarChartV1 :sessions="store.group.sessions" v-model="selectedFy" />
          <WordCloudV1 :tags="tagHours" />
        </div>
      </div>

      <!-- Calendar + session list (v2, same as homepage) -->
      <LayoutColumns ratio="1-2">
        <template #left>
          <div class="bg-dtv-green/25 min-h-[340px] h-full flex items-start justify-center p-2">
            <CalendarWidget
              v-model="selectedDate"
              :sessions="groupSessions"
              @select="onDateSelect"
              @confirm="onDateConfirm"
            />
          </div>
        </template>
        <template #right>
          <SessionList
            ref="sessionListEl"
            :sessions="selectedSessions"
            :selected-date="selectedDate"
            :loading="false"
          />
        </template>
      </LayoutColumns>
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupDetailStore } from '../stores/groupDetail'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LayoutColumns from './LayoutColumns.vue'
import CalendarWidget from './CalendarWidget.vue'
import SessionList from './SessionList.vue'
import GroupHeaderV1 from './GroupHeaderV1.vue'
import GroupRegularsV1 from './GroupRegularsV1.vue'
import FyBarChartV1 from './FyBarChartV1.vue'
import WordCloudV1 from './WordCloudV1.vue'
import MediaGallery from './MediaGallery.vue'
import { sessionPath } from '../router/index'
import type { Session } from '../types/session'
import type { SessionResponse, TagHoursItem } from '../../../types/api-responses'
import type { MediaItem } from '../types/media'

const route = useRoute()
const router = useRouter()
const store = useGroupDetailStore()

const selectedFy = ref('')
const tagHours = ref<TagHoursItem[]>([])
const selectedDate = ref<string | undefined>(undefined)
const selectedSessions = ref<Session[]>([])
const sessionListEl = ref<{ $el: HTMLElement } | null>(null)

// Map API SessionResponse → frontend Session type
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
    metadata: r.metadata,
    isRegistered: r.isRegistered ?? false,
    isAttended: r.isAttended ?? false,
    isRegular: r.isRegular ?? false,
  }
}

const groupSessions = computed<Session[]>(() =>
  store.group ? store.group.sessions.map(mapSession) : []
)

// Cover photo MediaItems — newest first, only sessions with media
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
      title: formatDate(s.date),
      isPublic: true,
    }))
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

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
  if (key) store.fetch(key as string)
})
</script>

<style scoped>
.gd-loading { padding: 2rem; color: #777; }
.gd-error { padding: 2rem; color: #d6472b; }

.gd-padded { padding: 1.5rem 1.5rem 0; }


.gd-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 1.5rem;
  margin-bottom: 0;
}

@media (max-width: 600px) {
  .gd-charts { grid-template-columns: 1fr; }
}
</style>
