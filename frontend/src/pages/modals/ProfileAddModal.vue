<template>
  <ModalLayout
    title="Add Profile"
    action="Create"
    :action-disabled="!form.name.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="add"
  >
    <FormLayout :disabled="working">
      <FormRow title="Name" :full-width="true">
        <ModalFormInput v-model="form.name" placeholder="Full name" />
      </FormRow>
      <FormRow title="Email" :full-width="true">
        <ModalFormInput v-model="form.email" type="email" placeholder="email@example.com" />
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

export type AddProfilePayload = {
  name: string
  email?: string
}

defineProps<{
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddProfilePayload]
}>()

const form = reactive({ name: '', email: '' })

function add() {
  emit('add', {
    name: form.name.trim(),
    email: form.email.trim() || undefined,
  })
}
</script>
