<template>
  <div class="sna-wrap">
    <p class="sna-status">You're booked on this session.</p>
    <AppButton label="Cancel booking" icon="close" dtv-color="gold" :working="working" @click="emit('cancel')" />
    <p v-if="error" class="sna-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../../AppButton.vue'
defineProps<{ working?: boolean; error?: string }>()
const emit = defineEmits<{ cancel: [] }>()
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

.sna-status {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.sna-error {
  font-size: 0.85rem;
  color: var(--color-dtv-dirt);
  margin: 0;
}
</style>
