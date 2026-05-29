<template>
  <select :value="modelValue" :disabled="disabled" class="fy-select" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessionListStore } from '../stores/sessionList'
import { fyKeyToLabel } from '../utils/entitySessionTotals'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  /** When set, replaces the default session-based FY list (e.g. projects list). */
  options?: { value: string; label: string }[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const sessionsStore = useSessionListStore()

const options = computed(() => {
  if (props.options?.length) return props.options
  const fyKeys = [...new Set(sessionsStore.sessions.map(s => s.financialYear))]
    .filter(k => k && k.startsWith('FY'))
    .sort()
  return [
    { value: 'all', label: 'All FY' },
    ...fyKeys.map(k => ({ value: k, label: fyKeyToLabel(k) })),
    { value: 'rolling', label: 'Rolling' },
    { value: 'future', label: 'Future' },
  ]
})
</script>

<style scoped>
.fy-select {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-white);
  cursor: pointer;
}
</style>
