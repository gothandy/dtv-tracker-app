<template>
  <div class="wc-section">
    <div v-if="!shuffled.length" class="wc-empty">No data yet.</div>
    <div v-else class="wc-cloud">
      <span
        v-for="tag in shuffled"
        :key="tag.label"
        class="wc-tag"
        :class="{ 'wc-tag--clickable': tag.termGuid, 'wc-tag--selected': tag.termGuid && tag.termGuid === selected }"
        :data-depth="tag.depth"
        :style="{ fontSize: tagSize(tag.hours) + 'rem', marginTop: tag.mt + 'px' }"
        :title="tag.label + ' — ' + tag.hours + 'h'"
        @click="tag.termGuid && emit('select', tag.termGuid)"
      >{{ shortLabel(tag.label) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TagHoursItem } from '../../../types/api-responses'

const props = withDefaults(defineProps<{ tags: TagHoursItem[], selected?: string, height?: string }>(), { height: '350px' })
const height = computed(() => props.height)
const emit = defineEmits<{ select: [termGuid: string] }>()

// Sort by hours (for sizing), shuffle for layout variety, add random vertical offset
// Dividing by font size naturally gives small tags more jitter, large tags less
const shuffled = computed(() => {
  const sorted = [...props.tags].sort((a, b) => b.hours - a.hours).slice(0, 20)
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]]
  }
  return sorted.map(tag => ({ ...tag, mt: 0 }))
})

function tagSize(hours: number): number {
  const sorted = [...props.tags].sort((a, b) => b.hours - a.hours)
  const max = sorted[0]?.hours || 1
  const min = sorted[sorted.length - 1]?.hours || 1
  if (max === min) return 1.2
  const t = (hours - min) / (max - min)
  return Math.round((0.75 + t * 2.05) * 10) / 10  // 0.75rem – 2.8rem
}

function shortLabel(label: string): string {
  const parts = label.split(':')
  return parts[parts.length - 1].trim()
}
</script>

<style scoped>
.wc-section {
  padding: 0 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (min-width: 768px) {
  .wc-section { height: v-bind(height); }
}

.wc-empty { color: var(--color-text-muted); font-size: 0.9rem; text-align: center; }

.wc-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  align-items: center;
  justify-content: center;
}

.wc-tag {
  color: var(--color-dtv-sand-dark);
  font-weight: 600;
  line-height: 1;
  cursor: default;
  padding: 8px;
}

.wc-tag[data-depth="0"] { color: var(--color-dtv-green); }
.wc-tag[data-depth="1"] { color: var(--color-dtv-gold); }

.wc-tag--clickable { cursor: pointer; }

.wc-tag--clickable:hover,
.wc-tag--selected {
  color: var(--color-dtv-light);
  background: var(--color-dtv-sand-dark);
}

.wc-tag--clickable[data-depth="0"]:hover,
.wc-tag--selected[data-depth="0"] { background: var(--color-dtv-green); }

.wc-tag--clickable[data-depth="1"]:hover,
.wc-tag--selected[data-depth="1"] { background: var(--color-dtv-gold); }
</style>
