<template>
  <div class="rli-row" :class="{ 'rli-row--selected': selected }">
    <div class="rli-content">
      <div class="rli-left">
        <span class="rli-title" :class="{ 'rli-title--current': isCurrent }">{{ record.type }} {{ record.status }}</span>
        <span v-if="record.notes" class="rli-notes">{{ record.notes }}</span>
      </div>
      <div class="rli-right">
        <span class="rli-profile">{{ record.profileName ?? 'Unknown profile' }}</span>
        <span v-if="record.date" class="rli-date">{{ formatDate(record.date) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecordListItemResponse } from '../../../../types/api-responses'

const props = defineProps<{
  record: RecordListItemResponse
  selected?: boolean
}>()

/** Invited and Accepted show green; Declined and Expired show black (#322). */
const isCurrent = computed(() => props.record.status === 'Invited' || props.record.status === 'Accepted')

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.rli-row {
  display: flex;
  align-items: stretch;
  background: var(--color-dtv-sand);
  border-left: 4px solid transparent;
}
.rli-row--selected {
  background: var(--color-dtv-light);
}

.rli-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  /* Align text with px-6 content; border-left is outside this box */
  padding-left: calc(1.5rem - 4px);
  flex: 1;
  min-width: 0;
  color: var(--color-text);
}
.rli-content:hover {
  background: var(--color-dtv-sand-dark);
}

.rli-left {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
  flex: 2;
}

.rli-title {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--color-text);
}
.rli-title--current {
  color: var(--color-dtv-green);
}

.rli-notes {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.rli-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: right;
}

.rli-profile {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
