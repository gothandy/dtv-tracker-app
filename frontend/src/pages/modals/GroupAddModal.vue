<template>
  <ModalLayout
    title="New Group"
    action="Create"
    :action-disabled="!form.key.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="emit('add', { key: form.key.trim(), name: form.name.trim() || undefined, description: form.description.trim() || undefined })"
  >
    <FormLayout :disabled="working">
      <FormRow title="Key (short name, e.g. &quot;sat&quot;)" :full-width="true">
        <ModalFormInput v-model="form.key" placeholder="sat" />
      </FormRow>
      <FormRow title="Display Name (e.g. &quot;Saturday Dig&quot;)" :full-width="true">
        <ModalFormInput v-model="form.name" placeholder="Saturday Dig" />
      </FormRow>
      <FormRow title="Description (optional)" :full-width="true">
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

export type AddGroupPayload = {
  key: string
  name?: string
  description?: string
}

defineProps<{
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddGroupPayload]
}>()

const form = reactive({ key: '', name: '', description: '' })
</script>
