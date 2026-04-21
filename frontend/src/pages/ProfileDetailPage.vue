<template>
  <TaskLayout v-if="store.httpStatus === 403">
    <FormCard title="Access denied">
      <p class="pd-task-message">
        You don't have permission to view this profile.
        <a href="mailto:admin@deantrailvolunteers.org.uk" class="pd-task-link">Contact us</a>
        if you think this is a mistake.
      </p>
      <FormSubmitRow>
        <AppButton usage="task" label="Go to home page" @click="router.push('/')" />
      </FormSubmitRow>
    </FormCard>
  </TaskLayout>

  <TaskLayout v-else-if="store.httpStatus === 404">
    <FormCard title="Profile not found">
      <p class="pd-task-message">This profile doesn't exist.</p>
      <FormSubmitRow>
        <AppButton v-if="viewer.isTrusted" usage="task" label="Back to profiles" @click="router.push('/profiles')" />
        <AppButton v-else usage="task" label="Go to home page" @click="router.push('/')" />
      </FormSubmitRow>
    </FormCard>
  </TaskLayout>

  <DefaultLayout v-else>
    <LoadingSpinner v-if="store.loading" />
    <div v-else-if="store.error" class="pd-error">{{ store.error }}</div>
    <template v-else-if="store.profile">
      <h1 class="sr-only">{{ store.profile.name ?? 'Profile' }}</h1>
      <PageHeader>{{ store.profile.name ?? 'Profile' }}</PageHeader>

      <!-- Profile header: 2-1 layout — emails/warnings left, actions right -->
      <LayoutColumns ratio="2-1" align="start">
        <template #left>
          <div class="pd-header">
            <div class="pd-badges">
              <img v-if="isMember" src="/icons/badges/member.svg" class="pd-badge" alt="Member" title="Member" />
              <img v-if="store.profile.isGroup" src="/icons/badges/group.svg" class="pd-badge" alt="Group" title="Group" />
            </div>
            <div v-for="email in store.profile.emails" :key="email" class="pd-email">
              <a :href="`mailto:${email}`">{{ email }}</a>
            </div>
          </div>
          <ProfileDuplicateWarning
            v-if="viewer.isAdmin && store.profile.duplicates?.length"
            :duplicates="store.profile.duplicates"
          />
          <ProfileLinkedAccounts
            v-if="viewer.isOperational && store.profile.linkedProfiles?.length"
            :linked-profiles="store.profile.linkedProfiles"
          />
        </template>
        <template #right>
          <ProfileDetailActions
            v-if="viewer.isCheckIn || viewer.isAdmin"
            ref="actionsRef"
            :profile="store.profile"
            :show-user="viewer.isAdmin"
            :allow-transfer="viewer.isAdmin"
            :profiles="transferProfiles"
            @edit-profile="onEditProfile"
            @delete-profile="onDeleteProfile"
            @transfer-open="onTransferOpen"
            @transfer-profile="onTransferProfile"
          />
        </template>
      </LayoutColumns>

      <RegularList
        :items="regularItems"
        :working-slug="workingRegularSlug ?? undefined"
        :error="regularError"
        @edit-regular="onRegularEdit"
      />

      <RegularEditModal
        v-if="editingRegular && viewer.isOperational"
        :regular="editingRegular"
        :adults="[]"
        view-link-label="View Group"
        :working="regularWorking"
        :error="regularModalError"
        @close="editingRegular = null"
        @view-link="router.push(groupPath(editingRegular.groupKey))"
        @save="onRegularSave"
        @delete="onRegularDelete"
      />

      <ProfileRecordList
        :records="store.profile.records ?? []"
        :profile-id="store.profile.id"
        :profile-slug="store.profile.slug"
        :show-consent-link="viewer.isOperational || viewer.isSelfService"
        :allow-edit="viewer.isAdmin"
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
            :is-admin="viewer.isAdmin"
            :working-id="workingId"
            ref="entryListRef"
            @update="onEntryUpdate"
            @edit-entry="onEditEntry"
          />
        </template>
      </LayoutColumns>

      <LayoutColumns v-if="viewer.isAdmin && !store.profile.isGroup && childEntries.length" ratio="1">
        <template #header><SectionHeader>Accompanying Adult</SectionHeader></template>
        <template #left>
          <div class="pd-child-list">
            <button
              v-for="e in childEntries"
              :key="e.id"
              class="pd-child-btn"
              @click="openChildEditModal(e)"
            >
              <EntryListItem :entry="e" />
            </button>
          </div>
        </template>
      </LayoutColumns>

      <EntryEditModal
        v-if="childEditingEntry"
        :entry="childEditingEntry"
        :title="childEditingEntry.profile.name"
        :is-admin="viewer.isAdmin"
        :profile-click="childEditingEntry.profile.slug ? () => router.push(profilePath(childEditingEntry!.profile.slug!)) : undefined"
        :session-click="() => router.push(sessionPath(childEditingEntry!.session.groupKey, childEditingEntry!.session.date))"
        :session-adults="childSessionAdults"
        :working="childEditWorking"
        :error="childEditError"
        @close="closeChildEditModal"
        @save="onChildSave"
        @delete="onChildDelete"
      />

      <DebugData :item="store.profile" label="pageProfile" />
      <DebugData :item="viewer.context" label="userProfile" />
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import AppButton from '../components/AppButton.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import DebugData from '../components/DebugData.vue'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ProfileEntryList from '../components/profiles/ProfileEntryList.vue'
import ProfileDetailActions from '../components/profiles/ProfileDetailActions.vue'
import ProfileDuplicateWarning from '../components/profiles/ProfileDuplicateWarning.vue'
import ProfileLinkedAccounts from '../components/profiles/ProfileLinkedAccounts.vue'
import ProfileRecordList from '../components/profiles/ProfileRecordList.vue'
import RegularList from '../components/RegularList.vue'
import EntryListItem from '../components/entries/EntryListItem.vue'
import EntryEditModal from './modals/EntryEditModal.vue'
import RegularEditModal from './modals/RegularEditModal.vue'
import type { RegularListItem } from '../components/RegularList.vue'
import type { RegularEditItem } from './modals/RegularEditModal.vue'
import { useViewer } from '../composables/useViewer'
import { usePageTitle } from '../composables/usePageTitle'
import { useProfileDetailStore } from '../stores/profileDetail'
import { groupPath, profilePath, profilesPath, sessionPath } from '../router/index'
import type { ProfileEntryResponse, EntryListItemResponse } from '../../../types/api-responses'
import type { EditProfilePayload } from './modals/ProfileEditModal.vue'
import type { TransferProfilePayload } from './modals/ProfileTransferModal.vue'
import type { AddRecordPayload } from './modals/RecordAddModal.vue'
import type { SaveRecordPayload } from './modals/RecordEditModal.vue'
import type { EntryItem } from '../types/entry'
import { fetchSessionAdults } from '../utils/fetchSessionAdults'
import type { PickerProfile } from '../components/ProfilePicker.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import SectionHeader from '../components/SectionHeader.vue'

const route = useRoute()
const router = useRouter()
const viewer = useViewer()
const store = useProfileDetailStore()
const workingId = ref<number | null>(null)
const actionsRef = ref<InstanceType<typeof ProfileDetailActions> | null>(null)
const recordListRef = ref<InstanceType<typeof ProfileRecordList> | null>(null)
const workingRegularSlug = ref<string | null>(null)
const regularError = ref('')
const editingRegular = ref<(RegularEditItem & { groupKey: string }) | null>(null)
const regularWorking = ref(false)
const regularModalError = ref('')

const regularItems = computed<RegularListItem[]>(() =>
  (store.profile?.groupHours ?? []).map(g => ({
    slug: g.groupKey,
    name: g.groupName,
    hours: g.hoursRolling,
    isRegular: g.isRegular,
    regularId: g.regularId,
  }))
)
const recordTypes = ref<string[]>([])
const recordStatuses = ref<string[]>([])

usePageTitle(computed(() => store.profile?.name ?? 'Profile'))
const entryListRef = ref<InstanceType<typeof ProfileEntryList> | null>(null)

// Child entries (this profile as accompanying adult) — admin only
const childEntries = ref<EntryListItemResponse[]>([])
const childEditingEntry = ref<EntryItem | null>(null)
const childSessionAdults = ref<{ id: number; name: string }[]>([])
const childEditWorking = ref(false)
const childEditError = ref<string | undefined>()

// Lazily loaded profiles for transfer picker
const transferProfiles = ref<PickerProfile[]>([])

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

watch(
  [() => store.profile, () => viewer.isAdmin],
  async ([profile, isAdmin]) => {
    if (!isAdmin || !profile || profile.isGroup) { childEntries.value = []; return }
    try {
      const res = await fetch(`/api/entries?accompanyingAdultId=${profile.id}`)
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
      const json = await res.json()
      childEntries.value = json.data ?? []
    } catch (e) {
      console.error('[ProfileDetailPage] Failed to load child entries', e)
    }
  }
)

const isMember = computed(() =>
  store.profile?.records?.some(r => r.type === 'Charity Membership' && r.status === 'Accepted') ?? false
)

async function onDeleteProfile() {
  if (!store.profile) return
  try {
    const res = await fetch(`/api/profiles/${store.profile.slug}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    alert(`${store.profile.name} deleted`)
    actionsRef.value?.onDeleteSuccess()
    router.push(profilesPath())
  } catch (e) {
    console.error('[ProfileDetailPage] onDeleteProfile failed', e)
    actionsRef.value?.onDeleteError()
  }
}

async function onTransferOpen() {
  if (transferProfiles.value.length) return
  try {
    const res = await fetch('/api/profiles')
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
    const json = await res.json()
    transferProfiles.value = (json.data ?? []).map((p: { id: number; name: string; email?: string }) => ({
      id: p.id,
      name: p.name ?? '',
      email: p.email,
    }))
  } catch (e) {
    console.error('[ProfileDetailPage] Failed to load profiles for transfer', e)
  }
}

async function onEditProfile(data: EditProfilePayload) {
  if (!store.profile) return
  try {
    const res = await fetch(`/api/profiles/${store.profile.slug}`, {
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

async function onTransferProfile(data: TransferProfilePayload) {
  if (!store.profile) return
  try {
    const res = await fetch(`/api/profiles/${store.profile.slug}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`Transfer failed (${res.status})`)
    const json = await res.json()

    const d = json.data
    const summary: string[] = [
      `${d.entriesTransferred} ${d.entriesTransferred === 1 ? 'entry' : 'entries'} transferred`,
      `${d.recordsTransferred} ${d.recordsTransferred === 1 ? 'record' : 'records'} transferred`,
      `${d.regularsTransferred} ${d.regularsTransferred === 1 ? 'regular' : 'regulars'} transferred`,
    ]
    if (d.emailAdded) summary.push(`Email ${d.emailAdded} added to target`)
    if (d.emailAddError) summary.push(`Warning: ${d.emailAddError}`)
    if (d.deleted) summary.push('Source profile deleted')

    // Admin-only action — plain alert is appropriate here
    alert(`Transfer complete\n\n${summary.join('\n')}`)
    actionsRef.value?.onTransferSuccess()
    router.push(profilePath(json.data.targetSlug))
  } catch (e) {
    console.error('[ProfileDetailPage] onTransferProfile failed', e)
    actionsRef.value?.onTransferError('Failed to transfer — please try again')
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

function onRegularEdit(groupKey: string) {
  const group = store.profile?.groupHours.find(g => g.groupKey === groupKey)
  if (!group) return
  regularModalError.value = ''
  editingRegular.value = {
    name: group.groupName,
    slug: groupKey,
    groupKey,
    regularId: group.regularId,
  }
}

async function onRegularSave(data: { accompanyingAdultId: number | null }) {
  if (!editingRegular.value || !store.profile) return
  const { slug: groupKey, regularId } = editingRegular.value
  workingRegularSlug.value = groupKey
  regularWorking.value = true
  regularModalError.value = ''
  try {
    if (regularId !== undefined) {
      const res = await fetch(`/api/regulars/${regularId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(`Update failed (${res.status})`)
    } else {
      const group = store.profile.groupHours.find(g => g.groupKey === groupKey)
      if (!group) throw new Error('Group not found')
      const res = await fetch(`/api/profiles/${route.params.slug}/regulars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.groupId }),
      })
      if (!res.ok) throw new Error(`Add failed (${res.status})`)
      const json = await res.json()
      group.isRegular = true
      group.regularId = json.data.id
    }
    editingRegular.value = null
  } catch (e) {
    console.error('[ProfileDetailPage] onRegularSave failed', e)
    regularModalError.value = 'Failed to update — please try again'
  } finally {
    regularWorking.value = false
    workingRegularSlug.value = null
  }
}

async function onRegularDelete() {
  if (!editingRegular.value?.regularId || !store.profile) return
  const { slug: groupKey, regularId } = editingRegular.value
  workingRegularSlug.value = groupKey
  regularWorking.value = true
  regularModalError.value = ''
  try {
    const res = await fetch(`/api/regulars/${regularId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    const group = store.profile.groupHours.find(g => g.groupKey === groupKey)
    if (group) { group.isRegular = false; group.regularId = undefined }
    editingRegular.value = null
  } catch (e) {
    console.error('[ProfileDetailPage] onRegularDelete failed', e)
    regularModalError.value = 'Failed to delete — please try again'
  } finally {
    regularWorking.value = false
    workingRegularSlug.value = null
  }
}

function mapProfileEntry(e: ProfileEntryResponse): EntryItem {
  return {
    id: e.id,
    checkedIn: e.checkedIn,
    hours: e.hours,
    count: e.count,
    notes: e.notes,
    accompanyingAdultId: e.accompanyingAdultId,
    cancelled: e.cancelled,
    stats: e.stats,
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

type EditData = { checkedIn: boolean; count: number; hours: number; notes: string; accompanyingAdultId: number | null; statsManual: import('../../../types/entry-stats').EntryStatsManual; cancelled: boolean }

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
      if (store.profile) {
        const idx = store.profile.entries.findIndex(e => e.id === id)
        if (idx !== -1) {
          store.profile.entries.splice(idx, 1, {
            ...store.profile.entries[idx],
            checkedIn: data.checkedIn,
            hours: data.hours,
            count: data.count,
            notes: data.notes,
            accompanyingAdultId: data.accompanyingAdultId ?? undefined,
            stats: { ...store.profile.entries[idx].stats, manual: data.statsManual },
            cancelled: data.cancelled ? (store.profile.entries[idx].cancelled || new Date().toISOString()) : undefined,
          })
        }
      }
    }
    entryListRef.value?.onEditSuccess()
  } catch (e) {
    console.error('[ProfileDetailPage] onEditEntry failed', e)
    entryListRef.value?.onEditError('Failed to save — please try again')
  }
}


function mapChildEntryToItem(e: EntryListItemResponse): EntryItem {
  return {
    id: e.id,
    profileId: e.profileId,
    checkedIn: e.checkedIn,
    hours: e.hours,
    count: e.count,
    notes: e.notes,
    accompanyingAdultId: e.accompanyingAdultId,
    cancelled: e.cancelled,
    profile: {
      name: e.volunteerName ?? 'Unknown',
      slug: e.volunteerSlug,
      isMember: false,
      isGroup: e.isGroup,
    },
    session: {
      groupKey: e.groupKey,
      groupName: e.groupName,
      date: e.date,
    },
  }
}

async function openChildEditModal(e: EntryListItemResponse) {
  childEditingEntry.value = mapChildEntryToItem(e)
  childSessionAdults.value = await fetchSessionAdults(e.groupKey, e.date)
}

function closeChildEditModal() {
  childEditingEntry.value = null
  childSessionAdults.value = []
  childEditWorking.value = false
  childEditError.value = undefined
}

async function onChildSave(data: { checkedIn: boolean; count: number; hours: number; notes: string; accompanyingAdultId: number | null }) {
  if (!childEditingEntry.value) return
  childEditWorking.value = true
  childEditError.value = undefined
  try {
    const res = await fetch(`/api/entries/${childEditingEntry.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    const stored = childEntries.value.find(e => e.id === childEditingEntry.value!.id)
    if (stored) {
      stored.checkedIn = data.checkedIn
      stored.hours = data.hours
      stored.count = data.count
      stored.notes = data.notes
      stored.accompanyingAdultId = data.accompanyingAdultId ?? undefined
      stored.hasAccompanyingAdult = data.accompanyingAdultId !== null
    }
    closeChildEditModal()
  } catch (e) {
    console.error('[ProfileDetailPage] onChildSave failed', e)
    childEditError.value = 'Failed to save — please try again'
    childEditWorking.value = false
  }
}

async function onChildDelete() {
  if (!childEditingEntry.value) return
  childEditWorking.value = true
  childEditError.value = undefined
  const id = childEditingEntry.value.id
  const isCancelled = !!childEditingEntry.value.cancelled
  try {
    if (isCancelled) {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      childEntries.value = childEntries.value.filter(e => e.id !== id)
    } else {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelled: true }),
      })
      if (!res.ok) throw new Error(`Cancel failed (${res.status})`)
      const stored = childEntries.value.find(e => e.id === id)
      if (stored) stored.cancelled = new Date().toISOString()
    }
    closeChildEditModal()
  } catch (e) {
    console.error('[ProfileDetailPage] onChildDelete failed', e)
    childEditError.value = isCancelled ? 'Failed to delete — please try again' : 'Failed to cancel — please try again'
    childEditWorking.value = false
  }
}
</script>

<style scoped>
.pd-error { padding: 1.5rem; color: var(--color-dtv-dirt); }

.pd-header {
  padding: 1.25rem 1.5rem;
  background: var(--color-white);
}

.pd-badges {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  margin-bottom: 0.35rem;
}

.pd-badge { width: 20px; height: 20px; }

.pd-email {
  font-size: 0.9rem;
  margin-top: 0.35rem;
  color: var(--color-text-secondary);
}
.pd-email a { color: inherit; }
.pd-email a:hover { color: var(--color-dtv-green); }

.pd-task-message {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  text-align: center;
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.pd-task-link {
  color: var(--color-dtv-green-dark);
  opacity: 1;
}

.pd-child-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--color-dtv-sand-light);
}

.pd-child-btn {
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}
</style>
