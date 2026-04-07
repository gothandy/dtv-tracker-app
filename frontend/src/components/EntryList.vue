<template>
  <div class="entry-list">
    <div v-if="!entries.length" class="entry-list-empty">No entries yet.</div>
    <div v-else class="entry-list-rows">
      <EntryCard
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        :display-type="displayType"
        :allow-edit="allowEdit"
        :allow-cancel="allowCancel"
        :working="workingId === entry.id"
        @update="(e, c, h) => emit('update', e, c, h)"
        @cancel="(e) => emit('cancel', e)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import EntryCard from './EntryCard.vue'
import type { EntryItem } from '../types/entry'

defineProps<{
  entries: EntryItem[]
  displayType: 'session' | 'profile'
  allowEdit?: boolean
  allowCancel?: boolean
  workingId?: number | null
}>()

const emit = defineEmits<{
  'update': [entry: EntryItem, checkedIn: boolean, hours: number]
  'cancel': [entry: EntryItem]
}>()
</script>

<style scoped>
.entry-list-empty {
  font-size: 0.9rem;
  color: var(--color-text-faint);
  padding: 0.5rem 0;
}

.entry-list-rows {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
</style>
