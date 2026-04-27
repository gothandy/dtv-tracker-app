<template>
  <TaskLayout v-if="store.httpStatus === 404">
    <FormCard title="Session not found">
      <p class="sd-task-message">This session doesn't exist.</p>
      <FormSubmitRow>
        <AppButton usage="task" label="Back to sessions" @click="router.push('/sessions')" />
      </FormSubmitRow>
    </FormCard>
  </TaskLayout>

  <DefaultLayout v-else :padded="false">
    <h1 v-if="store.session" class="sr-only">{{ store.session.groupName }}, {{ formatDate(store.session.date) }}</h1>
    <LoadingSpinner v-if="store.loading && !store.session" />
    <div v-else-if="store.error" class="text-red-500 p-6">{{ store.error }}</div>
    <template v-else-if="store.session">
      <PageHeader>{{ store.session.groupName }}</PageHeader>

      <!-- TOP ROW -->
      <LayoutColumns ratio="2-1">

        <template #header>
          <SectionHeader :hidden="true">Session Details</SectionHeader>
        </template>

        <!-- Left: session info -->
        <template #left>
          <SessionDetailHeader :session="store.session" />
          
        </template>

        <!-- Right: booking panel -->
        <template #right>
          <MediaCard v-if="coverItem" :item="coverItem" constrain="width" />
          <SessionActionsIsBooked v-if="showIsBooked" :working="cancelWorking" :error="cancelError" @cancel="onCancel" />
          <SessionActionsSessionFull v-if="showSessionFull" :group-key="(route.params.groupKey as string)" />
          <SessionActionsLogIn v-if="showLogIn" />
          <SessionActionsBookNew v-if="showBookNew" :eventbrite-url="eventbriteUrl!" />
          <SessionActionsBookRegular v-if="showBookRegular" :working="bookWorking" :error="bookError" @book="onBook" />
          <SessionActionsAllocationFull v-if="showAllocationFull" :group-key="(route.params.groupKey as string)" />


          
        </template>
      </LayoutColumns>

      

      <!-- SECOND ROW -->
       <!-- TODO display a different set of text depending on the session category (dig, fund raising, behind the scenes etc.) -->
      <LayoutColumns ratio="1-1-1" v-if="store.session.isBookable && !profile.isOperational">
        <template #header>
          <SectionHeader >What to expect?</SectionHeader>
        </template>

        <template #left>
          <div class="p-6">
            <h3 class="text-dtv-dark text-xl leading-none mb-4">On the day</h3>
            <ul class="prose text-sm text-dtv-dark space-y-2 list-disc list-inside">
              <li>Follow anyone in a high-viz to the DTV containers.</li>
              <li>We start by sorting out tools and registration.</li>
              <li>Before we set off there will be a dig briefing to kick things off</li>
              <li>Then a bit of walk to where we'll be working.</li>
            </ul>
          </div>
        </template>

        <template #middle>
          <div class="p-6">
            <h3 class="text-dtv-dark text-xl leading-none mb-4">What to bring</h3>
            <ul class="prose text-sm text-dtv-dark space-y-2 list-disc list-inside">
              <li>Sturdy boots, steel toe caps are ideal.</li>
              <li>Gardening gloves great for picking up rocks.</li>
              <li>Clothes you don't mind getting muddy.</li>
              <li>Water, waterproofs and sun cream.</li>
              <li>We provide tools and hi-viz.</li>
            </ul>
          </div>
        </template>

        <template #right>
          <div class="p-6">
            <h3 class="text-dtv-dark text-xl leading-none mb-4">Your first time?</h3>
            <ul class="prose text-sm text-dtv-dark space-y-2 list-disc list-inside">
              <li>You'll get paired up with an experienced regular.</li>
              <li>All sorts of tasks available to suit your level of fitness.</li>
              <li>There is some paperwork needed at the beginning.</li>
              <li>Don't forget to have fun and work at your own pace.</li>
            </ul>
          </div>
        </template>

      </LayoutColumns>

      <LayoutColumns ratio="1-2" v-if="!store.session.isBookable || store.session.description !== null || (store.session.metadata?.length ?? 0) > 0 || profile.isOperational">

        <template #header>
          <SectionHeader v-if="!store.session.isBookable">What we got up to?</SectionHeader>
          <SectionHeader v-if="store.session.isBookable">What we got planned?</SectionHeader>
        </template>

        <template #left>
          <SessionDetailStats :session="store.session" />
          <SessionDetailGroupTeaser
            v-if="!store.session.isBookable && store.session.nextSession"
            :group-name="store.session.groupName!"
            :group-description="store.session.groupDescription"
            :next-session="store.session.nextSession"
          />
          <SessionDetailActions
            v-if="profile.isCheckIn || profile.isAdmin || (profile.isSelfService && !!store.session.userEntryId)"
            ref="actionsRef"
            :session="store.session"
            :group-key="(route.params.groupKey as string)"
            :date="store.session.date"
            :groups="editGroups"
            :edit-working="editWorking"
            :edit-error="editError"
            :allow-edit="profile.isCheckIn || profile.isAdmin"
            :allow-email="profile.isOperational"
            :is-self-service="profile.isSelfService"
            @session-save="onSessionSave"
            @session-delete="onSessionDelete"
          />

        </template>

        <template #right>
          <CardTitle v-if="store.session.displayName">{{ store.session.displayName }}</CardTitle>
          <div v-if="store.session.description" class="prose px-6 pb-6">
            <p class="text-dtv-dark text-large leading-relaxed pb-4" style="white-space: pre-line">{{ store.session.description }}</p>
          </div>
          <div class="px-6 pb-6">
            <SessionTermList
              :session="store.session"
              :allow-edit="profile.isCheckIn || profile.isAdmin"
              :working="tagWorking"
              :error="tagError"
              :tree="taxonomyTree"
              :taxonomy-loading="taxonomyLoading"
              @save-tags="onSaveTags"
            />
          </div>
        </template>
      </LayoutColumns>

      <SessionDetailGallery
        :media="mediaItems"
        :working="mediaLoading"
        :error="mediaError ?? undefined"
        :show-edit-btn="profile.isCheckIn || profile.isAdmin"
        :cover-media-id="store.session.coverMediaId"
        @save="onMediaSave"
        @delete="onMediaDelete"
      />



      <!-- BOTTOM ROW -->
      <LayoutColumns ratio="1" :reverse="true" v-if="profile.isOperational">
        <template #header><SectionHeader>Who's booked on?</SectionHeader></template>
        <template #left>
          <SessionEntryList
            ref="entryListRef"
            :entries="entries"
            :allow-edit="profile.isOperational"
            :is-admin="profile.isAdmin"
            :profiles="profiles"
            :working-id="workingId"
            :refresh-working="refreshWorking"
            @refresh-request="onRefreshRequest"
            @update="onEntryUpdate"
            @set-hours="onSetHours"
            @add-entry="onAddEntry"
            @edit-entry="onEditEntry"
          />
        </template>
      </LayoutColumns>

      <DebugData label="Session" :item="store.session!" />
      <DebugData v-if="profile.user" label="Profile" :item="profile.user" />
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { MediaItem } from '../types/media'
import type { EntryItem } from '../types/entry'
import type { PickerProfile } from '../components/ProfilePicker.vue'
import type { EntryResponse } from '../../../types/api-responses'
import type { GroupItem, SessionSaveData } from './modals/SessionEditModal.vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import AppButton from '../components/AppButton.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import DebugData from '../components/DebugData.vue'
import { useSessionDetailStore } from '../stores/sessionDetail'
import { useGroupListStore } from '../stores/groupList'
import { useViewer } from '../composables/useViewer'
import { usePageTitle } from '../composables/usePageTitle'
import { groupPath, sessionPath } from '../router/index'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import MediaCard from '../components/MediaCard.vue'
import SessionActionsIsBooked from '../components/sessions/actions/SessionActionsIsBooked.vue'
import SessionActionsSessionFull from '../components/sessions/actions/SessionActionsSessionFull.vue'
import SessionActionsLogIn from '../components/sessions/actions/SessionActionsLogIn.vue'
import SessionActionsBookNew from '../components/sessions/actions/SessionActionsBookNew.vue'
import SessionActionsBookRegular from '../components/sessions/actions/SessionActionsBookRegular.vue'
import SessionActionsAllocationFull from '../components/sessions/actions/SessionActionsAllocationFull.vue'
import SessionDetailHeader from '../components/sessions/SessionDetailHeader.vue'
import SessionDetailStats from '../components/sessions/SessionDetailStats.vue'
import SessionDetailGroupTeaser from '../components/sessions/SessionDetailGroupTeaser.vue'
import SessionDetailGallery from '../components/sessions/SessionDetailGallery.vue'
import SessionTermList from '../components/sessions/SessionTermList.vue'
import { useTaxonomy } from '../composables/useTaxonomy'
import SessionDetailActions from '../components/sessions/SessionDetailActions.vue'
import SessionEntryList from '../components/sessions/SessionEntryList.vue'
import SectionHeader from '../components/SectionHeader.vue'
import CardTitle from '../components/CardTitle.vue'


const route = useRoute()
const router = useRouter()
const store = useSessionDetailStore()
const groupsStore = useGroupListStore()
const profile = useViewer()
const mediaItems   = ref<MediaItem[]>([])
const mediaLoading = ref(false)
const mediaError   = ref<string | null>(null)
const actionsRef = ref<InstanceType<typeof SessionDetailActions> | null>(null)
const editWorking = ref(false)
const editError = ref<string | undefined>()
const editGroups = computed<GroupItem[]>(() =>
  groupsStore.groups.map(g => ({ id: g.id, name: g.displayName ?? g.key, key: g.key }))
    .sort((a, b) => a.name.localeCompare(b.name))
)
const coverItem = computed<MediaItem | null>(() => {
  const s = store.session
  if (!s?.coverMediaId) return null
  return mediaItems.value.find(i => i.listItemId === s.coverMediaId) ?? null
})

// ── CTA state booleans ───────────────────────────────────────────────────────
// All derivation lives here; action components receive only display-ready props.

const isGroupNew = computed(() => {
  const s = store.session
  if (!s) return true
  return !s.isRegular && !s.isRepeat
})

const newSpacesAvail = computed(() => {
  const s = store.session
  if (!s) return false
  const { new: newLimit } = s.limits
  return newLimit === undefined || (s.stats.new ?? 0) < newLimit
})

const repeatBookings = computed(() => {
  const s = store.session
  if (!s) return 0
  return s.stats.count - (s.stats.new ?? 0) - (s.stats.regular ?? 0)
})

const repeatSpacesAvail = computed(() => {
  const s = store.session
  if (!s) return false
  const { repeat } = s.limits
  return repeat === undefined || repeatBookings.value < repeat
})

const showIsBooked = computed(() => !!store.session?.isBookable && !!store.session.isRegistered)

const showSessionFull = computed(() => {
  const s = store.session
  return !!s?.isBookable && s.limits.total !== undefined && s.stats.count >= s.limits.total
})

const showLogIn = computed(() =>
  !!store.session?.isBookable && !profile.isAuthenticated && !showSessionFull.value
)

const showBookNew = computed(() =>
  !!store.session?.isBookable &&
  !showIsBooked.value &&
  !showSessionFull.value &&
  isGroupNew.value &&
  newSpacesAvail.value &&
  !!store.session.eventbriteEventId
)

const showBookRegular = computed(() =>
  !!store.session?.isBookable &&
  !showIsBooked.value &&
  !showSessionFull.value &&
  profile.isAuthenticated &&
  !isGroupNew.value &&
  repeatSpacesAvail.value
)

const showAllocationFull = computed(() => {
  const s = store.session
  if (!s?.isBookable || showIsBooked.value || showSessionFull.value) return false
  if (isGroupNew.value && !newSpacesAvail.value) return true
  if (!isGroupNew.value && profile.isAuthenticated && !repeatSpacesAvail.value) return true
  return false
})

const eventbriteUrl = computed<string | null>(() => {
  const id = store.session?.eventbriteEventId
  return id ? `https://www.eventbrite.co.uk/e/${id}` : null
})
// ─────────────────────────────────────────────────────────────────────────────
const profiles = ref<PickerProfile[]>([])
const workingId = ref<number | null>(null)
const refreshWorking = ref(false)
const bookWorking = ref(false)
const bookError = ref<string | undefined>()
const cancelWorking = ref(false)
const cancelError = ref<string | undefined>()
const entryListRef = ref<InstanceType<typeof SessionEntryList> | null>(null)
const tagWorking = ref(false)
const tagError = ref<string | undefined>()
const { tree: taxonomyTree, loading: taxonomyLoading } = useTaxonomy()

function mapEntry(e: EntryResponse): EntryItem {
  return {
    id: e.id,
    profileId: e.profileId,
    checkedIn: e.checkedIn,
    hours: e.hours,
    count: e.count,
    notes: e.notes,
    accompanyingAdultId: e.accompanyingAdultId,
    cancelled: e.cancelled,
    labels: e.labels,
    isNew: e.isNew,
    eventbriteAttendeeId: e.eventbriteAttendeeId,
    profile: {
      name: e.volunteerName ?? 'Unknown',
      slug: e.volunteerSlug,
      isMember: e.isMember,
      cardStatus: e.cardStatus,
      isGroup: e.isGroup,
      hasProfileWarning: e.profileWarning,
      noPhoto: e.noPhoto,
      isFirstAiderAvailable: e.isFirstAiderAvailable,
    },
    session: {
      groupKey: route.params.groupKey as string,
      groupName: store.session?.groupName ?? '',
      date: store.session?.date ?? '',
    },
  }
}

const entries = computed<EntryItem[]>(() => {
  const mapped = (store.session?.entries ?? []).map(mapEntry)
  return mapped.sort((a, b) => {
    const aCancelled = !!a.cancelled
    const bCancelled = !!b.cancelled
    if (aCancelled !== bCancelled) return aCancelled ? 1 : -1
    if (aCancelled && bCancelled) return (a.cancelled! < b.cancelled! ? -1 : 1)
    return 0
  })
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const titleText = computed(() => {
  if (!store.session) return ''
  return `${formatDate(store.session.date)} | ${store.session.groupName}`
})
usePageTitle(titleText)

async function onSaveTags(tags: Array<{ label: string; termGuid: string }>) {
  const groupKey = route.params.groupKey as string
  const date = store.session!.date
  tagWorking.value = true
  tagError.value = undefined
  try {
    const res = await fetch(`/api/sessions/${groupKey}/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: tags }),
    })
    if (!res.ok) throw new Error(`PATCH failed (${res.status})`)
    if (store.session) store.session.metadata = tags
  } catch (e) {
    tagError.value = 'Failed to save tags — please try again'
    console.error('[SessionDetailPage] onSaveTags failed', e)
  } finally {
    tagWorking.value = false
  }
}

async function fetchProfiles() {
  try {
    const res = await fetch('/api/profiles')
    if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`)
    const json = await res.json()
    profiles.value = (json.data ?? []).map((p: { id: number; name?: string; email?: string }) => ({
      id: p.id,
      name: p.name ?? '',
      email: p.email,
    }))
  } catch (e) {
    console.error('[SessionDetailPage] fetchProfiles failed', e)
  }
}

function load() {
  store.fetch(route.params.groupKey as string, route.params.date as string)
}

async function onRefreshRequest() {
  if (refreshWorking.value) return
  refreshWorking.value = true
  const groupKey = route.params.groupKey as string
  const date = store.session!.date
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(date)}/refresh`, {
      method: 'POST',
    })
    if (!res.ok) console.error('[SessionDetailPage] refresh failed', res.status)
  } catch (e) {
    console.error('[SessionDetailPage] refresh error', e)
  } finally {
    refreshWorking.value = false
  }
  store.fetch(groupKey, date)
}

async function onEntryUpdate(entry: EntryItem, checkedIn: boolean, hours: number) {
  workingId.value = entry.id
  try {
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedIn, hours }),
    })
    if (!res.ok) throw new Error(`Update failed (${res.status})`)
    const stored = store.session?.entries.find(e => e.id === entry.id)
    if (stored) { stored.checkedIn = checkedIn; stored.hours = hours }
  } catch (e) {
    console.error('[SessionDetailPage] onEntryUpdate failed', e)
  } finally {
    workingId.value = null
  }
}

async function onSetHours(hours: number) {
  const eligible = store.session?.entries.filter(e => e.checkedIn && !e.hours) ?? []
  try {
    await Promise.all(eligible.map(e =>
      fetch(`/api/entries/${e.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedIn: true, hours }),
      })
    ))
    await store.fetch(route.params.groupKey as string, store.session!.date)
    entryListRef.value?.onSetHoursSuccess()
  } catch (e) {
    console.error('[SessionDetailPage] onSetHours failed', e)
    entryListRef.value?.onSetHoursError('Failed to set hours — please try again')
  }
}

async function onAddEntry(payload: { profileId: number } | { newName: string; newEmail: string }) {
  const groupKey = route.params.groupKey as string
  const date = store.session!.date
  try {
    const res = await fetch(`/api/sessions/${groupKey}/${date}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Add failed (${res.status})`)
    await store.fetch(groupKey, date)
    entryListRef.value?.onAddSuccess()
  } catch (e) {
    console.error('[SessionDetailPage] onAddEntry failed', e)
    entryListRef.value?.onAddError('Failed to add entry — please try again')
  }
}

type EditData = { checkedIn: boolean; count: number; hours: number; notes: string; accompanyingAdultId: number | null; labels: string[]; cancelled: boolean; eventbriteAttendeeId: string | null }

async function onEditEntry(id: number, data: EditData | null) {
  try {
    if (data === null) {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      if (store.session) {
        store.session.entries = store.session.entries.filter(e => e.id !== id)
      }
    } else {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      const stored = store.session?.entries.find(e => e.id === id)
      if (stored) {
        stored.checkedIn = data.checkedIn
        stored.hours = data.hours
        stored.count = data.count
        stored.notes = data.notes
        stored.accompanyingAdultId = data.accompanyingAdultId ?? undefined
        stored.labels = data.labels
        stored.cancelled = data.cancelled ? (stored.cancelled || new Date().toISOString()) : undefined
        stored.eventbriteAttendeeId = data.eventbriteAttendeeId ?? undefined
      }
    }
    entryListRef.value?.onEditSuccess()
  } catch (e) {
    console.error('[SessionDetailPage] onEditEntry failed', e)
    entryListRef.value?.onEditError('Failed to save — please try again')
  }
}


async function onBook() {
  if (!store.session?.userProfileId) return
  const groupKey = route.params.groupKey as string
  const date = store.session.date
  bookWorking.value = true
  bookError.value = undefined
  try {
    const res = await fetch(`/api/sessions/${groupKey}/${date}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: store.session.userProfileId }),
    })
    if (!res.ok) throw new Error(`Book failed (${res.status})`)
    await store.fetch(groupKey, date)
  } catch (e) {
    console.error('[SessionDetailPage] onBook failed', e)
    bookError.value = 'Failed to book — please try again'
  } finally {
    bookWorking.value = false
  }
}

async function onCancel() {
  if (!store.session?.userEntryId) return
  const groupKey = route.params.groupKey as string
  const date = store.session.date
  cancelWorking.value = true
  cancelError.value = undefined
  try {
    const res = await fetch(`/api/entries/${store.session.userEntryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelled: true }),
    })
    if (!res.ok) throw new Error(`Cancel failed (${res.status})`)
    await store.fetch(groupKey, date)
  } catch (e) {
    console.error('[SessionDetailPage] onCancel failed', e)
    cancelError.value = 'Failed to cancel — please try again'
  } finally {
    cancelWorking.value = false
  }
}

async function fetchMedia(groupKey: string, date: string) {
  mediaLoading.value = true
  mediaError.value   = null
  try {
    const res  = await fetch(`/api/media?groupKey=${groupKey}&date=${date}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    mediaItems.value = (json.data ?? []).filter((i: MediaItem) => i.mimeType.startsWith('image/'))
  } catch (e) {
    mediaError.value = e instanceof Error ? e.message : 'Failed to load photos'
    console.error('[SessionDetailPage] fetchMedia failed', e)
  } finally {
    mediaLoading.value = false
  }
}

async function onMediaSave(item: MediaItem, data: { title: string; isPublic: boolean; isCover: boolean }) {
  const groupKey = route.params.groupKey as string
  const date     = store.session!.date
  try {
    const res = await fetch(`/api/media/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: data.title, isPublic: data.isPublic }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const wasCover = item.listItemId === store.session?.coverMediaId
    if (data.isCover !== wasCover) {
      const newCoverId = data.isCover ? item.listItemId : null
      const coverRes = await fetch(`/api/sessions/${groupKey}/${date}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverMediaId: newCoverId }),
      })
      if (!coverRes.ok) throw new Error(`HTTP ${coverRes.status}`)
      if (store.session) store.session.coverMediaId = newCoverId
    }

    await fetchMedia(groupKey, date)
  } catch (e) {
    console.error('[SessionDetailPage] onMediaSave failed', e)
  }
}

async function onMediaDelete(item: MediaItem) {
  const groupKey = route.params.groupKey as string
  const date     = store.session!.date
  try {
    const res = await fetch(`/api/media/${item.id}?groupKey=${groupKey}&date=${date}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await fetchMedia(groupKey, date)
  } catch (e) {
    console.error('[SessionDetailPage] onMediaDelete failed', e)
  }
}

async function onSessionSave(data: SessionSaveData) {
  const groupKey = route.params.groupKey as string
  const date = store.session!.date
  editWorking.value = true
  editError.value = undefined
  try {
    const body: Record<string, unknown> = {
      displayName: data.displayName,
      description: data.description,
    }
    if (profile.isAdmin) {
      body.date = data.date
      body.groupId = data.groupId
      body.limits = data.limits
      body.eventbriteEventId = data.eventbriteEventId
    }
    const res = await fetch(`/api/sessions/${groupKey}/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    const json = await res.json()
    const newGroupKey = json.data?.groupKey ?? groupKey
    const newDate = json.data?.date ?? date
    actionsRef.value?.closeEdit()
    if (newGroupKey !== groupKey || newDate !== date) {
      router.push(sessionPath(newGroupKey, newDate))
    } else {
      await store.fetch(newGroupKey, newDate)
    }
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Save failed'
    console.error('[SessionDetailPage] onSessionSave failed', e)
  } finally {
    editWorking.value = false
  }
}

async function onSessionDelete() {
  const groupKey = route.params.groupKey as string
  const date = store.session!.date
  editWorking.value = true
  editError.value = undefined
  try {
    const res = await fetch(`/api/sessions/${groupKey}/${date}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    router.push(groupPath(groupKey))
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Delete failed'
    console.error('[SessionDetailPage] onSessionDelete failed', e)
    editWorking.value = false
  }
}

onMounted(() => {
  load()
  fetchProfiles()
  fetchMedia(route.params.groupKey as string, route.params.date as string)
  if (profile.isAdmin) groupsStore.fetch()
})
watch(() => [route.params.groupKey, route.params.date], () => {
  load()
  fetchMedia(route.params.groupKey as string, route.params.date as string)
})
</script>

<style scoped>
.sd-task-message {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  text-align: center;
  margin: 0 0 0.5rem;
}
</style>
