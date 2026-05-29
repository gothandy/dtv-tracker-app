<template>
  <ModalLayout
    title="New Project"
    action="Create"
    :action-disabled="!form.key.trim() || !form.name.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="emit('add', { key: form.key.trim(), name: form.name.trim(), description: form.description.trim() || undefined })"
  >
    <FormLayout :disabled="working">
      <FormRow title="Display Name" :full-width="true">
        <ModalFormInput v-model="form.name" />
      </FormRow>
      <FormRow title="Key" :full-width="true">
        <ModalFormInput v-model="form.key" placeholder="bridge" />
      </FormRow>
      <FormRow title="Description" :full-width="true">
        <ModalFormTextarea v-model="form.description" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormTextarea from '../../components/forms/ModalFormTextarea.vue'

export type AddProjectPayload = {
  key: string
  name: string
  description?: string
}

defineProps<{
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddProjectPayload]
}>()

const form = reactive({ key: '', name: '', description: '' })
</script>
