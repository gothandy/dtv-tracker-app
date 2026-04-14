<template>
  <div class="pel-wrap">

    <div class="pel-header">
      <h2 class="pel-title">
        {{ filteredEntries.length }} Sessions
        <span v-if="totalHours" class="pel-hours">{{ totalHours }} hours</span>
      </h2>
      <div class="pel-filters">
        <select v-model="groupKey" class="pel-select">
          <option value="">All groups</option>
          <option v-for="g in groupOptions" :key="g.key" :value="g.key">{{ g.name }}</option>
        </select>
        <FyFilter v-model="fy" />
      </div>
    </div>

    <p v-if="!filteredEntries.length" class="pel-empty">No sessions yet.</p>

    <EntryList v-else>
      <EntryCard
        v-for="e in filteredEntries"
        :key="e.id"
        :title="cardTitle(e)"
        :title-to="allowEdit ? undefined : sessionPath(e.session.groupKey, e.session.date)"
        :checked-in="e.checkedIn"
        :hours="e.hours"
        :icons="iconsForEntry({ ...e.profile, notes: e.notes }).filter(i => i.type !== 'badge')"
        :allow-edit="allowEdit ?? false"
        :working="workingId === e.id"
        @update="(c, h) => emit('update', e, c, h)"
        @edit-entry="editingEntry = e"
      />
    </EntryList>

    <EntryEditModal
      v-if="editingEntry"
      :entry="editingEntry"
      :title="cardTitle(editingEntry)"
      view-label="View Session"
      view-icon="calendar"
      :view-to="sessionPath(editingEntry.session.groupKey, editingEntry.session.date)"
      :working="workingEdit"
      :error="editError"
      @close="closeEditModal"
      @save="onSave"
      @delete="onDelete"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { EntryItem } from '../../types/entry'
import EntryList from '../EntryList.vue'
import EntryCard from '../EntryCard.vue'
import EntryEditModal from '../../pages/modals/EntryEditModal.vue'
import FyFilter from '../FyFilter.vue'
import { sessionPath } from '../../router/index'
import { iconsForEntry } from '../../utils/tagIcons'

type EditData = { checkedIn: boolean; count: number; hours: number; notes: string }

const props = defineProps<{
  entries: EntryItem[]
  allowEdit?: boolean
  workingId?: number | null
}>()

const emit = defineEmits<{
  update: [entry: EntryItem, checkedIn: boolean, hours: number]
  editEntry: [id: number, data: EditData | null]
}>()

const fy = ref('future')
const groupKey = ref('')

// Cascade default: future → rolling → all, whichever first has entries
let defaultSet = false
watch(() => props.entries, (entries) => {
  if (defaultSet || !entries.length) return
  defaultSet = true
  const t = new Date().toISOString().slice(0, 10)
  if (entries.some(e => e.session.date >= t)) { fy.value = 'future'; return }
  if (entries.some(e => e.session.date >= rollingStart())) { fy.value = 'rolling'; return }
  fy.value = 'all'
}, { immediate: true })

const groupOptions = computed(() => {
  const map = new Map<string, string>()
  for (const e of props.entries) {
    if (e.session.groupKey && e.session.groupName) map.set(e.session.groupKey, e.session.groupName)
  }
  return [...map.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name))
})

function financialYearOf(date: string): string {
  const d = new Date(date)
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `FY${year}`
}

function rollingStart(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

const totalHours = computed(() => {
  const sum = filteredEntries.value.reduce((acc, e) => acc + (e.hours ?? 0), 0)
  return sum > 0 ? Math.round(sum * 10) / 10 : 0
})

const filteredEntries = computed(() => {
  let result = props.entries
  if (fy.value === 'future') {
    result = result.filter(e => e.session.date >= new Date().toISOString().slice(0, 10))
  } else if (fy.value === 'rolling') {
    const start = rollingStart()
    const today = new Date().toISOString().slice(0, 10)
    result = result.filter(e => e.session.date >= start && e.session.date <= today)
  } else if (fy.value !== 'all') {
    result = result.filter(e => financialYearOf(e.session.date) === fy.value)
  }
  if (groupKey.value) result = result.filter(e => e.session.groupKey === groupKey.value)
  return result
})

const editingEntry = ref<EntryItem | null>(null)
const workingEdit = ref(false)
const editError = ref('')

function cardTitle(e: EntryItem): string {
  const date = new Date(e.session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return groupKey.value ? date : `${date} · ${e.session.groupName}`
}

function closeEditModal() {
  editingEntry.value = null
  workingEdit.value = false
  editError.value = ''
}

function onSave(data: EditData) {
  if (!editingEntry.value) return
  workingEdit.value = true
  editError.value = ''
  emit('editEntry', editingEntry.value.id, data)
}

function onDelete() {
  if (!editingEntry.value) return
  workingEdit.value = true
  editError.value = ''
  emit('editEntry', editingEntry.value.id, null)
}

defineExpose({
  onEditSuccess: closeEditModal,
  onEditError(msg: string) { workingEdit.value = false; editError.value = msg },
})
</script>

<style scoped>
.pel-wrap {
  padding: 1.5rem;
  background: var(--color-white);
  color: var(--color-text);
}

.pel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.pel-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.pel-hours {
  margin-left: 0.4rem;
  font-weight: 400;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.pel-empty {
  color: var(--color-text-secondary);
  margin: 0;
}

.pel-filters {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.pel-select {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-white);
  cursor: pointer;
}
</style>
