<template>
  <div class="sna-wrap">
    <p class="sna-label">Have photos from the session?</p>
    <AppButton usage="task" label="Log in to upload" icon="tick" :href="loginHref" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../../AppButton.vue'

const loginHref = computed(() => {
  const returnTo = `${window.location.pathname}${window.location.search}`
  return `/login?returnTo=${encodeURIComponent(returnTo)}`
})
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
