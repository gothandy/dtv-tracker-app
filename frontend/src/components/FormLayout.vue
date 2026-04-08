<template>
  <fieldset class="form-layout" :disabled="disabled">
    <slot />
  </fieldset>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
</script>

<style scoped>
.form-layout {
  background: var(--color-dtv-sand);
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  border: none;
  margin: 0;
  min-width: 0;
}
</style>
