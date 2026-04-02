<template>
  <div v-if="fyData.length > 0" class="fbc-section">
    <h3>Hours by year</h3>
    <div class="fbc-chart">
      <button
        v-for="fy in fyData"
        :key="fy.key"
        :class="['fbc-row', { selected: modelValue === fy.key }]"
        @click="emit('update:modelValue', fy.key)"
      >
        <span class="fbc-label">{{ fy.label }}</span>
        <div class="fbc-track">
          <div class="fbc-actual" :style="{ width: fy.pct + '%' }"></div>
        </div>
        <span class="fbc-hours">{{ fy.hours }}h</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { SessionResponse } from '../../../types/api-responses'

const props = defineProps<{
  sessions: SessionResponse[]
  modelValue: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const fyData = computed(() => {
  const map: Record<string, number> = {}
  for (const s of props.sessions) {
    if (!s.financialYear?.startsWith('FY')) continue
    map[s.financialYear] = (map[s.financialYear] || 0) + (s.hours || 0)
  }
  const keys = Object.keys(map).sort()
  const max = Math.max(...Object.values(map), 1)
  return keys.map(key => {
    const startYear = parseInt(key.replace('FY', ''))
    return {
      key,
      label: `${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`,
      hours: Math.round(map[key] * 10) / 10,
      pct: Math.round((map[key] / max) * 100)
    }
  })
})

// Auto-select last FY (second most recent) on load, falling back to most recent
watch(fyData, data => {
  if (data.length > 0 && !props.modelValue) {
    const defaultFy = data.length >= 2 ? data[data.length - 2] : data[data.length - 1]
    emit('update:modelValue', defaultFy.key)
  }
}, { immediate: true })
</script>

<style scoped>
.fbc-section {
  background: var(--color-white);
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.5rem;
}

.fbc-section h3 { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0 0 0.75rem; }

.fbc-chart { display: flex; flex-direction: column; gap: 0.25rem; }

.fbc-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.fbc-row:hover { background: var(--color-surface-hover); }

.fbc-row.selected {
  background: var(--color-green-tint);
}

.fbc-row.selected .fbc-label,
.fbc-row.selected .fbc-hours { color: var(--color-text); font-weight: 700; }

.fbc-label { width: 3rem; font-size: 0.85rem; color: var(--color-text-label); flex-shrink: 0; }

.fbc-track {
  flex: 1;
  height: 12px;
  background: var(--color-surface-subtle);
}

.fbc-actual { height: 100%; background: var(--color-dtv-green); }

.fbc-hours { width: 3.5rem; font-size: 0.85rem; color: var(--color-text-label); text-align: right; flex-shrink: 0; }
</style>
