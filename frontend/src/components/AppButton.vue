<template>
  <button
    :type="type"
    :disabled="disabled || working"
    :aria-label="isIconOnly ? label : undefined"
    :aria-pressed="selected !== undefined ? selected : undefined"
    :aria-busy="working || undefined"
    class="app-btn"
    :class="{
      'app-btn--icon-only': isIconOnly,
      'app-btn--selected': selected,
      'app-btn--working': working,
    }"
    :style="colorStyle"
  >
    <!-- Working spinner replaces icon -->
    <span v-if="working" class="app-btn__spinner" aria-hidden="true" />
    <!-- Icon (when not working) -->
    <img
      v-else-if="icon"
      :src="`/icons/${icon}.svg`"
      class="app-btn__icon svg-white"
      aria-hidden="true"
    />
    <!-- Label — hidden when icon-only, sr-only on mobile for icon-responsive -->
    <span
      v-if="!isIconOnly"
      class="app-btn__label"
      :class="{ 'app-btn__label--responsive': icon && mode === 'icon-responsive' }"
    >{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  icon?: string
  mode?: 'icon-only' | 'icon-responsive' | 'icon-text'
  color?: string
  disabled?: boolean
  working?: boolean
  selected?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  mode: 'icon-text',
  type: 'button',
})

const isIconOnly = computed(() => !!props.icon && props.mode === 'icon-only')

// Only apply inline style when color is explicitly provided; CSS handles the default
const colorStyle = computed(() =>
  props.color ? { backgroundColor: props.color } : undefined
)
</script>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 2.5rem;
  padding: 0 1rem;
  background: var(--color-dtv-green);
  color: var(--color-white);
  border: none;
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Icon-only: square, no padding */
.app-btn--icon-only {
  padding: 0;
  width: 2.5rem;
}

.app-btn:hover:not(:disabled) {
  filter: brightness(0.9);
}

.app-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Keyboard focus and selected/active state share the same indicator */
.app-btn:focus-visible,
.app-btn--selected {
  outline: 2px solid var(--color-white);
  outline-offset: 2px;
}

.app-btn__icon {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
  flex-shrink: 0;
}

/* icon-responsive: label visible on desktop, screen-reader-only on mobile */
@media (max-width: 767px) {
  .app-btn__label--responsive {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}

/* CSS spinner — replaces icon while working */
.app-btn__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: white;
  border-radius: 50%;
  animation: app-btn-spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes app-btn-spin {
  to { transform: rotate(360deg); }
}
</style>
