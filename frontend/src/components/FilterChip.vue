<template>
  <button class="filter-chip" :aria-label="`Clear ${label} filter`" @click="emit('clear')">
    {{ label }}
    <img src="/icons/close.svg" width="10" height="10" alt="" class="svg-white" />
  </button>
</template>

<script setup lang="ts">
/** A filter set from a link (e.g. one Profile): its name, and a close icon to clear it. Entries and Records filters. */
defineProps<{ label: string }>()
const emit = defineEmits<{ clear: [] }>()
</script>

<style scoped>
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--color-dtv-dirt);
  color: var(--color-white);
  border: none;
  border-radius: 3px;
  padding: 0.25rem 0.6rem;
  font-family: var(--font-head);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}
.filter-chip:hover {
  opacity: 0.85;
}
</style>
