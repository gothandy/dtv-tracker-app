<template>
  <LoadingSpinner v-if="loading" />
  <div v-else-if="error" class="gr-state gr-state--error">{{ error }}</div>
  <div v-else-if="!groups.length" class="gr-state">No groups found.</div>
  <template v-else>
    <div v-if="selected" class="gr-select-row">
      <button class="gr-select-all" @click="toggleSelectAll">
        {{ allSelected ? 'Deselect all' : 'Select all' }}
      </button>
    </div>
    <div class="gr-grid">
      <div v-for="g in groups" :key="g.key" class="gr-item">
        <input
          v-if="selected"
          type="checkbox"
          class="gr-checkbox"
          :checked="selected.includes(g.id)"
          @change="toggle(g.id)"
        />
        <GroupCard :group="g" />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GroupCard from './GroupCard.vue'
import type { GroupWithStats } from './GroupListFilter.vue'
import LoadingSpinner from '../LoadingSpinner.vue'

const props = defineProps<{
  groups: GroupWithStats[]
  loading?: boolean
  error?: string | null
  selected?: number[]
}>()

const emit = defineEmits<{ 'update:selected': [ids: number[]] }>()

const allSelected = computed(() =>
  props.groups.length > 0 && props.groups.every(g => props.selected?.includes(g.id))
)

function toggleSelectAll() {
  emit('update:selected', allSelected.value ? [] : props.groups.map(g => g.id))
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
.gr-state { text-align: center; padding: 3rem; color: var(--color-text-muted); }
.gr-state--error { color: var(--color-dtv-red); }

.gr-select-row {
  padding: 0.5rem 1.5rem;
  border-bottom: 1px solid var(--color-surface-hover);
}

.gr-select-all {
  background: none; border: none; cursor: pointer;
  font-size: 0.85rem; font-weight: 600; color: var(--color-dtv-green); padding: 0;
}
.gr-select-all:hover { text-decoration: underline; }

.gr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  padding: 0 1.5rem;
}
@media (width < 48em) { .gr-grid { grid-template-columns: 1fr; } }

.gr-grid :deep(.group-card) { background: var(--color-dtv-sand); }

.gr-item {
  position: relative;
}

.gr-checkbox {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  z-index: 1;
  width: 16px; height: 16px;
  cursor: pointer;
  accent-color: var(--color-dtv-green);
}
</style>
