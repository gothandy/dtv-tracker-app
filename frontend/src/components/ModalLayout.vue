<template>
  <div class="am-overlay" @click.self="emit('close')">
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
          @click="emit('delete')"
        />
        <AppButton
          v-if="action"
          :label="action"
          :icon="actionIcon"
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
  showDelete?: boolean
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
  z-index: 50;
}

.am-panel {
  background: var(--color-white);
  border: 1px solid var(--color-border);
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
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.am-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.am-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.am-close:hover { color: var(--color-text); }

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
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.am-delete {
  margin-right: auto;
}
</style>
