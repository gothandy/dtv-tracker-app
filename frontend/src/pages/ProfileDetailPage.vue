<template>
  <DefaultLayout>
    <div v-if="store.loading" class="pd-loading">Loading…</div>
    <div v-else-if="store.error" class="pd-error">{{ store.error }}</div>
    <template v-else-if="store.profile">
      <h1 class="sr-only">{{ store.profile.name ?? 'Profile' }}</h1>
      <PageHeader>{{ store.profile.name ?? 'Profile' }}</PageHeader>

      <!-- Profile header -->
      <div class="pd-header">
        <div class="pd-title-row">
          <div class="pd-badges">
            <img v-if="isMember" src="/icons/member.svg" class="pd-badge" alt="Member" title="Member" />
            <img v-if="store.profile.isGroup" src="/icons/group.svg" class="pd-badge" alt="Group" title="Group" />
          </div>
          <ProfileDetailActions
            v-if="viewer.isCheckIn || viewer.isAdmin"
            ref="actionsRef"
            :profile="store.profile"
            :show-user="viewer.isAdmin"
            @edit-profile="onEditProfile"
          />
        </div>
        <div v-for="email in store.profile.emails" :key="email" class="pd-email">
          <a :href="`mailto:${email}`">{{ email }}</a>
        </div>
      </div>

      <ProfileRecordList
        :records="store.profile.records ?? []"
        :profile-id="store.profile.id"
        :profile-slug="store.profile.slug"
        :profile="viewer.context"
        :types="recordTypes"
        :statuses="recordStatuses"
        ref="recordListRef"
        @add-record="onAddRecord"
        @save-record="onSaveRecord"
        @delete-record="onDeleteRecord"
      />

      <LayoutColumns ratio="1">
        <template #header><SectionHeader>Your volunteering</SectionHeader></template>
        <template #left>
          <ProfileEntryList
            :entries="entries"
            :allow-edit="viewer.isOperational"
            :working-id="workingId"
            ref="entryListRef"
            @update="onEntryUpdate"
            @edit-entry="onEditEntry"
          />
        </template>
      </LayoutColumns>

      <DebugData :item="store.profile" label="pageProfile" />
      <DebugData :item="viewer.context" label="userProfile" />
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import DebugData from '../components/DebugData.vue'
import PageHeader from '../components/PageHeader.vue'
import ProfileEntryList from '../components/profiles/ProfileEntryList.vue'
import ProfileDetailActions from '../components/profiles/ProfileDetailActions.vue'
import ProfileRecordList from '../components/profiles/ProfileRecordList.vue'
import { useViewer } from '../composables/useViewer'
import { usePageTitle } from '../composables/usePageTitle'
import { useProfileDetailStore } from '../stores/profileDetail'
import type { ProfileEntryResponse } from '../../../types/api-responses'
import type { EditProfilePayload } from './modals/ProfileEditModal.vue'
import type { AddRecordPayload } from './modals/RecordAddModal.vue'
import type { SaveRecordPayload } from './modals/RecordEditModal.vue'
import type { EntryItem } from '../types/entry'
import LayoutColumns from '../components/LayoutColumns.vue'
import SectionHeader from '../components/SectionHeader.vue'

const route = useRoute()
const viewer = useViewer()
const store = useProfileDetailStore()
const workingId = ref<number | null>(null)
const actionsRef = ref<InstanceType<typeof ProfileDetailActions> | null>(null)
const recordListRef = ref<InstanceType<typeof ProfileRecordList> | null>(null)
const recordTypes = ref<string[]>([])
const recordStatuses = ref<string[]>([])

usePageTitle(computed(() => store.profile?.name ?? 'Profile'))
const entryListRef = ref<InstanceType<typeof ProfileEntryList> | null>(null)

onMounted(async () => {
  store.fetch(route.params.slug as string)
  try {
    const res = await fetch('/api/profiles/records/options')
    if (res.ok) {
      const json = await res.json()
      recordTypes.value = json.data?.types ?? []
      recordStatuses.value = json.data?.statuses ?? []
    }
  } catch (e) {
    console.error('[ProfileDetailPage] Failed to load record options', e)
  }
})
watch(() => route.params.slug, slug => { if (slug) store.fetch(slug as string) })

const isMember = computed(() =>
  store.profile?.records?.some(r => r.type === 'Charity Membership' && r.status === 'Accepted') ?? false
)

async function onEditProfile(data: EditProfilePayload) {
  if (!store.profile) return
  try {
    const res = await fetch(`/api/profiles/${store.profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    store.profile.name = data.name
    store.profile.emails = data.emails
    store.profile.matchName = data.matchName
    store.profile.user = data.user
    store.profile.isGroup = data.isGroup
    actionsRef.value?.onEditSuccess()
  } catch (e) {
    console.error('[ProfileDetailPage] onEditProfile failed', e)
    actionsRef.value?.onEditError('Failed to save — please try again')
  }
}

async function onAddRecord(payload: AddRecordPayload) {
  if (!store.profile) return
  try {
    const res = await fetch(`/api/profiles/${store.profile.id}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Add failed (${res.status})`)
    const json = await res.json()
    store.profile.records = [...(store.profile.records ?? []), { id: json.data.id, ...payload }]
    recordListRef.value?.onAddSuccess()
  } catch (e) {
    console.error('[ProfileDetailPage] onAddRecord failed', e)
    recordListRef.value?.onAddError('Failed to add — please try again')
  }
}

async function onSaveRecord(id: number, payload: SaveRecordPayload) {
  if (!store.profile) return
  try {
    const res = await fetch(`/api/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    const stored = store.profile.records?.find(r => r.id === id)
    if (stored) { stored.status = payload.status; stored.date = payload.date }
    recordListRef.value?.onSaveSuccess()
  } catch (e) {
    console.error('[ProfileDetailPage] onSaveRecord failed', e)
    recordListRef.value?.onSaveError('Failed to save — please try again')
  }
}

async function onDeleteRecord(id: number) {
  if (!store.profile) return
  try {
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    store.profile.records = store.profile.records?.filter(r => r.id !== id)
    recordListRef.value?.onDeleteSuccess()
  } catch (e) {
    console.error('[ProfileDetailPage] onDeleteRecord failed', e)
    recordListRef.value?.onSaveError('Failed to delete — please try again')
  }
}

function mapProfileEntry(e: ProfileEntryResponse): EntryItem {
  return {
    id: e.id,
    checkedIn: e.checkedIn,
    hours: e.hours,
    count: e.count,
    notes: e.notes,
    profile: {
      name: store.profile?.name ?? 'Unknown',
      slug: store.profile?.slug,
      isMember: false,
      cardStatus: undefined,
      isGroup: store.profile?.isGroup ?? false,
    },
    session: {
      groupKey: e.groupKey ?? '',
      groupName: e.groupName ?? '',
      date: e.date,
    },
  }
}

const entries = computed<EntryItem[]>(() => (store.profile?.entries ?? []).map(mapProfileEntry))

type EditData = { checkedIn: boolean; count: number; hours: number; notes: string }

async function onEntryUpdate(entry: EntryItem, checkedIn: boolean, hours: number) {
  workingId.value = entry.id
  try {
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedIn, hours }),
    })
    if (!res.ok) throw new Error(`Update failed (${res.status})`)
    const stored = store.profile?.entries.find(e => e.id === entry.id)
    if (stored) { stored.checkedIn = checkedIn; stored.hours = hours }
  } catch (e) {
    console.error('[ProfileDetailPage] onEntryUpdate failed', e)
  } finally {
    workingId.value = null
  }
}

async function onEditEntry(id: number, data: EditData | null) {
  try {
    if (data === null) {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      if (store.profile) {
        store.profile.entries = store.profile.entries.filter(e => e.id !== id)
      }
    } else {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      const stored = store.profile?.entries.find(e => e.id === id)
      if (stored) {
        stored.checkedIn = data.checkedIn
        stored.hours = data.hours
        stored.count = data.count
        stored.notes = data.notes
      }
    }
    entryListRef.value?.onEditSuccess()
  } catch (e) {
    console.error('[ProfileDetailPage] onEditEntry failed', e)
    entryListRef.value?.onEditError('Failed to save — please try again')
  }
}
</script>

<style scoped>
.pd-loading,
.pd-error { padding: 1.5rem; color: var(--color-text-label); }
.pd-error { color: var(--color-dtv-dirt); }

.pd-header {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}

.pd-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pd-badges {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.pd-badge { width: 20px; height: 20px; }

.pd-email {
  font-size: 0.9rem;
  margin-top: 0.35rem;
  color: var(--color-text-secondary);
}
.pd-email a { color: inherit; }
.pd-email a:hover { color: var(--color-dtv-green); }
</style>
