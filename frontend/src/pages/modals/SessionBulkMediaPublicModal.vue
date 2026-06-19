<template>
  <ModalLayout
    title="Make media public"
    action="Apply"
    action-icon="uploadphoto"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="emit('confirm')"
  >
    <p class="sbmp-count">{{ count }} session{{ count === 1 ? '' : 's' }} selected</p>
    <p class="sbmp-body">
      All private photos and videos in the selected session folders will be marked public.
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
.sbmp-count {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0 0 0.5rem;
}

.sbmp-body {
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.45;
}
</style>
