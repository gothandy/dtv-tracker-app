<template>
  <ModalLayout
    title="Edit Project"
    action="Save"
    action-icon="save"
    show-delete
    :action-disabled="!form.key.trim() || !form.name.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="emit('delete')"
  >
    <FormLayout :disabled="working">
      <FormRow title="Display Name" :full-width="true">
        <ModalFormInput v-model="form.name" />
      </FormRow>
      <FormRow title="Key" :full-width="true">
        <ModalFormInput v-model="form.key" />
      </FormRow>
      <FormRow title="Description" :full-width="true">
        <ModalFormTextarea v-model="form.description" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { ProjectDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormTextarea from '../../components/forms/ModalFormTextarea.vue'

export type EditProjectPayload = {
  displayName: string
  key: string
  description?: string
}

const props = defineProps<{
  project: ProjectDetailResponse
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: EditProjectPayload]
  delete: []
}>()

const form = reactive({
  name: props.project.displayName ?? '',
  key: props.project.key,
  description: props.project.description ?? '',
})

function save() {
  emit('save', {
    displayName: form.name.trim(),
    key: form.key.trim(),
    description: form.description.trim() || undefined,
  })
}
</script>
