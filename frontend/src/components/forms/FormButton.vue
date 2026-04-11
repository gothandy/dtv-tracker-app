<template>
  <component
    :is="href ? 'a' : 'button'"
    v-bind="href ? { href } : { type, disabled: disabled || working }"
    class="form-btn"
    :class="{
      'form-btn--outline': variant === 'outline',
      'form-btn--working': working,
    }"
    :style="color ? { '--btn-bg': color } : undefined"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'outline'
  color?: string
  disabled?: boolean
  working?: boolean
  type?: 'button' | 'submit' | 'reset'
  href?: string
}>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  working: false,
})
</script>

<style scoped>
.form-btn {
  --btn-bg: var(--color-dtv-green);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: var(--btn-bg);
  color: var(--color-dtv-light);
  border: none;
  font-family: var(--font-head);
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  text-decoration: none;
  box-sizing: border-box;
  min-height: 2.75rem;
}

.form-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--btn-bg) 80%, black);
}

.form-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


.form-btn--working {
  animation: form-btn-pulse 1s ease-in-out infinite;
  cursor: default;
  pointer-events: none;
}

@keyframes form-btn-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
</style>
