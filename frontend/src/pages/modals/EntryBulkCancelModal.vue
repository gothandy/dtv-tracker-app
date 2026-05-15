<template>
  <ModalLayout
    title="Cancel entries?"
    action="Keep"
    show-delete
    delete-text="Cancel entries"
    delete-icon="close"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="emit('close')"
    @delete="emit('confirm')"
  >
    <p class="ebcm-body">
      Cancelling {{ count }} {{ count === 1 ? 'entry' : 'entries' }}. Are you sure?
    </p>
  </ModalLayout>
</template>

<script setup lang="ts">
import ModalLayout from '../../components/ModalLayout.vue'

defineProps<{
  count: number
  working?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<style scoped>
.ebcm-body {
  font-size: 0.9rem;
  opacity: 0.8;
  margin: 0;
}
</style>
