<template>
  <div class="elr-wrap">

    <LoadingSpinner v-if="loading" />
    <p v-else-if="error" class="elr-empty elr-empty--error">{{ error }}</p>
    <p v-else-if="!entries.length" class="elr-empty">No entries found</p>

    <template v-else>
      <div v-if="allowSelect" class="list-select-row">
        <button class="list-select-all" @click="toggleSelectAll">
          {{ allSelected ? 'Deselect all' : 'Select all' }}
        </button>
      </div>

      <div class="elr-list">
        <div
          v-for="e in entries"
          :key="e.id"
          class="elr-item"
          :class="{ 'elr-item--selectable': allowSelect }"
        >
          <input
            v-if="allowSelect"
            type="checkbox"
            class="elr-checkbox"
            :checked="selected.includes(e.id)"
            @change="toggle(e.id)"
          />
          <button
            v-if="allowEdit"
            class="elr-edit-btn"
            @click="emit('editEntry', e)"
          >
            <EntryListItem :entry="e" :selected="selected.includes(e.id)" />
          </button>
          <EntryListItem
            v-else
            :entry="e"
            :to="entryPath(e.id)"
            :selected="selected.includes(e.id)"
          />
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EntryListItemResponse } from '../../../../types/api-responses'
import EntryListItem from './EntryListItem.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import { entryPath } from '../../router/index'

const props = defineProps<{
  entries: EntryListItemResponse[]
  loading: boolean
  error: string | null
  selected: number[]
  allowSelect?: boolean
  allowEdit?: boolean
}>()

const emit = defineEmits<{
  'update:selected': [ids: number[]]
  'editEntry': [entry: EntryListItemResponse]
}>()

const allSelected = computed(() =>
  props.entries.length > 0 && props.entries.every(e => props.selected.includes(e.id))
)

function toggleSelectAll() {
  emit('update:selected', allSelected.value ? [] : props.entries.map(e => e.id))
}

function toggle(id: number) {
  const next = props.selected.includes(id)
    ? props.selected.filter(x => x !== id)
    : [...props.selected, id]
  emit('update:selected', next)
}
</script>

<style scoped>
.elr-empty {
  padding: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.elr-empty--error {
  color: var(--color-dtv-dirt);
}

.elr-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.elr-item {
  position: relative;
}

.elr-checkbox {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.elr-item--selectable :deep(.eli-content) {
  padding-left: 2.75rem;
}

.elr-edit-btn {
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}
</style>
