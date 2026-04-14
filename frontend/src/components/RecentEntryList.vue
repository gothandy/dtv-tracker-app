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
      <RouterLink
        v-for="e in entries"
        :key="e.id"
        :to="sessionPath(e.groupKey, e.date)"
        class="rel-row"
        :class="{ 'rel-row--checked': e.checkedIn }"
      >
        <div class="rel-left">
          <span class="rel-name">{{ e.volunteerName }}</span>
          <span
            v-for="icon in icons(e)"
            :key="icon.alt"
            class="rel-icon"
            :class="icon.color ? 'icon-' + icon.color : ''"
            :title="icon.alt"
          >
            <img :src="'/icons/' + icon.icon" :alt="icon.alt" />
          </span>
        </div>
        <div class="rel-right">
          <span class="rel-date">{{ formatDate(e.date) }}</span>
          <span class="rel-group">{{ e.groupName }}</span>
        </div>
      </RouterLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import type { RecentSignupResponse } from '../../../types/api-responses'
import { sessionPath } from '../router/index'
import { iconsFromNotes } from '../utils/tagIcons'
import type { TagIcon } from '../utils/tagIcons'

const since = ref<string>('24h')
const entries = ref<RecentSignupResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

function icons(e: RecentSignupResponse): TagIcon[] {
  return iconsFromNotes(e.notes)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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

.rel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-dtv-sand);
  text-decoration: none;
  color: var(--color-text);
  border-left: 4px solid transparent;
}
.rel-row--checked {
  border-left-color: var(--color-dtv-green);
}
.rel-row:hover {
  background: var(--color-dtv-sand-dark);
}

.rel-left {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  flex: 1;
}

.rel-name {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex-shrink: 1;
}

.rel-icon {
  display: inline-flex;
  align-items: flex-start;
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  align-self: flex-start;
}
.rel-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.rel-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.rel-date {
  white-space: nowrap;
}

.rel-group {
  white-space: nowrap;
  font-weight: 500;
}
</style>
