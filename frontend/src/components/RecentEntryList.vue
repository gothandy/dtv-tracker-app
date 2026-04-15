<template>
  <div class="rel-wrap">

    <div class="rel-header">
      <h2 class="rel-title">Recent Sign-ups</h2>
      <select v-model="since" class="rel-select" @change="load">
        <option value="24h">Last 24h</option>
        <option value="48h">Last 48h</option>
        <option value="7d">Last 7 days</option>
      </select>
    </div>

    <p v-if="loading" class="rel-empty">Loading…</p>
    <p v-else-if="error" class="rel-empty rel-empty--error">{{ error }}</p>
    <p v-else-if="!entries.length" class="rel-empty">No sign-ups in this period</p>

    <div v-else class="rel-list">
      <template v-for="e in entries" :key="e.id">
        <button v-if="isAdmin" class="rel-item-btn" @click="openModal(e)">
          <EntryListItem :entry="mapEntry(e)" />
        </button>
        <EntryListItem v-else :entry="mapEntry(e)" :to="sessionPath(e.groupKey, e.date)" />
      </template>
    </div>

    <EntryEditModal
      v-if="editingEntry"
      :entry="editingEntry"
      :is-cancelled="!!editingEntry.cancelled"
      :is-admin="true"
      :session-click="() => router.push(sessionPath(editingEntry!.session.groupKey, editingEntry!.session.date))"
      :session-adults="sessionAdults"
      :working="editWorking"
      :error="editError"
      @close="closeModal"
      @save="onSave"
      @delete="onDelete"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { RecentSignupResponse, EntryListItemResponse } from '../../../types/api-responses'
import type { EntryItem } from '../types/entry'
import { sessionPath } from '../router/index'
import EntryListItem from './entries/EntryListItem.vue'
import EntryEditModal from '../pages/modals/EntryEditModal.vue'
import { fetchSessionAdults } from '../utils/fetchSessionAdults'

const props = defineProps<{ isAdmin?: boolean }>()

const router = useRouter()
const since = ref<string>('24h')
const entries = ref<RecentSignupResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const editingEntry = ref<EntryItem | null>(null)
const sessionAdults = ref<{ id: number; name: string }[]>([])
const editWorking = ref(false)
const editError = ref<string | undefined>()

type EditData = { checkedIn: boolean; count: number; hours: number; notes: string; accompanyingAdultId: number | null }

function mapToEntryItem(e: RecentSignupResponse): EntryItem {
  return {
    id: e.id,
    checkedIn: e.checkedIn,
    hours: e.hours,
    count: e.count,
    notes: e.notes,
    accompanyingAdultId: e.accompanyingAdultId,
    cancelled: e.cancelled,
    profile: {
      name: e.volunteerName,
      slug: e.volunteerSlug,
      isMember: false,
      isGroup: false,
    },
    session: {
      groupKey: e.groupKey,
      groupName: e.groupName,
      date: e.date,
    },
  }
}

async function openModal(e: RecentSignupResponse) {
  editingEntry.value = mapToEntryItem(e)
  sessionAdults.value = await fetchSessionAdults(e.groupKey, e.date)
}

function closeModal() {
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
    const stored = entries.value.find(e => e.id === editingEntry.value!.id)
    if (stored) {
      stored.checkedIn = data.checkedIn
      stored.hours = data.hours
      stored.count = data.count
      stored.notes = data.notes
      stored.accompanyingAdultId = data.accompanyingAdultId ?? undefined
    }
    closeModal()
  } catch (e) {
    console.error('[RecentEntryList] save failed', e)
    editError.value = 'Failed to save — please try again'
    editWorking.value = false
  }
}

async function onDelete() {
  if (!editingEntry.value) return
  editWorking.value = true
  editError.value = undefined
  const id = editingEntry.value.id
  const isCancelled = !!editingEntry.value.cancelled
  try {
    if (isCancelled) {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      entries.value = entries.value.filter(e => e.id !== id)
    } else {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelled: true }),
      })
      if (!res.ok) throw new Error(`Cancel failed (${res.status})`)
      const stored = entries.value.find(e => e.id === id)
      if (stored) stored.cancelled = new Date().toISOString()
    }
    closeModal()
  } catch (e) {
    console.error('[RecentEntryList] delete/cancel failed', e)
    editError.value = isCancelled ? 'Failed to delete — please try again' : 'Failed to cancel — please try again'
    editWorking.value = false
  }
}

function mapEntry(e: RecentSignupResponse): EntryListItemResponse {
  return {
    id: e.id,
    volunteerName: e.volunteerName,
    volunteerSlug: e.volunteerSlug,
    date: e.date,
    groupKey: e.groupKey,
    groupName: e.groupName,
    notes: e.notes,
    checkedIn: e.checkedIn,
    hours: 0,
    count: 1,
    isGroup: false,
    hasAccompanyingAdult: false,
    cancelled: e.cancelled,
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`/api/entries/recent?since=${encodeURIComponent(since.value)}`)
    if (!res.ok) { error.value = `Failed to load (${res.status})`; return }
    const json = await res.json()
    entries.value = json.data as RecentSignupResponse[]
  } catch (e) {
    console.error('[RecentEntryList] fetch failed', e)
    error.value = 'Failed to load sign-ups'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.rel-wrap {
  background: var(--color-dtv-sand-light);
}

.rel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--color-dtv-light);
}

.rel-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.rel-select {
  font-size: 0.85rem;
  font-family: inherit;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-dtv-sand-dark);
  background: var(--color-dtv-light);
  color: var(--color-text);
  cursor: pointer;
}

.rel-empty {
  padding: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.rel-empty--error {
  color: var(--color-dtv-dirt);
}

.rel-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rel-item-btn {
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}
</style>
