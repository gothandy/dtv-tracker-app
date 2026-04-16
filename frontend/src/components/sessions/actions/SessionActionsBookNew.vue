<template>
  <div class="sna-wrap">
    <p class="sna-label">New to DTV? Book via Eventbrite.</p>
    <AppButton usage="task" label="Book" icon="brands/eventbrite" variant="secondary" :href="eventbriteUrl" target="_blank" />
  </div>
</template>

<script setup lang="ts">
import AppButton from '../../AppButton.vue'
defineProps<{ eventbriteUrl: string }>()
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
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
