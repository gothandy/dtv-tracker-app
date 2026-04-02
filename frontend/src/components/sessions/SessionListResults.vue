<template>
  <div class="sr-section">
    <div v-if="loading" class="sr-empty">Loading…</div>
    <div v-else-if="!sessions.length" class="sr-empty">No sessions found.</div>
    <template v-else>
      <!-- Select all — admin only -->
      <div v-if="isAdmin && selected" class="sr-select-row">
        <button class="sr-select-all" @click="toggleSelectAll">
          {{ allSelected ? 'Deselect all' : 'Select all' }}
        </button>
      </div>

      <div class="sr-list">
        <div v-for="s in sessions" :key="s.id" class="sr-row">
          <input
            v-if="isAdmin && selected"
            type="checkbox"
            class="sr-checkbox"
            :checked="selected.includes(s.id)"
            @change="toggle(s.id)"
          />
          <RouterLink :to="sessionPath(s.groupKey!, s.date)" class="sr-card">
            <div class="sr-date">{{ formatDate(s.date) }}</div>
            <div class="sr-name">{{ s.displayName || s.groupName }}</div>
            <div v-if="s.displayName && s.groupName" class="sr-group">{{ s.groupName }}</div>
            <div v-if="s.description" class="sr-description">{{ s.description }}</div>
            <div v-if="hasStats(s)" class="sr-meta">
              <span v-if="s.registrations"><strong>{{ isPast(s.date) ? 'Attendees' : 'Registrations' }}:</strong> {{ s.registrations }}</span>
              <span v-if="s.hours"><strong>Hours:</strong> {{ s.hours }}</span>
              <span v-if="s.newCount"><strong>New:</strong> {{ s.newCount }}</span>
              <span v-if="s.childCount"><strong>Child:</strong> {{ s.childCount }}</span>
              <span v-if="s.regularCount"><strong>Regular:</strong> {{ s.regularCount }}</span>
              <span v-if="s.eventbriteCount"><strong>Eventbrite:</strong> {{ s.eventbriteCount }}</span>
            </div>
            <div v-if="s.metadata?.length" class="sr-tags">
              <span v-for="t in s.metadata" :key="t.termGuid" class="sr-tag">{{ shortLabel(t.label) }}</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sessionPath } from '../router/index'
import { useRole } from '../composables/useRole'
import type { Session } from '../types/session'

const props = defineProps<{
  sessions: Session[]
  loading?: boolean
  selected?: number[]
}>()

const emit = defineEmits<{ 'update:selected': [ids: number[]] }>()

const { isAdmin } = useRole()
const today = new Date(); today.setHours(0, 0, 0, 0)

const allSelected = computed(() =>
  props.sessions.length > 0 && props.sessions.every(s => props.selected?.includes(s.id))
)

function toggleSelectAll() {
  emit('update:selected', allSelected.value ? [] : props.sessions.map(s => s.id))
}

function toggle(id: number) {
  if (!props.selected) return
  const next = props.selected.includes(id)
    ? props.selected.filter(i => i !== id)
    : [...props.selected, id]
  emit('update:selected', next)
}

function isPast(date: string): boolean {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  return d <= today
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function hasStats(s: Session): boolean {
  return !!(s.registrations || s.hours || s.newCount || s.childCount || s.regularCount || s.eventbriteCount)
}

function shortLabel(label: string): string {
  return label.split(':').map(p => p.trim()).join(': ')
}
</script>

<style scoped>
.sr-section {
  background: var(--color-white);
  box-shadow: var(--shadow-sm);
}

.sr-empty { padding: 1.5rem; color: var(--color-text-muted); font-size: 0.9rem; }

.sr-select-row {
  padding: 0.5rem 1.5rem;
  border-bottom: 1px solid var(--color-surface-hover);
}

.sr-select-all {
  background: none; border: none; cursor: pointer;
  font-size: 0.85rem; font-weight: 600; color: var(--color-dtv-green); padding: 0;
}
.sr-select-all:hover { text-decoration: underline; }

.sr-list { display: flex; flex-direction: column; }

.sr-row {
  display: flex;
  align-items: flex-start;
  border-bottom: 1px solid var(--color-surface-hover);
}
.sr-row:last-child { border-bottom: none; }

.sr-checkbox {
  margin: 1.1rem 0 0 1rem;
  width: 16px; height: 16px;
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--color-dtv-green);
}

.sr-card {
  flex: 1;
  display: block;
  padding: 1rem 1.5rem;
  text-decoration: none;
  color: inherit;
}
.sr-card:hover { background: var(--color-surface-hover); }

.sr-date { font-size: 0.85rem; color: var(--color-dtv-green); margin-bottom: 0.2rem; }
.sr-name { font-size: 1rem; font-weight: 700; color: var(--color-text); margin-bottom: 0.15rem; }
.sr-group { font-size: 0.8rem; color: var(--color-text-faint); margin-bottom: 0.35rem; }

.sr-description {
  font-size: 0.875rem; color: var(--color-text-muted); font-style: italic; margin-bottom: 0.6rem;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.sr-meta {
  display: flex; flex-wrap: wrap; gap: 0.25rem 1.25rem;
  font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.5rem;
}

.sr-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.sr-tag { border: 1px solid var(--color-border); font-size: 0.78rem; padding: 0.15rem 0.6rem; color: var(--color-text-secondary); }
</style>
