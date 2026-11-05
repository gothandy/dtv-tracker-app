<template>
  <button
    class="rch-chip"
    :class="record.style ? [`rch-chip--${record.style}`, 'rch-chip--styled'] : ''"
    :disabled="disabled"
  >
    {{ record.type }} · {{ record.label }}<template v-if="record.date"> · {{ formatDate(record.date) }}</template>
  </button>
</template>

<script setup lang="ts">
import type { RecordStateStyle } from '../../../../types/record-state'

/**
 * One Record as a chip: "{Type} · {label} · {Date}" (the Profile page's Records), in its State's
 * style (#322 §3). Click to edit unless disabled. Refined on /sandbox/record-chip.
 */
defineProps<{
  record: { type: string; label: string; style?: RecordStateStyle; date?: string }
  disabled?: boolean
}>()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.rch-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  border: none;
  background: var(--color-dtv-sand);
  color: var(--color-text);
  cursor: default;
  appearance: none;
}
.rch-chip:not(:disabled) {
  cursor: pointer;
}
.rch-chip:not(:disabled):hover {
  opacity: 0.8;
}

/* State styles (as RecordListItem): a left border and the text */
.rch-chip--styled { border-left: 4px solid transparent; padding-left: calc(0.6rem - 4px); }
.rch-chip--active { border-left-color: var(--color-dtv-green); color: var(--color-dtv-green-dark); }
.rch-chip--info   { border-left-color: var(--color-dtv-gold);  color: var(--color-dtv-gold-dark); }
.rch-chip--warn   { border-left-color: var(--color-dtv-dirt);  color: var(--color-dtv-dirt); }
</style>
