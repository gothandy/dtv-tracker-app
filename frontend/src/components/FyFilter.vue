<template>
  <div class="fy-filter" ref="el">
    <AppButton icon="filter" mode="icon-text" :label="selectedLabel" @click.stop="toggleOpen" />
    <div v-if="open" class="fy-menu">
      <button
        v-for="opt in options"
        :key="opt.value"
        :class="['fy-option', { active: modelValue === opt.value }]"
        @click="select(opt.value)"
      >{{ opt.label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppButton from './AppButton.vue'
import { useSessionsStore } from '../stores/sessions'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const sessionsStore = useSessionsStore()
const el = ref<HTMLElement | null>(null)
const open = ref(false)

function toggleOpen() {
  if (!open.value) {
    el.value?.dispatchEvent(new CustomEvent('dropdown-opened', { bubbles: true }))
  }
  open.value = !open.value
}

function fyKeyToLabel(fyKey: string): string {
  const startYear = parseInt(fyKey.replace('FY', ''))
  return `FY ${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`
}

const options = computed(() => {
  const fyKeys = [...new Set(sessionsStore.sessions.map(s => s.financialYear))]
    .filter(k => k && k.startsWith('FY'))
    .sort()
  return [
    { value: 'all', label: 'All' },
    ...fyKeys.map(k => ({ value: k, label: fyKeyToLabel(k) }))
  ]
})

const selectedLabel = computed(() =>
  options.value.find(o => o.value === props.modelValue)?.label ?? 'All'
)

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

function onClickOutside(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.fy-filter')) open.value = false
}

function onDropdownOpened(e: Event) {
  if (el.value && !el.value.contains(e.target as Node)) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('dropdown-opened', onDropdownOpened)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('dropdown-opened', onDropdownOpened)
})
</script>

<style scoped>
.fy-filter { position: relative; }

.fy-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  min-width: 120px;
  z-index: 50;
  box-shadow: var(--shadow-md);
}

.fy-option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--color-text);
}

.fy-option:hover { background: var(--color-surface-hover); }
.fy-option.active { color: var(--color-dtv-green); font-weight: 600; }
</style>
