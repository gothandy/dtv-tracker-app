<template>
  <ModalLayout
    title="New Template"
    action="Create"
    :action-disabled="!form.name.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="emit('add', { name: form.name.trim(), subject: form.subject.trim(), context: form.context })"
  >
    <FormLayout :disabled="working">
      <FormRow title="Name" :full-width="true">
        <ModalFormInput v-model="form.name" />
      </FormRow>
      <FormRow title="Subject" :full-width="true">
        <ModalFormInput v-model="form.subject" />
      </FormRow>
      <FormRow title="Context" :full-width="true">
        <ModalFormSelect v-model="form.context">
          <option v-for="c in TEMPLATE_CONTEXT_NAMES" :key="c" :value="c">{{ c }}</option>
        </ModalFormSelect>
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
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import { TEMPLATE_CONTEXT_NAMES, type TemplateContext } from '../../../../types/email-template'

export type AddTemplatePayload = {
  name: string
  subject: string
  context: TemplateContext
}

defineProps<{
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddTemplatePayload]
}>()

const form = reactive({ name: '', subject: '', context: TEMPLATE_CONTEXT_NAMES[0] as TemplateContext })
</script>
