<template>
  <div class="wc-section">
    <h3>Activity</h3>
    <div v-if="!shuffled.length" class="wc-empty">No data yet.</div>
    <div v-else class="wc-cloud">
      <span
        v-for="tag in shuffled"
        :key="tag.label"
        class="wc-tag"
        :style="{ fontSize: tagSize(tag.hours) + 'rem' }"
        :title="tag.hours + 'h'"
      >{{ shortLabel(tag.label) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TagHoursItem } from '../../../types/api-responses'

const props = defineProps<{ tags: TagHoursItem[] }>()

// Sort by hours (for sizing), then shuffle so layout varies on each load
const shuffled = computed(() => {
  const sorted = [...props.tags].sort((a, b) => b.hours - a.hours).slice(0, 20)
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]]
  }
  return sorted
})

function tagSize(hours: number): number {
  const sorted = [...props.tags].sort((a, b) => b.hours - a.hours)
  const max = sorted[0]?.hours || 1
  const min = sorted[sorted.length - 1]?.hours || 1
  if (max === min) return 1.1
  const t = (hours - min) / (max - min)
  return Math.round((0.8 + t * 1.2) * 10) / 10
}

function shortLabel(label: string): string {
  const parts = label.split(':')
  return parts[parts.length - 1]
}
</script>

<style scoped>
.wc-section {
  background: white;
  padding: 1rem 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
  height: 100%;
  box-sizing: border-box;
}

.wc-section h3 { font-size: 1rem; font-weight: 700; color: #333; margin: 0 0 0.75rem; }

.wc-empty { color: #777; font-size: 0.9rem; }

.wc-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: baseline;
}

.wc-tag {
  color: #4FAF4A;
  font-weight: 600;
  line-height: 1.3;
  cursor: default;
}
</style>
