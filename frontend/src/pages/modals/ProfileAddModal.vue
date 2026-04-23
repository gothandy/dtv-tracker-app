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
        <input v-model="form.name" type="text" class="pam-input" placeholder="Full name" />
      </FormRow>
      <FormRow title="Email" :full-width="true">
        <input v-model="form.email" type="email" class="pam-input" placeholder="email@example.com" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

export type AddProfilePayload = {
  name: string
  email?: string
}

const props = defineProps<{
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

<style scoped>
.pam-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
</style>
