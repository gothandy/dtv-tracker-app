<template>
  <ModalLayout
    :title="title"
    :action="confirmLabel"
    :action-icon="confirmIcon"
    :working="working"
    @close="emit('close')"
    @action="emit('confirm')"
  >
    <p v-if="body" class="cm-body">{{ body }}</p>
  </ModalLayout>
</template>

<script setup lang="ts">
import ModalLayout from '../../components/ModalLayout.vue'

/** Asks before an action: a title, an optional body and the button that goes ahead; the × backs out. */
defineProps<{
  title: string
  body?: string
  confirmLabel: string
  confirmIcon?: string
  working?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<style scoped>
.cm-body {
  font-size: 0.9rem;
  opacity: 0.8;
}
</style>
