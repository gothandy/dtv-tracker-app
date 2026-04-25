<template>
  <DefaultLayout>
    <h1 class="sr-only">Entries</h1>
    <PageHeader>Entries</PageHeader>
    <EntryListFilter @filtered="onFiltered" />
    <EntryListActions :entries="store.entries" :selected="selected" />
    <EntryListResults
      :entries="store.entries"
      :loading="store.loading"
      :error="store.error"
      :selected="selected"
      allow-select
      allow-edit
      @update:selected="selected = $event"
      @edit-entry="onEditEntry"
    />

    <EntryEditModal
      v-if="editingEntry"
      :entry="editingEntry"
      :is-admin="viewer.isAdmin"
      :profile-click="editingEntry.profile.slug ? () => router.push(profilePath(editingEntry!.profile.slug!)) : undefined"
      :session-click="() => router.push(sessionPath(editingEntry!.session.groupKey, editingEntry!.session.date))"
      :session-adults="sessionAdults"
      :working="editWorking"
      :error="editError"
      @close="closeEditModal"
      @save="onSave"
      @delete="onDelete"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEntryListStore } from '../stores/entryList'
import { useViewer } from '../composables/useViewer'
import type { EntryListItemResponse } from '../../../types/api-responses'
import type { EntryItem } from '../types/entry'
import type { EntryFilterParams } from '../components/entries/EntryListFilter.vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import EntryListFilter from '../components/entries/EntryListFilter.vue'
import EntryListActions from '../components/entries/EntryListActions.vue'
import EntryListResults from '../components/entries/EntryListResults.vue'
import EntryEditModal from './modals/EntryEditModal.vue'
import { profilePath, sessionPath } from '../router/index'
import { fetchSessionAdults } from '../utils/fetchSessionAdults'

type EditData = { checkedIn: boolean; count: number; hours: number; notes: string; accompanyingAdultId: number | null; statsManual: import('../../../types/entry-stats').EntryStatsManual; cancelled: boolean }

const store = useEntryListStore()
const router = useRouter()
const viewer = useViewer()

const selected = ref<number[]>([])
const editingEntry = ref<EntryItem | null>(null)
const sessionAdults = ref<{ id: number; name: string }[]>([])
const editWorking = ref(false)
const editError = ref<string | undefined>()
const currentFilter = ref<EntryFilterParams>({ q: '', fy: 'future', accompanyingAdult: '', cancelled: 'false' })

function onFiltered(params: EntryFilterParams) {
  currentFilter.value = params
  store.fetch({ q: params.q, fy: params.fy, accompanyingAdult: params.accompanyingAdult, cancelled: params.cancelled, profileId: params.profileId })
}

function matchesFilter(entry: EntryListItemResponse, filter: EntryFilterParams): boolean {
  if (filter.q && !(entry.notes ?? '').toLowerCase().includes(filter.q.toLowerCase())) return false
  if (filter.accompanyingAdult === 'empty' && entry.hasAccompanyingAdult) return false
  if (filter.accompanyingAdult === 'notempty' && !entry.hasAccompanyingAdult) return false
  return true
}

function mapToEntryItem(e: EntryListItemResponse): EntryItem {
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

async function onEditEntry(e: EntryListItemResponse) {
  editingEntry.value = mapToEntryItem(e)
  sessionAdults.value = await fetchSessionAdults(e.groupKey, e.date)
}

function closeEditModal() {
  editingEntry.value = null
  sessionAdults.value = []
  editWorking.value = false
  editError.value = undefined
}

async function onSave(data: EditData) {
  if (!editingEntry.value) return
  editWorking.value = true
  editError.value = undefined
  try {
    const res = await fetch(`/api/entries/${editingEntry.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    const idx = store.entries.findIndex(e => e.id === editingEntry.value!.id)
    if (idx !== -1) {
      const stored = store.entries[idx]
      stored.checkedIn = data.checkedIn
      stored.hours = data.hours
      stored.count = data.count
      stored.notes = data.notes
      stored.accompanyingAdultId = data.accompanyingAdultId ?? undefined
      stored.hasAccompanyingAdult = data.accompanyingAdultId !== null
      stored.stats = { ...stored.stats, manual: data.statsManual }
      stored.cancelled = data.cancelled ? (stored.cancelled || new Date().toISOString()) : undefined
      if (!matchesFilter(stored, currentFilter.value)) {
        store.entries.splice(idx, 1)
        selected.value = selected.value.filter(id => id !== editingEntry.value!.id)
      }
    }
    closeEditModal()
  } catch (e) {
    console.error('[EntriesPage] save failed', e)
    editError.value = 'Failed to save — please try again'
    editWorking.value = false
  }
}

async function onDelete() {
  if (!editingEntry.value) return
  editWorking.value = true
  editError.value = undefined
  const id = editingEntry.value.id
  try {
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    const idx = store.entries.findIndex(e => e.id === id)
    if (idx >= 0) store.entries.splice(idx, 1)
    selected.value = selected.value.filter(sid => sid !== id)
    closeEditModal()
  } catch (e) {
    console.error('[EntriesPage] delete failed', e)
    editError.value = 'Failed to delete — please try again'
    editWorking.value = false
  }
}
</script>
