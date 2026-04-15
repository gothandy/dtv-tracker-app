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
      <EntryListItem
        v-for="e in entries"
        :key="e.id"
        :entry="mapEntry(e)"
        :to="sessionPath(e.groupKey, e.date)"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { RecentSignupResponse, EntryListItemResponse } from '../../../types/api-responses'
import { sessionPath } from '../router/index'
import EntryListItem from './entries/EntryListItem.vue'

const since = ref<string>('24h')
const entries = ref<RecentSignupResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

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
</style>
