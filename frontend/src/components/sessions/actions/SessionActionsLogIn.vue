<template>
  <div class="sna-wrap">
    <p class="sna-label">Already volunteered with us?</p>
    <AppButton usage="task" label="Log in to book" icon="tick" href="/login" />
  </div>
</template>

<script setup lang="ts">
import AppButton from '../../AppButton.vue'
</script>

<style scoped>
.sna-wrap {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.sna-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
