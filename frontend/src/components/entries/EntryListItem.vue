<template>
  <div
    class="eli-row"
    :class="{
      'eli-row--checked': entry.checkedIn,
      'eli-row--selected': selected,
      'eli-row--cancelled': !!entry.cancelled,
      'eli-row--error': hasEntryError,
    }"
  >
    <component
      :is="to ? RouterLink : 'div'"
      v-bind="to ? { to } : {}"
      class="eli-content"
    >
      <div class="eli-left">
        <span class="eli-name">{{ entry.volunteerName ?? 'Unknown' }}</span>
        <span
          v-for="icon in icons"
          :key="icon.alt"
          class="eli-icon"
          :class="icon.color ? 'icon-' + icon.color : ''"
          :title="icon.alt"
        >
          <img :src="'/icons/' + icon.icon" :alt="icon.alt" />
        </span>
      </div>
      <div class="eli-right">
        <span class="eli-session">{{ formatDate(entry.date) }} {{ entry.groupName }}</span>
      </div>
    </component>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import type { EntryListItemResponse } from '../../../../types/api-responses'
import { iconsForEntry } from '../../utils/labelIcons'
import { isEntryError } from '../../utils/entryQuality'

const props = defineProps<{
  entry: EntryListItemResponse
  to?: RouteLocationRaw
  selected?: boolean
}>()

const hasEntryError = computed(() => isEntryError(props.entry))

const icons = computed(() =>
  iconsForEntry({
    trackerAccess: props.entry.trackerAccess,
    isMember: props.entry.isMember,
    isGroup: props.entry.isGroup,
    cardStatus: props.entry.cardStatus,
    isChild: !!props.entry.accompanyingAdultId,
    labels: props.entry.labels,
    hasProfileWarning: props.entry.hasProfileWarning,
    eventbriteAttendeeId: props.entry.eventbriteAttendeeId,
  })
)

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.eli-row {
  display: flex;
  align-items: stretch;
  background: var(--color-dtv-sand);
  border-left: 4px solid transparent;
}
.eli-row--checked {
  border-left-color: var(--color-dtv-green);
}
.eli-row--selected {
  background: var(--color-dtv-light);
}
.eli-row--cancelled {
  opacity: 0.5;
}
.eli-row--cancelled .eli-name {
  text-decoration: line-through;
}
.eli-row--error:not(.eli-row--cancelled) {
  border-left-color: var(--color-dtv-dirt);
}

.eli-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  /* Align text with px-6 content; border-left is outside this box */
  padding-left: calc(1.5rem - 4px);
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: var(--color-text);
}
.eli-content:hover {
  background: var(--color-dtv-sand-dark);
}

.eli-left {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  flex: 2;
}

.eli-name {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex-shrink: 1;
}

.eli-icon {
  display: inline-flex;
  align-items: flex-start;
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  align-self: flex-start;
}
.eli-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.eli-right {
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: right;
}

.eli-session {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}
</style>
