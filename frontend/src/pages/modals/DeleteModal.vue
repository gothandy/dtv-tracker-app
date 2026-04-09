<template>
  <ModalLayout
    :title="title"
    action="Cancel"
    show-delete
    :working="working"
    @close="emit('close')"
    @action="emit('close')"
    @delete="emit('confirm')"
  >
    <p v-if="body" class="dm-body">{{ body }}</p>
  </ModalLayout>
</template>

<script setup lang="ts">
import ModalLayout from '../../components/ModalLayout.vue'

defineProps<{
  title: string
  body?: string
  working?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<style scoped>
.dm-body {
  font-size: 0.9rem;
  opacity: 0.8;
}
</style>
