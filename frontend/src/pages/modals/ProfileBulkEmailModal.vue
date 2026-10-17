<template>
  <ModalLayout
    :title="`Send Email — ${count} ${count === 1 ? 'profile' : 'profiles'}`"
    action="Send"
    action-icon="email"
    :action-disabled="count === 0 || !templateId"
    :working="working"
    :error="error || templatesError"
    @close="emit('close')"
    @action="onSend"
  >
    <FormLayout :disabled="working">
      <FormRow title="Template">
        <LoadingSpinner v-if="templatesLoading" />
        <ModalFormSelect v-else v-model="templateId" :placeholder="!templateId">
          <option value="" disabled>Select template…</option>
          <option v-for="t in templates" :key="t.id" :value="String(t.id)">{{ t.title }}</option>
        </ModalFormSelect>
      </FormRow>

      <FormRow title="Preview">
        <label class="modal-form-check-label">
          <ModalFormCheckbox v-model="preview" />
          Send to my email address only
        </label>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import ModalFormCheckbox from '../../components/forms/ModalFormCheckbox.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import type { TemplateResponse } from '../../../../types/api-responses'

export interface BulkEmailPayload {
  templateId: number
  preview: boolean
}

defineProps<{
  count: number
  working: boolean
  error?: string
  /** Profile email templates, from the Templates list. */
  templates: TemplateResponse[]
  templatesLoading?: boolean
  templatesError?: string
}>()

const emit = defineEmits<{
  close: []
  send: [payload: BulkEmailPayload]
}>()

const templateId = ref('')
const preview = ref(true)

function onSend() {
  emit('send', { templateId: Number(templateId.value), preview: preview.value })
}
</script>
