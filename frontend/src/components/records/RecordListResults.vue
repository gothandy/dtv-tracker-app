<template>
  <div class="rlr-wrap">

    <LoadingSpinner v-if="loading" />
    <p v-else-if="error" class="rlr-empty rlr-empty--error">{{ error }}</p>
    <p v-else-if="!records.length" class="rlr-empty">No records found</p>

    <template v-else>
      <div v-if="allowSelect" class="list-select-row">
        <button class="list-select-all" @click="toggleSelectAll">
          {{ allSelected ? 'Deselect all' : 'Select all' }}
        </button>
      </div>

      <div class="rlr-list">
        <div
          v-for="r in records"
          :key="r.id"
          class="rlr-item"
          :class="{ 'rlr-item--selectable': allowSelect }"
        >
          <input
            v-if="allowSelect"
            type="checkbox"
            class="rlr-checkbox"
            :checked="selected.includes(r.id)"
            @change="toggle(r.id)"
          />
          <button v-if="allowEdit" class="rlr-edit-btn" @click="emit('editRecord', r)">
            <RecordListItem :record="r" :selected="selected.includes(r.id)" />
          </button>
          <RecordListItem v-else :record="r" :selected="selected.includes(r.id)" />
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecordListItemResponse } from '../../../../types/api-responses'
import RecordListItem from './RecordListItem.vue'
import LoadingSpinner from '../LoadingSpinner.vue'

const props = defineProps<{
  records: RecordListItemResponse[]
  loading: boolean
  error: string | null
  selected: number[]
  allowSelect?: boolean
  allowEdit?: boolean
}>()

const emit = defineEmits<{
  'update:selected': [ids: number[]]
  'editRecord': [record: RecordListItemResponse]
}>()

const allSelected = computed(() =>
  props.records.length > 0 && props.records.every(r => props.selected.includes(r.id))
)

function toggleSelectAll() {
  emit('update:selected', allSelected.value ? [] : props.records.map(r => r.id))
}

function toggle(id: number) {
  const next = props.selected.includes(id)
    ? props.selected.filter(x => x !== id)
    : [...props.selected, id]
  emit('update:selected', next)
}
</script>

<style scoped>
.rlr-empty {
  padding: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.rlr-empty--error {
  color: var(--color-dtv-dirt);
}

.rlr-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rlr-item {
  position: relative;
}

.rlr-checkbox {
  position: absolute;
  left: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.rlr-item--selectable :deep(.rli-content) {
  padding-left: calc(1.5rem + 1.25rem + 0.5rem);
}

.rlr-edit-btn {
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}
</style>
