<template>
  <div class="alert-banner" :class="`alert-banner--${type}`">
    <span class="alert-banner-icon" aria-hidden="true">{{ icon }}</span>
    <span class="alert-banner-message">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  message: string
  type?: 'warning' | 'error' | 'info'
}>(), {
  type: 'warning',
})

const icon = computed(() => {
  if (props.type === 'error') return '✕'
  if (props.type === 'info')  return 'ℹ'
  return '⚠'
})
</script>

<style scoped>
.alert-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  border: 2px solid;
  font-size: 0.9rem;
  line-height: 1.5;
  font-weight: 500;
}

.alert-banner-icon {
  flex-shrink: 0;
  font-size: 1rem;
  line-height: 1.5;
}

.alert-banner-message {
  flex: 1;
  min-width: 0;
}

/* Warning */
.alert-banner--warning {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #78350f;
}

/* Error */
.alert-banner--error {
  border-color: var(--color-dtv-dirt);
  background: var(--color-dtv-dirt-light);
  color: var(--color-dtv-dirt-dark);
}

/* Info */
.alert-banner--info {
  border-color: var(--color-dtv-sand-dark);
  background: var(--color-dtv-sand-light);
  color: var(--color-dtv-dark);
}
</style>
