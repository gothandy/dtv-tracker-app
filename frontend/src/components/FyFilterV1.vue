<template>
  <div class="fy-filter">
    <button class="fy-btn" @click.stop="open = !open">
      <img src="/svg/filter.svg" width="16" height="16" alt="" style="filter: brightness(0) invert(1)" />
      <span>{{ selectedLabel }}</span>
    </button>
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
import { useSessionsStore } from '../stores/sessions'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const sessionsStore = useSessionsStore()
const open = ref(false)

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

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.fy-filter { position: relative; }

.fy-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: #4FAF4A;
  color: white;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.fy-btn:hover { background: #3d9a3d; }

.fy-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  min-width: 120px;
  z-index: 50;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
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
  color: #333;
}

.fy-option:hover { background: #f5f5f5; }
.fy-option.active { color: #4FAF4A; font-weight: 600; }
</style>
