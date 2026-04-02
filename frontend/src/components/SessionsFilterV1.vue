<template>
  <div class="sf-wrap">
    <div class="sf-title-row">
      <h2 class="sf-heading">Sessions</h2>
      <span class="sf-count">{{ filtered.length }}</span>
      <FyFilterV1 v-model="fy" />
    </div>
    <div class="sf-filters">
      <input
        v-model="search"
        type="text"
        class="sf-search"
        placeholder="Search sessions…"
        autocomplete="off"
      />
      <select v-model="groupKey" class="sf-select">
        <option value="">All groups</option>
        <option v-for="g in groupOptions" :key="g.key" :value="g.key">{{ g.name }}</option>
      </select>
      <TagPickerV1
        v-model="tagLabel"
        :show-no-tags="true"
        :available-labels="availableTagLabels"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import FyFilterV1 from './FyFilterV1.vue'
import TagPickerV1 from './TagPickerV1.vue'
import type { Session } from '../types/session'

const props = defineProps<{ sessions: Session[] }>()
const emit = defineEmits<{ filtered: [sessions: Session[]] }>()

const fy       = ref('all')
const search   = ref('')
const groupKey = ref('')
const tagLabel = ref('')

function applyBase(list: Session[]): Session[] {
  let r = list
  if (fy.value && fy.value !== 'all')
    r = r.filter(s => s.financialYear === fy.value)
  if (search.value.length >= 3) {
    const q = search.value.toLowerCase()
    r = r.filter(s =>
      (s.displayName ?? '').toLowerCase().includes(q) ||
      (s.groupName ?? '').toLowerCase().includes(q) ||
      (s.description ?? '').toLowerCase().includes(q)
    )
  }
  return r
}

function applyGroup(list: Session[]): Session[] {
  return groupKey.value ? list.filter(s => s.groupKey === groupKey.value) : list
}

function applyTag(list: Session[]): Session[] {
  if (!tagLabel.value) return list
  if (tagLabel.value === '__none__') return list.filter(s => !s.metadata?.length)
  return list.filter(s =>
    s.metadata?.some(t => t.label === tagLabel.value || t.label.startsWith(tagLabel.value + ':')) ?? false
  )
}

// Cascading: each dropdown only shows options present in sessions matching all other filters
const base = computed(() => applyBase(props.sessions))

const groupOptions = computed(() => {
  const map = new Map<string, string>()
  for (const s of applyTag(base.value)) {
    if (s.groupKey && s.groupName) map.set(s.groupKey, s.groupName)
  }
  return [...map.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name))
})

const availableTagLabels = computed(() => {
  const labels = new Set<string>()
  for (const s of applyGroup(base.value)) s.metadata?.forEach(t => labels.add(t.label))
  return labels
})

const filtered = computed(() => applyTag(applyGroup(base.value)))

watch(filtered, list => emit('filtered', list), { immediate: true })
</script>

<style scoped>
.sf-wrap {
  background: var(--color-white);
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.5rem;
}

.sf-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.sf-heading { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; }

.sf-count {
  background: var(--color-surface-subtle); color: var(--color-text-label);
  font-size: 0.8rem; font-weight: 600;
  padding: 0.15rem 0.5rem;
  margin-right: auto;
}

.sf-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: stretch;
}

.sf-search {
  flex: 2 1 180px;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--color-border);
  font-size: 0.95rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-white);
  box-sizing: border-box;
}
.sf-search:focus { outline: none; border-color: var(--color-dtv-green); }

.sf-select {
  flex: 1 1 140px;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-white);
  cursor: pointer;
}

.sf-filters :deep(.tp-wrap) { flex: 1 1 140px; display: flex; flex-direction: column; }
.sf-filters :deep(.tp-btn) { flex: 1; width: 100%; justify-content: space-between; }
</style>
