<template>
  <div class="alert-banner" :class="`alert-banner--${type}`">
    <img
      :src="`/icons/status/${iconName}.svg`"
      class="alert-banner-icon"
      :class="iconTintClass"
      aria-hidden="true"
      width="16"
      height="16"
      alt=""
    />
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

/** Global helpers from `icons.css` — match banner text / background. */
const iconTintClass = computed(() => {
  if (props.type === 'error') return 'svg-white'
  if (props.type === 'info') return 'svg-black'
  return 'svg-dirt-dark'
})
</script>

<style scoped>
.alert-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
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

.alert-banner-message {
  flex: 1;
  min-width: 0;
}

/* Warning — dirt tint (general caution; same family as profile/entry highlights) */
.alert-banner--warning {
  background: var(--color-dtv-dirt-light);
  color: var(--color-dtv-dirt-dark);
}

/* Error — solid dirt + light text (matches FlashMessage error, stronger than warning) */
.alert-banner--error {
  background: var(--color-dtv-dirt);
  color: var(--color-dtv-light);
}

/* Info */
.alert-banner--info {
  background: var(--color-dtv-sand-light);
  color: var(--color-dtv-dark);
}
</style>
