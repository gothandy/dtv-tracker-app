<template>
  <div class="elr-wrap">

    <p v-if="loading" class="elr-empty">Loading…</p>
    <p v-else-if="error" class="elr-empty elr-empty--error">{{ error }}</p>
    <p v-else-if="!entries.length" class="elr-empty">No entries found</p>

    <template v-else>
      <div v-if="allowSelect" class="elr-select-bar">
        <button class="elr-select-btn" @click="selectAll">Select all</button>
        <button class="elr-select-btn" @click="deselectAll">Deselect all</button>
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
            @change="onSelect(e.id, !selected.includes(e.id))"
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
import type { EntryListItemResponse } from '../../../../types/api-responses'
import EntryListItem from './EntryListItem.vue'
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

function onSelect(id: number, val: boolean) {
  const next = val
    ? [...props.selected, id]
    : props.selected.filter(x => x !== id)
  emit('update:selected', next)
}

function selectAll() {
  emit('update:selected', props.entries.map(e => e.id))
}

function deselectAll() {
  emit('update:selected', [])
}
</script>

<style scoped>
.elr-wrap {
  background: var(--color-dtv-sand-light);
}

.elr-empty {
  padding: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.elr-empty--error {
  color: var(--color-dtv-dirt);
}

.elr-select-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-dtv-light);
}

.elr-select-btn {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--color-dtv-green);
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.elr-select-btn:hover { color: var(--color-dtv-green-dark); }

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
