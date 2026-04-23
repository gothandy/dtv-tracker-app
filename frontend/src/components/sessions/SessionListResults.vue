<template>
  <div class="sr-section">
    <LoadingSpinner v-if="loading" />
    <div v-else-if="!sessions.length" class="sr-empty">No sessions found.</div>
    <template v-else>
      <!-- Select all — admin only -->
      <div v-if="profile.isAdmin && selected" class="list-select-row">
        <button class="list-select-all" @click="toggleSelectAll">
          {{ allSelected ? 'Deselect all' : 'Select all' }}
        </button>
      </div>

      <div class="list-card-grid">
        <div v-for="s in sessions" :key="s.id" class="list-card-item">
          <input
            v-if="profile.isAdmin && selected"
            type="checkbox"
            class="list-card-checkbox"
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
import { useViewer } from '../../composables/useViewer'
import type { Session } from '../../types/session'
import SessionCard from './SessionCard.vue'
import LoadingSpinner from '../LoadingSpinner.vue'

const props = defineProps<{
  sessions: Session[]
  loading?: boolean
  selected?: number[]
}>()

const emit = defineEmits<{ 'update:selected': [ids: number[]] }>()

const profile = useViewer()

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
.list-card-grid :deep(.session-card) { background: var(--color-dtv-sand); }
</style>
