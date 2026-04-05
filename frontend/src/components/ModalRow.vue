<template>
  <div class="fr" :class="{ 'fr--full': fullWidth }">
    <span class="fr-label" :class="{ 'fr-label--disabled': disabled }">{{ title }}</span>
    <div class="fr-control">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  fullWidth?: boolean
  disabled?: boolean
}>(), {
  fullWidth: false,
  disabled: false,
})
</script>

<style scoped>
.fr {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border);
}

.fr:last-child {
  border-bottom: none;
}

@media (min-width: 420px) {
  .fr:not(.fr--full) {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
}

.fr-label {
  font-size: 0.85rem;
  color: var(--color-text-label);
  flex-shrink: 0;
}

.fr:not(.fr--full) .fr-label {
  min-width: 6rem;
}

.fr-label--disabled {
  opacity: 0.4;
}

.fr-control {
  flex: 1;
  min-width: 0;
}
</style>
