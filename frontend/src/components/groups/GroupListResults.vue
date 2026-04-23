<template>
  <LoadingSpinner v-if="loading" />
  <div v-else-if="error" class="gr-state gr-state--error">{{ error }}</div>
  <div v-else-if="!groups.length" class="gr-state">No groups found.</div>
  <template v-else>
    <div v-if="selected" class="list-select-row">
      <button class="list-select-all" @click="toggleSelectAll">
        {{ allSelected ? 'Deselect all' : 'Select all' }}
      </button>
    </div>
    <div class="list-card-grid">
      <div v-for="g in groups" :key="g.key" class="list-card-item">
        <input
          v-if="selected"
          type="checkbox"
          class="list-card-checkbox"
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
.list-card-grid :deep(.group-card) { background: var(--color-dtv-sand); }
</style>
