<template>
  <ModalLayout
    title="Send Email"
    action="Send"
    action-icon="email"
    :action-disabled="!canSend"
    :working="working"
    :error="error || templatesError"
    @close="emit('close')"
    @action="onSend"
  >
    <FormLayout>
      <FormRow title="Template">
        <LoadingSpinner v-if="templatesLoading" />
        <ModalFormSelect v-else v-model="templateId" :placeholder="!templateId">
          <option value="" disabled>Select template…</option>
          <option v-for="t in templates" :key="t.id" :value="String(t.id)">{{ t.title }}</option>
        </ModalFormSelect>
      </FormRow>

      <FormRow title="Send To">
        <ModalFormSelect v-model="recipient">
          <option v-for="a in adults" :key="a.entryId" :value="a.entryId" :disabled="!a.email">
            {{ a.name }}{{ a.email ? ` ${a.email}` : ' (no email)' }}
          </option>
          <option value="send-all">Send All</option>
        </ModalFormSelect>
      </FormRow>

      <FormRow title="Preview">
        <label class="modal-form-check-label">
          <ModalFormCheckbox v-model="preview" :disabled="recipient === 'send-all'" />
          Send to my email address only
        </label>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import ModalFormCheckbox from '../../components/forms/ModalFormCheckbox.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import type { TemplateResponse } from '../../../../types/api-responses'

export interface EmailAdult {
  entryId: number
  name: string
  email?: string
}

const props = defineProps<{
  adults: EmailAdult[]
  working: boolean
  error?: string
  /** Session email templates, from the Templates list. */
  templates: TemplateResponse[]
  templatesLoading?: boolean
  templatesError?: string
}>()

const emit = defineEmits<{
  close: []
  send: [{ recipient: number | 'send-all', preview: boolean, templateId: number }]
}>()

const templateId = ref('')
const recipient = ref<number | 'send-all'>(props.adults.find(a => a.email)?.entryId ?? 'send-all')
const preview = ref(true)

watch(recipient, val => {
  if (val === 'send-all') preview.value = false
})

const canSend = computed(() =>
  !!templateId.value && (
    recipient.value === 'send-all'
      ? props.adults.some(a => a.email)
      : props.adults.length > 0
  )
)

function onSend() {
  emit('send', { recipient: recipient.value, preview: preview.value, templateId: Number(templateId.value) })
}
</script>
