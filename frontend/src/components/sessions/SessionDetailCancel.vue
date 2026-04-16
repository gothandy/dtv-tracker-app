<template>
  <div class="sdc-wrap">
    <p class="sdc-status">You're booked on this session.</p>
    <button
      class="sdc-btn"
      :disabled="working"
      @click="emit('cancel')"
    >
      {{ working ? 'Cancelling…' : 'Cancel booking' }}
    </button>
    <p v-if="error" class="sdc-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ working?: boolean; error?: string }>()
const emit = defineEmits<{ cancel: [] }>()
</script>

<style scoped>
.sdc-wrap {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.sdc-status {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.sdc-btn {
  background: var(--color-dtv-gold);
  color: var(--color-white);
  border: none;
  padding: 0.6rem 1.25rem;
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
}
.sdc-btn:hover:not(:disabled) { background: var(--color-dtv-gold-dark); }
.sdc-btn:disabled { opacity: 0.5; cursor: default; }

.sdc-error {
  font-size: 0.85rem;
  color: var(--color-dtv-dirt);
  margin: 0;
}
</style>
