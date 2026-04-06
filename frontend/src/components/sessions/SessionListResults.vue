<template>
  <div class="sr-section">
    <div v-if="loading" class="sr-empty">Loading…</div>
    <div v-else-if="!sessions.length" class="sr-empty">No sessions found.</div>
    <template v-else>
      <!-- Select all — admin only -->
      <div v-if="profile.isAdmin && selected" class="sr-select-row">
        <button class="sr-select-all" @click="toggleSelectAll">
          {{ allSelected ? 'Deselect all' : 'Select all' }}
        </button>
      </div>

      <div class="sr-grid">
        <div v-for="s in sessions" :key="s.id" class="sr-item">
          <input
            v-if="profile.isAdmin && selected"
            type="checkbox"
            class="sr-checkbox"
            :checked="selected.includes(s.id)"
            @change="toggle(s.id)"
          />
          <SessionCard :session="s" :profile="profile.context" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProfile } from '../../composables/useProfile'
import type { Session } from '../../types/session'
import SessionCard from './SessionCard.vue'

const props = defineProps<{
  sessions: Session[]
  loading?: boolean
  selected?: number[]
}>()

const emit = defineEmits<{ 'update:selected': [ids: number[]] }>()

const profile = useProfile()

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
</script>

<style scoped>
.sr-section { padding: 0; }

.sr-empty { padding: 1.5rem 0; color: var(--color-text-muted); font-size: 0.9rem; }

.sr-select-row {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-surface-hover);
  margin-bottom: 1rem;
}

.sr-select-all {
  background: none; border: none; cursor: pointer;
  font-size: 0.85rem; font-weight: 600; color: var(--color-dtv-green); padding: 0;
}
.sr-select-all:hover { text-decoration: underline; }

.sr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  padding: 1.5rem 0;
}
@media (width < 48em) { .sr-grid { grid-template-columns: 1fr; } }

.sr-grid :deep(.session-card) { background: var(--color-dtv-sand); }

.sr-item {
  position: relative;
}

.sr-checkbox {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  z-index: 1;
  width: 16px; height: 16px;
  cursor: pointer;
  accent-color: var(--color-dtv-green);
}
</style>
