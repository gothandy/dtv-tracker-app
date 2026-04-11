<template>
  <Transition name="flash-message">
    <div
      v-if="active === notice"
      class="flash-message"
      :class="`flash-message--${type}`"
      role="button"
      tabindex="0"
      aria-label="Dismiss notification"
      @click="dismiss"
      @keydown.enter.prevent="dismiss"
      @keydown.space.prevent="dismiss"
    >
      <span class="flash-message-text"><slot /></span>
      <img src="/icons/close.svg" :class="type === 'neutral' ? 'svg-black' : 'svg-white'" width="14" height="14" alt="" aria-hidden="true" class="flash-message-close" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useFlash } from '../composables/useFlash'

defineProps<{
  notice: string
  active: string | null
  type: 'info' | 'neutral' | 'error'
}>()

const { dismiss } = useFlash()
</script>

<style scoped>
.flash-message {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  box-sizing: border-box;
  width: fit-content;
  cursor: pointer;
}

.flash-message:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}

@media (width < 48em) {
  .flash-message {
    left: 0;
    width: 100%;
  }
}

.flash-message--info    { background: var(--color-dtv-gold); color: var(--color-dtv-light); }
.flash-message--neutral { background: var(--color-dtv-sand); color: var(--color-dtv-dark);  }
.flash-message--error   { background: var(--color-dtv-dirt); color: var(--color-dtv-light); }

.flash-message-text { flex: 1; min-width: 0; }
.flash-message-close { opacity: 0.8; flex-shrink: 0; }

.flash-message-enter-active,
.flash-message-leave-active {
  transition: max-height 0.25s ease, opacity 0.25s ease;
  overflow: hidden;
  max-height: 4rem;
}

.flash-message-enter-from,
.flash-message-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
