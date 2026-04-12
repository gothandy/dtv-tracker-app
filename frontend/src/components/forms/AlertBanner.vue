<template>
  <div class="alert-banner" :class="`alert-banner--${type}`">
    <img :src="`/icons/status/${iconName}.svg`" class="alert-banner-icon" aria-hidden="true" width="16" height="16" alt="" />
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

const iconName = computed(() => {
  if (props.type === 'error') return 'error'
  if (props.type === 'info')  return 'info'
  return 'warning'
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
  width: 1rem;
  height: 1rem;
  margin-top: 0.25rem; /* align with first line of text */
}

/* Colour each status icon to match its text colour */
.alert-banner--warning .alert-banner-icon {
  filter: brightness(0) saturate(100%) invert(28%) sepia(50%) saturate(800%) hue-rotate(20deg) brightness(90%);
}
.alert-banner--error .alert-banner-icon {
  filter: brightness(0) saturate(100%) invert(22%) sepia(50%) saturate(700%) hue-rotate(320deg) brightness(90%);
}
.alert-banner--info .alert-banner-icon {
  filter: brightness(0);
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
