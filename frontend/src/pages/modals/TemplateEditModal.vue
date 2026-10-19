<template>
  <ModalLayout
    title="Edit Template"
    action="Save"
    action-icon="save"
    show-delete
    :action-disabled="!form.name.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="emit('delete')"
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
import type { TemplateDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import { TEMPLATE_CONTEXT_NAMES, type TemplateContext } from '../../../../types/email-template'

export type EditTemplatePayload = {
  name: string
  subject: string
  context: TemplateContext
}

const props = defineProps<{
  template: TemplateDetailResponse
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: EditTemplatePayload]
  delete: []
}>()

const form = reactive({
  name: props.template.title,
  subject: props.template.subject,
  context: props.template.context,
})

function save() {
  emit('save', { name: form.name.trim(), subject: form.subject.trim(), context: form.context })
}
</script>
