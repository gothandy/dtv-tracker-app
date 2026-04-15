<template>
  <div class="sf-wrap">
    <input
      v-model="search"
      type="text"
      class="sf-search"
      placeholder="Search sessions…"
      autocomplete="off"
    />
    <FyFilter v-model="fy" />
    <select v-model="groupKey" class="sf-select">
      <option value="">All groups</option>
      <option v-for="g in groupOptions" :key="g.key" :value="g.key">{{ g.name }}</option>
    </select>
    <TermPicker
      v-model="tagLabel"
      :tree="taxonomyTree"
      :loading="taxonomyLoading"
      :show-no-tags="true"
      :available-labels="availableTagLabels"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import TermPicker from '../TermPicker.vue'
import { useTaxonomy } from '../../composables/useTaxonomy'
import type { Session } from '../../types/session'

const props = defineProps<{ sessions: Session[] }>()
const emit = defineEmits<{ filtered: [sessions: Session[]] }>()

const { tree: taxonomyTree, loading: taxonomyLoading } = useTaxonomy()

const route = useRoute()
const router = useRouter()
const fy       = ref((route.query.fy as string) || 'future')
const search   = ref((route.query.search as string) || '')
const groupKey = ref((route.query.group as string) || '')
const tagLabel = ref((route.query.tag as string) || '')

function rollingStart(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

function applyBase(list: Session[]): Session[] {
  let r = list
  if (fy.value === 'future')
    r = r.filter(s => s.date >= new Date().toISOString().slice(0, 10))
  else if (fy.value === 'rolling')
    r = r.filter(s => s.date >= rollingStart() && s.date <= new Date().toISOString().slice(0, 10))
  else if (fy.value && fy.value !== 'all')
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

const filtered = computed(() => {
  const list = applyTag(applyGroup(base.value))
  return fy.value === 'future'
    ? [...list].sort((a, b) => a.date.localeCompare(b.date))
    : list
})

watch(filtered, list => emit('filtered', list), { immediate: true })

watch([fy, search, groupKey, tagLabel], ([newFy, newSearch, newGroup, newTag]) => {
  const query: Record<string, string> = {}
  if (newFy)     query.fy     = newFy
  if (newSearch) query.search = newSearch
  if (newGroup)  query.group  = newGroup
  if (newTag)    query.tag    = newTag
  router.replace({ query })
})
</script>

<style scoped>
.sf-wrap {
  background: var(--color-dtv-sand);
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
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

.sf-wrap :deep(.tp-wrap) { flex: 1 1 140px; display: flex; flex-direction: column; }
.sf-wrap :deep(.tp-btn) { flex: 1; width: 100%; justify-content: space-between; }
</style>
