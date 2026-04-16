<template>
  <div class="sna-wrap">
    <p class="sna-label">You've been before — book your spot.</p>
    <AppButton usage="task" label="Book" icon="add" :working="working" @click="emit('book')" />
    <p v-if="error" class="sna-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../../AppButton.vue'
defineProps<{ working?: boolean; error?: string }>()
const emit = defineEmits<{ book: [] }>()
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

.sna-error {
  font-size: 0.85rem;
  color: var(--color-dtv-dirt);
  margin: 0;
}
</style>
