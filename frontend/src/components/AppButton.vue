<template>
  <component
    :is="href ? 'a' : 'button'"
    v-bind="href ? { href, target } : { type, disabled: disabled || working }"
    :aria-label="isIconOnly ? label : undefined"
    :aria-pressed="selected != null ? selected : undefined"
    :aria-busy="working || undefined"
    class="app-btn"
    :class="{
      'app-btn--icon-only': isIconOnly,
      'app-btn--icon-text': hasIconBox,
      'app-btn--unselected': selected === false,
      'app-btn--working': working,
      'app-btn--danger': variant === 'danger',
    }"
    :style="buttonStyle"
  >
    <!-- Icon-only -->
    <template v-if="isIconOnly">
      <img :src="`/icons/${icon}.svg`" class="app-btn__icon" :class="selected === false ? 'svg-black' : 'svg-white'" aria-hidden="true" />
    </template>

    <!-- Icon + text: icon centered in a fixed square, label with right padding only -->
    <template v-else-if="hasIconBox">
      <span class="app-btn__icon-box" aria-hidden="true">
        <img :src="`/icons/${icon}.svg`" class="app-btn__icon" :class="selected === false ? 'svg-black' : 'svg-white'" />
      </span>
      <span
        class="app-btn__label"
        :class="{ 'app-btn__label--responsive': mode === 'icon-responsive' }"
      >{{ label }}</span>
    </template>

    <!-- Text only -->
    <template v-else>
      <span class="app-btn__label">{{ label }}</span>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  icon?: string
  mode?: 'icon-only' | 'icon-responsive' | 'icon-text'
  variant?: 'default' | 'danger'
  color?: string
  disabled?: boolean
  working?: boolean
  selected?: boolean | null
  type?: 'button' | 'submit' | 'reset'
  href?: string
  target?: string
}>(), {
  mode: 'icon-text',
  type: 'button',
  selected: null,
})

const isIconOnly = computed(() => !!props.icon && props.mode === 'icon-only')
const hasIconBox = computed(() => !!props.icon && !isIconOnly.value)

const buttonStyle = computed(() => ({
  ...(props.color ? { backgroundColor: props.color } : {}),
  justifyContent: props.icon && props.mode !== 'icon-only' ? 'flex-start' : 'center',
}))
</script>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 1rem;
  background: var(--color-dtv-green);
  color: var(--color-white);
  border: none;
  font-family: var(--font-head);
  font-size: 0.9rem;
  font-weight: 400;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
}

/* Icon-only: square, no padding */
.app-btn--icon-only {
  padding: 0;
  width: 2.5rem;
}

/* Icon + text: no padding — icon box and label own all spacing */
.app-btn--icon-text {
  padding: 0;
}

.app-btn__icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
}

.app-btn__label {
  padding: 0 1rem 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.app-btn:not(.app-btn--icon-text) .app-btn__label {
  padding: 0 1rem;
}

.app-btn--danger {
  background: var(--color-dtv-red);
}

.app-btn:hover:not(:disabled) {
  background: var(--color-dtv-green-dark);
}

.app-btn--danger:hover:not(:disabled) {
  background: var(--color-dtv-dirt-dark);
}

.app-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.app-btn--working {
  animation: app-btn-pulse 1s ease-in-out infinite;
  cursor: default;
  pointer-events: none;
}

@keyframes app-btn-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}


.app-btn--unselected {
  background: var(--color-dtv-light);
  color: var(--color-text);
}


.app-btn__icon {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
  flex-shrink: 0;
}

@media (width < 48em) {
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
</style>
