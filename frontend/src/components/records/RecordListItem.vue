<template>
  <div class="rli-row" :class="[{ 'rli-row--selected': selected }, stateStyle ? `rli-row--${stateStyle}` : '']">
    <div class="rli-content">
      <div class="rli-left">
        <span class="rli-type">{{ record.type }}</span>
        <span class="rli-profile">{{ record.profileName ?? 'Unknown profile' }}</span>
        <span v-if="record.notes" class="rli-notes">{{ record.notes }}</span>
      </div>
      <div class="rli-right">
        <span class="rli-state" :class="stateClass">{{ record.status }}</span>
        <span v-if="record.date" class="rli-date">{{ formatDate(record.date) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RecordListItemResponse } from '../../../../types/api-responses'

/**
 * A State's style (Records v2 PR 2, #324; the States list's BeforeStyle and AfterStyle): Active
 * (green), Info (gold) or Warn (dirt); none = sand. Shown as a left border (as Entries) and the
 * State's text, chosen on /sandbox/record-list-item.
 */
export type RecordStateStyle = 'active' | 'info' | 'warn'

const props = defineProps<{
  record: RecordListItemResponse
  selected?: boolean
  stateStyle?: RecordStateStyle
}>()

/** Without a style (until PR 2): Invited and Accepted show green; the rest show black. */
const isCurrent = computed(() => props.record.status === 'Invited' || props.record.status === 'Accepted')

const stateClass = computed(() => {
  if (!props.stateStyle) return { 'rli-state--current': isCurrent.value }
  return `rli-state--${props.stateStyle}`
})

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

/* Left: Type, Profile (and Notes); right: State and Date */
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
.rli-state--current {
  color: var(--color-dtv-green);
}

/* State styles: a left border and the State's text */
.rli-row--active { border-left-color: var(--color-dtv-green); }
.rli-row--info   { border-left-color: var(--color-dtv-gold); }
.rli-row--warn   { border-left-color: var(--color-dtv-dirt); }
.rli-state--active { color: var(--color-dtv-green-dark); }
.rli-state--info   { color: var(--color-dtv-gold-dark); }
.rli-state--warn   { color: var(--color-dtv-dirt); }

.rli-profile,
.rli-date,
.rli-notes {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
