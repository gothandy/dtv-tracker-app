<template>
  <div class="el-wrap">

    <!-- Header -->
    <div class="el-header">
      <h2 class="el-title">
        Entries
        <span v-if="!loading" class="el-count">({{ checkedCount }} from {{ mappedEntries.length }})</span>
      </h2>
      <div class="el-actions">
        <button class="icon-btn" title="Refresh" :disabled="refreshing" @click="refresh">
          <img src="/icons/refresh.svg" alt="Refresh" />
        </button>
        <button class="icon-btn" title="Set Hours" @click="showSetHours = true">
          <img src="/icons/clock.svg" alt="Set Hours" />
        </button>
        <button class="icon-btn" title="Add entry" @click="showAdd = true">
          <img src="/icons/add.svg" alt="Add" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="el-status">Loading…</div>
    <div v-else-if="error" class="el-status el-error">{{ error }}</div>
    <div v-else>
      <EntryList
        display-type="session"
        :entries="mappedEntries"
        :allow-edit="allowEdit"
        :working-id="workingId"
        @update="updateEntry"
      />
    </div>

    <EditEntryModal
      v-if="editingEntryId"
      :entry-id="editingEntryId"
      @close="editingEntryId = null"
      @saved="load"
      @deleted="load"
    />

    <AddEntryModal
      v-if="showAdd"
      :group-key="groupKey"
      :date="date"
      @close="showAdd = false"
      @added="load"
    />

    <SetHoursModal
      v-if="showSetHours"
      :entries="entries"
      @close="showSetHours = false"
      @done="load"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { EntryResponse } from '../../../../types/api-responses'
import type { EntryItem } from '../../types/entry'
import { useProfile } from '../../composables/useProfile'
import EntryList from '../EntryList.vue'
import EditEntryModal from '../../pages/modals/EditEntryModal.vue'
import AddEntryModal from '../../pages/modals/AddEntryModal.vue'
import SetHoursModal from '../../pages/modals/SetHoursModal.vue'

const props = defineProps<{ groupKey: string; date: string; groupName?: string }>()

const profile = useProfile()
const allowEdit = computed(() => profile.isOperational)

const entries = ref<EntryResponse[]>([])
const loading = ref(false)
const error = ref('')
const refreshing = ref(false)
const workingId = ref<number | null>(null)
const showAdd = ref(false)
const showSetHours = ref(false)
const editingEntryId = ref<number | null>(null)

const checkedCount = computed(() => entries.value.filter(e => e.checkedIn).length)

function mapEntry(e: EntryResponse): EntryItem {
  return {
    id: e.id,
    checkedIn: e.checkedIn,
    hours: e.hours,
    count: e.count,
    notes: e.notes,
    profile: {
      name: e.profileName ?? 'Unknown',
      slug: e.profileSlug,
      isMember: e.isMember,
      cardStatus: e.cardStatus,
      isGroup: e.isGroup,
    },
    session: {
      groupKey: props.groupKey,
      groupName: props.groupName ?? '',
      date: props.date,
    },
  }
}

const mappedEntries = computed(() => entries.value.map(mapEntry))

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
    console.error('[SessionDetailEntries]', e)
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
    console.error('[SessionDetailEntries] refresh failed', e)
  } finally {
    refreshing.value = false
  }
}

async function updateEntry(item: EntryItem, checkedIn: boolean, hours: number) {
  workingId.value = item.id
  try {
    const res = await fetch(`/api/entries/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedIn, hours }),
    })
    if (!res.ok) throw new Error(`Update failed (${res.status})`)
    const entry = entries.value.find(e => e.id === item.id)
    if (entry) { entry.checkedIn = checkedIn; entry.hours = hours }
  } catch (e) {
    console.error('[SessionDetailEntries] update failed', e)
  } finally {
    workingId.value = null
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

.el-status { font-size: 0.9rem; color: var(--color-text-faint); padding: 0.5rem 0; }
.el-error { color: var(--color-error); }
</style>
