<template>
  <div class="el-wrap">

    <!-- Header -->
    <div class="el-header">
      <h2 class="el-title">
        Entries
        <span v-if="!loading" class="el-count">({{ checkedCount }} from {{ entries.length }})</span>
      </h2>
      <div class="el-actions">
        <button class="icon-btn" title="Refresh" :disabled="refreshing" @click="refresh">
          <img src="/svg/refresh.svg" alt="Refresh" />
        </button>
        <button class="icon-btn" title="Set Hours" @click="showSetHours = true">
          <img src="/svg/clock.svg" alt="Set Hours" />
        </button>
        <button class="icon-btn" title="Add entry" @click="showAdd = true">
          <img src="/svg/add.svg" alt="Add" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="el-status">Loading…</div>
    <div v-else-if="error" class="el-status el-error">{{ error }}</div>
    <div v-else-if="!entries.length" class="el-status">No entries yet.</div>

    <div v-else class="el-list">
      <div v-for="entry in entries" :key="entry.id" class="el-row">

        <!-- Hours input when hours set; checkbox otherwise -->
        <input
          v-if="entry.hours > 0"
          type="number"
          class="el-check el-check--hours"
          :value="entry.hours"
          min="0"
          step="0.5"
          @change="setHours(entry, ($event.target as HTMLInputElement).valueAsNumber)"
        />
        <button
          v-else
          class="el-check"
          :class="{ 'el-check--on': entry.checkedIn }"
          :disabled="toggling === entry.id"
          @click="toggleCheckin(entry)"
        >
          <span v-if="entry.checkedIn">✓</span>
        </button>

        <!-- Entry card -->
        <div class="el-card" :class="{ 'el-card--checked': entry.checkedIn }">
          <div class="el-card-left">
            <button class="el-name" @click="editingEntryId = entry.id">
              {{ entry.volunteerName ?? 'Unknown' }}
            </button>
            <!-- Profile badges -->
            <span v-if="entry.isMember && !entry.isGroup" class="el-icon-tag" title="Charity Member">
              <img src="/svg/member.svg" alt="Member" />
            </span>
            <span v-if="entry.cardStatus === 'Accepted'" class="el-icon-tag" title="Benefits Card">
              <img src="/svg/card.svg" alt="Card" />
            </span>
            <span v-if="entry.cardStatus === 'Invited'" class="el-icon-tag icon-orange" title="Card Invited">
              <img src="/svg/card.svg" alt="Card" />
            </span>
            <span v-if="entry.isGroup" class="el-icon-tag" title="Group">
              <img src="/svg/group.svg" alt="Group" />
            </span>
            <!-- Notes hashtag icons -->
            <span
              v-for="t in iconsFromNotes(entry.notes)"
              :key="t.tag"
              class="el-icon-tag"
              :class="t.color ? 'icon-' + t.color : ''"
              :title="t.alt"
            >
              <img :src="'/svg/' + t.icon" :alt="t.alt" />
            </span>
          </div>
        </div>

      </div>
    </div>

    <EntryEditModalV1
      v-if="editingEntryId"
      :entry-id="editingEntryId"
      @close="editingEntryId = null"
      @saved="load"
      @deleted="load"
    />

    <AddEntryModalV1
      v-if="showAdd"
      :group-key="groupKey"
      :date="date"
      @close="showAdd = false"
      @added="load"
    />

    <SetHoursModalV1
      v-if="showSetHours"
      :entries="entries"
      @close="showSetHours = false"
      @done="load"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { entryPath } from '../router/index'
import type { EntryResponse } from '../../../types/api-responses'
import { iconsFromNotes } from '../utils/tagIcons'
import EntryEditModalV1 from './EntryEditModalV1.vue'
import AddEntryModalV1 from './AddEntryModalV1.vue'
import SetHoursModalV1 from './SetHoursModalV1.vue'

const props = defineProps<{ groupKey: string; date: string }>()

const entries = ref<EntryResponse[]>([])
const loading = ref(false)
const error = ref('')
const refreshing = ref(false)
const toggling = ref<number | null>(null)
const showAdd = ref(false)
const showSetHours = ref(false)
const editingEntryId = ref<number | null>(null)

const checkedCount = computed(() => entries.value.filter(e => e.checkedIn).length)


async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/sessions/${props.groupKey}/${props.date}`)
    if (!res.ok) throw new Error(`Failed to load (${res.status})`)
    const json = await res.json()
    entries.value = json.data?.entries ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Load failed'
    console.error('[EntriesListV1]', e)
  } finally {
    loading.value = false
  }
}

async function refresh() {
  refreshing.value = true
  try {
    await fetch(`/api/sessions/${props.groupKey}/${props.date}/refresh`, { method: 'POST' })
    await load()
  } catch (e) {
    console.error('[EntriesListV1] refresh failed', e)
  } finally {
    refreshing.value = false
  }
}

async function toggleCheckin(entry: EntryResponse) {
  toggling.value = entry.id
  try {
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedIn: !entry.checkedIn }),
    })
    if (!res.ok) throw new Error(`Toggle failed (${res.status})`)
    entry.checkedIn = !entry.checkedIn
  } catch (e) {
    console.error('[EntriesListV1] toggle failed', e)
  } finally {
    toggling.value = null
  }
}


async function setHours(entry: EntryResponse, hours: number) {
  if (isNaN(hours) || hours < 0) return
  try {
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours }),
    })
    if (!res.ok) throw new Error(`Hours update failed (${res.status})`)
    entry.hours = hours
  } catch (e) {
    console.error('[EntriesListV1] setHours failed', e)
  }
}

onMounted(load)
</script>

<style scoped>
.el-wrap {
  padding: 1.5rem;
  background: var(--color-white);
  color: var(--color-text);
}

/* Header */
.el-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.el-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.el-count {
  font-weight: 400;
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.el-actions {
  display: flex;
  gap: 0.4rem;
}

/* Status */
.el-status { font-size: 0.9rem; color: var(--color-text-faint); padding: 0.5rem 0; }
.el-error { color: var(--color-error); }

/* Entry rows */
.el-list { display: flex; flex-direction: column; gap: 0.4rem; }

.el-row {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
}

/* Check-in button — stays square even when card wraps */
.el-check {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-self: flex-start;
  background: var(--color-surface-subtle);
  border: 2px solid var(--color-border);
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
}
.el-check--on {
  background: var(--color-dtv-green);
  border-color: var(--color-dtv-green);
}
.el-check:disabled { opacity: 0.5; cursor: default; }

/* Hours replaces checkbox — same size, green bg, editable */
.el-check--hours {
  background: var(--color-dtv-green);
  border-color: var(--color-dtv-green);
  color: var(--color-white);
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 600;
  text-align: center;
  cursor: text;
  padding: 0;
}
.el-check--hours::-webkit-inner-spin-button,
.el-check--hours::-webkit-outer-spin-button { -webkit-appearance: none; }


/* Entry card */
.el-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.5rem;
  background: var(--color-white);
  border: none;
  border-left: 4px solid transparent;
  gap: 0.5rem;
}
.el-card--checked {
  border-left-color: var(--color-dtv-green);
}

.el-card-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.25rem;
  overflow: hidden;
}

.el-card-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* Name — styled as link, opens edit modal */
.el-name {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex-shrink: 1;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.el-name:hover { text-decoration: underline; }

/* SVG icon tags */
.el-icon-tag {
  display: inline-flex;
  align-items: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}
.el-icon-tag img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}



/* Hours */
.el-hours-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
  color: var(--color-text);
  white-space: nowrap;
}

</style>
