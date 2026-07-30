<template>
  <ModalLayout
    title="Send Email"
    action="Send"
    action-icon="email"
    :action-disabled="!canSend"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="onSend"
  >
    <FormLayout>
      <FormRow title="Template">
        <ModalFormSelect v-model="template">
          <option value="pre-dig">Pre-Dig</option>
          <option value="pre-social">Pre-Social</option>
          <option value="post-session">Post-Session</option>
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

export interface EmailAdult {
  entryId: number
  name: string
  email?: string
}

const props = defineProps<{
  adults: EmailAdult[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  send: [{ recipient: number | 'send-all', preview: boolean, template: string }]
}>()

const template = ref<'pre-dig' | 'pre-social' | 'post-session'>('pre-dig')
const recipient = ref<number | 'send-all'>(props.adults.find(a => a.email)?.entryId ?? 'send-all')
const preview = ref(true)

watch(recipient, val => {
  if (val === 'send-all') preview.value = false
})

const canSend = computed(() =>
  recipient.value === 'send-all'
    ? props.adults.some(a => a.email)
    : props.adults.length > 0
)

function onSend() {
  emit('send', { recipient: recipient.value, preview: preview.value, template: template.value })
}
</script>
