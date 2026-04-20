<template>
  <div v-if="fyData.length > 0" class="fbc-section">
    <div class="fbc-chart">
      <button
        v-for="fy in fyData"
        :key="fy.key"
        :class="['fbc-row', { selected: modelValue === fy.key }]"
        @click="handleClick(fy.key)"
      >
        <span class="fbc-label">{{ fy.label }}</span>
        <div class="fbc-track">
          <div class="fbc-actual" :style="{ width: fy.pct + '%' }"></div>
        </div>
        <span class="fbc-hours">{{ fy.hours }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
interface SessionWithStats {
  financialYear: string
  stats: { hours: number }
}

const props = defineProps<{
  sessions: SessionWithStats[]
  modelValue: string
  minFy?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string]; clickSelected: [value: string] }>()

function handleClick(key: string) {
  if (props.modelValue === key) emit('clickSelected', key)
  else emit('update:modelValue', key)
}

const fyData = computed(() => {
  const map: Record<string, number> = {}
  for (const s of props.sessions) {
    if (!s.financialYear?.startsWith('FY')) continue
    map[s.financialYear] = (map[s.financialYear] || 0) + (s.stats.hours || 0)
  }
  const keys = Object.keys(map).sort().filter(k => !props.minFy || k >= props.minFy)
  const max = Math.max(...Object.values(map), 1)
  return keys.map(key => {
    const startYear = parseInt(key.replace('FY', ''))
    return {
      key,
      label: `${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`,
      hours: Math.round(map[key]),
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
/*
 * Component tokens (--fbc-*): semantic roles for this chart only. Defaults map to DTV
 * globals from main.css (@theme). Override on .fbc-section to experiment without touching
 * rules below — custom properties inherit to children.
 *
 * --fbc-surface          Card background
 * --fbc-text               Heading; selected row year + hours
 * --fbc-text-label         Default row year + hours
 * --fbc-bar                Hours bar (filled segment), default row (defaults to brand gold)
 * --fbc-filler             Track (empty segment), default row
 * --fbc-hover-bg           Rollover row background
 * --fbc-hover-bar          Hours bar on rollover
 * --fbc-hover-filler       Track on rollover
 * --fbc-hover-text         Year + hours on rollover
 * --fbc-selected-bg        Selected row background
 * --fbc-selected-bar       Hours bar when row is selected
 * --fbc-selected-filler    Track when row is selected (brand white / --color-dtv-light)
 */
.fbc-section {
  --fbc-surface: var(--color-dtv-sand);
  --fbc-text: var(--color-dtv-dark);
  --fbc-text-label: var(--color-dtv-dark);

  --fbc-bar: var(--color-dtv-gold);
  --fbc-filler: var(--color-dtv-light);

  --fbc-hover-bg: var(--color-dtv-light);
  --fbc-hover-bar: var(--color-dtv-gold);
  --fbc-hover-filler: var(--color-dtv-sand);
  --fbc-hover-text: var(--color-dtv-dark);

  --fbc-selected-bg: var(--color-dtv-sand);
  --fbc-selected-bar: var(--color-dtv-green);
  --fbc-selected-filler: var(--color-dtv-light);

  background: var(--fbc-surface);
  padding: 1rem 1.5rem;
}

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
  color: var(--fbc-text);
}

.fbc-row:hover {
  background: var(--fbc-hover-bg);
}

.fbc-row:hover .fbc-label,
.fbc-row:hover .fbc-hours {
  color: var(--fbc-hover-text);
}

.fbc-row:hover .fbc-track {
  background: var(--fbc-hover-filler);
}

.fbc-row:hover .fbc-actual {
  background: var(--fbc-hover-bar);
}

.fbc-row.selected {
  background: var(--fbc-selected-bg);
}

.fbc-row.selected .fbc-label,
.fbc-row.selected .fbc-hours {
  color: var(--fbc-text);
}

.fbc-label { width: 3rem; font-size: 0.85rem; color: var(--fbc-text-label); flex-shrink: 0; }

.fbc-track {
  flex: 1;
  height: 12px;
  background: var(--fbc-filler);
}

.fbc-row.selected .fbc-track {
  background: var(--fbc-selected-filler);
}

.fbc-actual { height: 100%; background: var(--fbc-bar); }

.fbc-row.selected .fbc-actual {
  background: var(--fbc-selected-bar);
}

.fbc-hours { width: 3.5rem; font-size: 0.85rem; color: var(--fbc-text-label); text-align: right; flex-shrink: 0; }
</style>
