<template>
  <div class="rli-row" :class="[{ 'rli-row--selected': selected }, colour && colourStyle !== 'text' ? `rli-row--${colourStyle}-${colour}` : '']">
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

/** A State's colour (Records v2 PR 2, #324): Green, Amber (brand gold) or Red; none = sand. */
export type RecordColour = 'green' | 'amber' | 'red'
/** How the colour shows; being chosen on /sandbox/record-list-item, then one stays. */
export type RecordColourStyle = 'text' | 'border' | 'background'

const props = withDefaults(defineProps<{
  record: RecordListItemResponse
  selected?: boolean
  colour?: RecordColour
  colourStyle?: RecordColourStyle
}>(), {
  colourStyle: 'text',
})

/** Without a colour (until PR 2): Invited and Accepted show green; the rest show black. */
const isCurrent = computed(() => props.record.status === 'Invited' || props.record.status === 'Accepted')

const stateClass = computed(() => {
  if (!props.colour) return { 'rli-state--current': isCurrent.value }
  return props.colourStyle === 'text' ? `rli-state--${props.colour}` : ''
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

/* State colours (PR 2 mock-up): text, left border, or background */
.rli-state--green { color: var(--color-dtv-green-dark); }
.rli-state--amber { color: var(--color-dtv-gold-dark); }
.rli-state--red   { color: var(--color-dtv-dirt); }

.rli-row--border-green { border-left-color: var(--color-dtv-green); }
.rli-row--border-amber { border-left-color: var(--color-dtv-gold); }
.rli-row--border-red   { border-left-color: var(--color-dtv-dirt); }

.rli-row--background-green { background: var(--color-dtv-green); }
.rli-row--background-amber { background: var(--color-dtv-gold-light); }
.rli-row--background-red   { background: var(--color-dtv-dirt); }
.rli-row--background-green .rli-content,
.rli-row--background-red .rli-content { color: var(--color-white); }
.rli-row--background-green .rli-content :is(.rli-profile, .rli-date, .rli-notes),
.rli-row--background-red .rli-content :is(.rli-profile, .rli-date, .rli-notes) { color: var(--color-white); }
.rli-row--background-green .rli-content:hover { background: var(--color-dtv-green-dark); }
.rli-row--background-amber .rli-content:hover { background: var(--color-dtv-gold); }
.rli-row--background-red .rli-content:hover { background: var(--color-dtv-dirt-dark); }

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
