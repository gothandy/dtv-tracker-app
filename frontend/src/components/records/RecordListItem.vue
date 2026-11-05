<template>
  <div class="rli-row" :class="[{ 'rli-row--selected': selected }, record.style ? `rli-row--${record.style}` : '']">
    <div class="rli-content">
      <div class="rli-main">
        <div class="rli-left">
          <span class="rli-type" :class="record.style ? `rli-text--${record.style}` : ''">{{ record.type }}</span>
          <span class="rli-profile">{{ record.profileName ?? 'Unknown profile' }}</span>
        </div>
        <div class="rli-right">
          <span class="rli-state" :class="record.style ? `rli-text--${record.style}` : ''">{{ record.label }}</span>
          <span v-if="record.date" class="rli-date">{{ formatDate(record.date) }}</span>
        </div>
      </div>
      <span v-if="record.notes" class="rli-notes">{{ record.notes }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RecordListItemResponse } from '../../../../types/api-responses'

/** One Record on the Records page: its label and style come with it (#322 §3). */
defineProps<{
  record: RecordListItemResponse
  selected?: boolean
}>()

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
  flex-direction: column;
  gap: 0.15rem;
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

/* Top: Type and the Profile's name (left), State and Date (right); Notes below, across the full width */
.rli-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}
.rli-left,
.rli-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.rli-left {
  flex: 2;
}
.rli-right {
  flex: 1;
  align-items: flex-end;
  text-align: right;
}

.rli-type,
.rli-state {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
/* State styles: a left border, and the title and State in the style's colour */
.rli-row--active { border-left-color: var(--color-dtv-green); }
.rli-row--info   { border-left-color: var(--color-dtv-gold); }
.rli-row--warn   { border-left-color: var(--color-dtv-dirt); }
.rli-text--active { color: var(--color-dtv-green-dark); }
.rli-text--info   { color: var(--color-dtv-gold-dark); }
.rli-text--warn   { color: var(--color-dtv-dirt); }

.rli-profile {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
/* Notes wrap onto further lines rather than being cut short */
.rli-notes {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}
.rli-date {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
