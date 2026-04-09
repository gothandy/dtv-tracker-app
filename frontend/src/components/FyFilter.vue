<template>
  <select :value="modelValue" :disabled="disabled" class="fy-select" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessionsStore } from '../stores/sessions'

const props = defineProps<{ modelValue: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const sessionsStore = useSessionsStore()

function fyKeyToLabel(fyKey: string): string {
  const startYear = parseInt(fyKey.replace('FY', ''))
  return `FY ${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`
}

const options = computed(() => {
  const fyKeys = [...new Set(sessionsStore.sessions.map(s => s.financialYear))]
    .filter(k => k && k.startsWith('FY'))
    .sort()
  return [
    { value: 'all', label: 'All FY' },
    ...fyKeys.map(k => ({ value: k, label: fyKeyToLabel(k) })),
    { value: 'rolling', label: 'Rolling FY' },
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
