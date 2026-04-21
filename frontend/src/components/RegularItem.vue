<template>
  <button
    class="ri-card"
    :class="{ 'ri-card--regular': isRegular, 'ri-card--child': accompanyingAdultId !== undefined }"
    :disabled="working"
    @click="emit('edit')"
  >
    <span v-if="working" class="ri-spinner" />
    <span class="ri-name">{{ name }}</span>
    <strong class="ri-hours">{{ formatHours(hours) }}h</strong>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string
  hours: number
  isRegular: boolean
  regularId?: number
  accompanyingAdultId?: number
  working?: boolean
}>()

const emit = defineEmits<{
  edit: []
}>()

function formatHours(h: number): string {
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}
</script>

<style scoped>
.ri-card {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-dtv-sand);
  padding: 0.5rem 0.75rem;
  border: 2px solid transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.ri-card:hover { background: var(--color-dtv-sand-dark); }
.ri-card:disabled { opacity: 0.6; cursor: default; }

.ri-card--regular {
  background: var(--color-dtv-green);
  border-color: var(--color-dtv-green);
}
.ri-card--regular:hover { background: var(--color-dtv-green-dark); border-color: var(--color-dtv-green-dark); }
.ri-card--regular .ri-name { color: var(--color-dtv-light); }
.ri-card--regular .ri-hours { color: var(--color-dtv-light); }
.ri-card--child { border-style: dashed; }

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
}

.ri-hours {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-dtv-gold-dark);
  white-space: nowrap;
}
</style>
