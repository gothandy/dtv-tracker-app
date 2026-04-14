<template>
  <div class="ri-card">
    <template v-if="allowToggleRegular">
      <span v-if="working" class="ri-spinner" />
      <input
        v-else
        type="checkbox"
        class="ri-checkbox"
        :checked="isRegular"
        @change="onToggle"
      />
    </template>
    <input
      v-else-if="isRegular"
      type="checkbox"
      class="ri-checkbox ri-checkbox--static"
      checked
      tabindex="-1"
      readonly
    />

    <RouterLink :to="linkTo" class="ri-name">{{ name }}</RouterLink>
    <strong class="ri-hours">{{ formatHours(hours) }}h</strong>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  name: string
  linkTo: RouteLocationRaw
  hours: number
  isRegular: boolean
  regularId?: number
  allowToggleRegular?: boolean
  working?: boolean
}>()

const emit = defineEmits<{
  addRegular: []
  removeRegular: []
}>()

function formatHours(h: number): string {
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

function onToggle(event: Event) {
  const isAdding = (event.target as HTMLInputElement).checked
  if (isAdding) emit('addRegular')
  else emit('removeRegular')
}
</script>

<style scoped>
.ri-card {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-dtv-sand);
  padding: 0.5rem 0.75rem;
}

.ri-checkbox {
  accent-color: var(--color-dtv-green);
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  cursor: pointer;
}
.ri-checkbox--static {
  pointer-events: none;
  cursor: default;
}

.ri-spinner {
  display: block;
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  border: 2px solid var(--color-dtv-sand-dark);
  border-top-color: var(--color-dtv-green);
  border-radius: 50%;
  animation: ri-spin 0.7s linear infinite;
}
@keyframes ri-spin { to { transform: rotate(360deg); } }

.ri-name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text);
  text-decoration: none;
}
.ri-name:hover { text-decoration: underline; }

.ri-hours {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-dtv-gold-dark);
  white-space: nowrap;
}
</style>
