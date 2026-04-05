<template>
  <div class="am-overlay">
    <div class="am-panel">

      <div class="am-header">
        <span class="am-title">{{ title }}</span>
        <button class="am-close" aria-label="Close" @click="emit('close')">×</button>
      </div>

      <div class="am-body">
        <slot />
      </div>

      <div class="am-footer">
        <AppButton
          v-if="showDelete"
          label="Delete"
          icon="delete"
          mode="icon-responsive"
          variant="danger"
          class="am-delete"
          :disabled="deleteDisabled"
          @click="emit('delete')"
        />
        <AppButton
          v-if="action"
          :label="action"
          :icon="actionIcon"
          :disabled="actionDisabled"
          :working="working"
          @click="emit('action')"
        />
        <AppButton
          v-else
          label="Close"
          @click="emit('close')"
        />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from './AppButton.vue'

defineProps<{
  title: string
  action?: string
  actionIcon?: string
  actionDisabled?: boolean
  working?: boolean
  showDelete?: boolean
  deleteDisabled?: boolean
}>()

const emit = defineEmits<{
  close: []
  action: []
  delete: []
}>()
</script>

<style scoped>
.am-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.am-panel {
  background: var(--color-dtv-sand);
  width: 90%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.am-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--color-dtv-green);
  flex-shrink: 0;
}

.am-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-white);
}

.am-close {
  background: none;
  border: none;
  color: var(--color-white);
  font-size: 1.25rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.am-close:hover { opacity: 0.8; }

.am-body {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.am-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-dtv-light);
  flex-shrink: 0;
}

.am-delete {
  margin-right: auto;
}
</style>
