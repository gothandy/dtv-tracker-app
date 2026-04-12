<template>
  <div class="am-overlay">
    <div class="am-panel">

      <div class="am-header">
        <span class="am-title">{{ title }}</span>
        <button class="am-close" aria-label="Close" :disabled="working" @click="emit('close')">
          <img src="/icons/close.svg" width="16" height="16" alt="" class="svg-white" />
        </button>
      </div>

      <div class="am-body">
        <slot />
        <div v-if="working" class="am-body-blocker" />
      </div>

      <div v-if="error" class="am-error">{{ error }}</div>

      <div class="am-footer">
        <AppButton
          v-if="showDelete"
          label="Delete"
          icon="delete"
          mode="icon-responsive"
          variant="danger"
          class="am-delete"
          :disabled="deleteDisabled || working"
          :working="working && activeButton === 'delete'"
          @click="onDelete"
        />
        <AppButton
          v-if="action"
          :label="action"
          :icon="actionIcon"
          :disabled="actionDisabled || working"
          :working="working && activeButton === 'action'"
          @click="onAction"
        />
        <AppButton
          v-else
          label="Close"
          :disabled="working"
          @click="emit('close')"
        />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppButton from './AppButton.vue'

const props = defineProps<{
  title: string
  action?: string
  actionIcon?: string
  actionDisabled?: boolean
  working?: boolean
  showDelete?: boolean
  deleteDisabled?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  action: []
  delete: []
}>()

const activeButton = ref<'delete' | 'action' | null>(null)

watch(() => props.working, (val) => {
  if (!val) activeButton.value = null
})

function onDelete() {
  activeButton.value = 'delete'
  emit('delete')
}

function onAction() {
  activeButton.value = 'action'
  emit('action')
}
</script>

<style scoped>
.am-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: stretch;
  justify-content: center;
  z-index: 100;
}

@media (width >= 48em) {
  .am-overlay {
    align-items: center;
  }
}

.am-panel {
  background: var(--color-dtv-sand);
  width: 100%;
  height: 100%;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

@media (width >= 48em) {
  .am-panel {
    width: 90%;
    max-width: 480px;
    height: auto;
    max-height: 85vh;
  }
}

.am-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
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
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.am-close:hover:not(:disabled) { opacity: 0.8; }
.am-close:disabled { opacity: 0.4; cursor: default; }

.am-body {
  position: relative;
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
}

.am-body-blocker {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.am-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-dtv-light);
  flex-shrink: 0;
}

.am-error {
  padding: 0.5rem 1rem;
  background: var(--color-dtv-dirt-light);
  color: var(--color-dtv-dirt);
  font-size: 0.85rem;
  flex-shrink: 0;
}

.am-delete {
  margin-right: auto;
}
</style>
