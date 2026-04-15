<template>
  <div class="ela-bar">
    <span class="ela-totals">
      {{ entries.length }} {{ entries.length === 1 ? 'entry' : 'entries' }}
      <template v-if="totalHours > 0"> · {{ totalHours }} hours</template>
    </span>
    <span v-if="selected.length" class="ela-selected">
      {{ selected.length }} selected
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EntryListItemResponse } from '../../../../types/api-responses'

const props = defineProps<{
  entries: EntryListItemResponse[]
  selected: number[]
}>()

const totalHours = computed(() =>
  Math.round(props.entries.reduce((sum, e) => sum + e.hours, 0) * 10) / 10
)
</script>

<style scoped>
.ela-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--color-dtv-light);
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.ela-selected {
  font-weight: 600;
  color: var(--color-text);
}
</style>
