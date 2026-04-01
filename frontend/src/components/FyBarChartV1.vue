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

// Auto-select most recent FY on load
watch(fyData, data => {
  if (data.length > 0 && !props.modelValue) {
    emit('update:modelValue', data[data.length - 1].key)
  }
}, { immediate: true })
</script>

<style scoped>
.fbc-section {
  background: white;
  padding: 1rem 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.fbc-section h3 { font-size: 1rem; font-weight: 700; color: #333; margin: 0 0 0.75rem; }

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

.fbc-row:hover { background: #f5f5f5; }

.fbc-row.selected {
  background: #eef8ee;
}

.fbc-row.selected .fbc-label,
.fbc-row.selected .fbc-hours { color: #333; font-weight: 700; }

.fbc-label { width: 3rem; font-size: 0.85rem; color: #666; flex-shrink: 0; }

.fbc-track {
  flex: 1;
  height: 12px;
  background: #e0e0e0;
}

.fbc-actual { height: 100%; background: #4FAF4A; }

.fbc-hours { width: 3.5rem; font-size: 0.85rem; color: #666; text-align: right; flex-shrink: 0; }
</style>
