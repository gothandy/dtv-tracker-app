<template>
  <div class="elf-bar">
    <input
      v-model="q"
      class="elf-input"
      type="search"
      placeholder="Search notes…"
      @input="onTextInput"
    />
    <select v-model="accompanyingAdult" class="elf-select" @change="emitFiltered">
      <option value="">All</option>
      <option value="notempty">Has Accompanying Adult</option>
      <option value="empty">No Accompanying Adult</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface EntryFilterParams {
  q: string
  accompanyingAdult: string
}

const emit = defineEmits<{ filtered: [params: EntryFilterParams] }>()

const q = ref('')
const accompanyingAdult = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onTextInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(emitFiltered, 300)
}

function emitFiltered() {
  emit('filtered', { q: q.value, accompanyingAdult: accompanyingAdult.value })
}
</script>

<style scoped>
.elf-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-dtv-light);
  flex-wrap: wrap;
}

.elf-input {
  flex: 1;
  min-width: 10rem;
  background: var(--color-dtv-sand);
  border: none;
  color: var(--color-text);
  padding: 0.4rem 0.6rem;
  font-family: inherit;
  font-size: 0.9rem;
}

.elf-select {
  background: var(--color-dtv-sand);
  border: none;
  color: var(--color-text);
  padding: 0.4rem 0.6rem;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}
</style>
