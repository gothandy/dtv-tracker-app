<template>
  <div class="dtv-modal-overlay" @click.self="emit('close')">
    <div class="dtv-modal">
      <div class="dtv-modal-header">
        <span class="dtv-modal-title">Upload photos for…</span>
        <button class="dtv-modal-close" @click="emit('close')">×</button>
      </div>
      <ul class="upm-entry-list">
        <li
          v-for="entry in entries"
          :key="entry.id"
          class="upm-entry-row"
          @click="emit('select', entry.id)"
        >
          <span>{{ entry.volunteerName ?? 'Unknown' }}</span>
          <span v-if="entry.checkedIn" class="upm-checked">✓</span>
        </li>
      </ul>
      <div class="dtv-modal-footer">
        <AppButton label="Cancel" @click="emit('close')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../../components/AppButton.vue'
import type { EntryResponse } from '../../../../types/api-responses'

defineProps<{
  entries: EntryResponse[]
}>()

const emit = defineEmits<{
  close: []
  select: [entryId: number]
}>()
</script>

<style scoped>
.upm-entry-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.upm-entry-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
}
.upm-entry-row:hover { background: var(--color-surface-hover); }

.upm-checked { color: var(--color-dtv-green); font-weight: bold; }
</style>
