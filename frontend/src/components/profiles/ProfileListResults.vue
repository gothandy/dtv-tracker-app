<template>
  <div class="plr-section">
    <div v-if="loading" class="plr-empty">Loading…</div>
    <div v-else-if="!profiles.length" class="plr-empty">No volunteers found.</div>
    <template v-else>
      <div v-if="canSelect && selected" class="plr-select-row">
        <button class="plr-select-all" @click="toggleSelectAll">
          {{ allSelected ? 'Deselect all' : 'Select all' }}
        </button>
      </div>
      <div class="plr-list">
        <div v-for="p in profiles" :key="p.id" class="plr-item">
          <input
            v-if="canSelect && selected"
            type="checkbox"
            class="plr-checkbox"
            :checked="selected.includes(p.id)"
            @change="toggle(p.id)"
          />
          <ProfileListItem
            :profile="p"
            :display-hours="hoursFor(p)"
            :display-sessions="sessionsFor(p)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProfileListItem from './ProfileListItem.vue'
import type { ProfileResponse } from '../../../../types/api-responses'


const props = defineProps<{
  profiles: ProfileResponse[]
  loading?: boolean
  selected?: number[]
  canSelect: boolean
  fy: string
}>()

const emit = defineEmits<{ 'update:selected': [ids: number[]] }>()

function hoursFor(p: ProfileResponse): number {
  return props.fy === 'all' ? p.hoursAll : p.hoursThisFY
}

function sessionsFor(p: ProfileResponse): number {
  return props.fy === 'all' ? p.sessionsAll : p.sessionsThisFY
}


const allSelected = computed(() =>
  props.profiles.length > 0 && props.profiles.every(p => props.selected?.includes(p.id))
)

function toggleSelectAll() {
  emit('update:selected', allSelected.value ? [] : props.profiles.map(p => p.id))
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
.plr-section { padding: 0; }

.plr-empty { padding: 1.5rem 0; color: var(--color-text-muted); font-size: 0.9rem; }

.plr-select-row {
  padding: 0.5rem 1.5rem;
  border-bottom: 1px solid var(--color-surface-hover);
}

.plr-select-all {
  background: none; border: none; cursor: pointer;
  font-size: 0.85rem; font-weight: 600; color: var(--color-dtv-green); padding: 0;
}
.plr-select-all:hover { text-decoration: underline; }

.plr-list { display: flex; flex-direction: column; }

.plr-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 1.5rem;
}

.plr-item :deep(.pli-wrap) { padding-left: 0; flex: 1; }

.plr-checkbox {
  flex-shrink: 0;
  appearance: none;
  width: 20px; height: 20px;
  border-radius: 0;
  border: 1.5px solid var(--color-border);
  background: var(--color-dtv-sand);
  cursor: pointer;
}

.plr-checkbox:checked {
  background: var(--color-dtv-green);
  border-color: var(--color-dtv-green);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 8l3.5 3.5L13 4.5' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
</style>
