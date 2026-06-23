<template>
  <ModalLayout
    :title="`Send Email — ${count} ${count === 1 ? 'profile' : 'profiles'}`"
    action="Send"
    action-icon="email"
    :action-disabled="count === 0"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="onSend"
  >
    <FormLayout :disabled="working">
      <FormRow title="Template">
        <ModalFormSelect v-model="template">
          <option value="membership-invite">Membership Invite</option>
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

export interface BulkEmailPayload {
  template: 'membership-invite'
  preview: boolean
}

defineProps<{
  count: number
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  send: [payload: BulkEmailPayload]
}>()

const template = ref<'membership-invite'>('membership-invite')
const preview = ref(true)

function onSend() {
  emit('send', { template: template.value, preview: preview.value })
}
</script>
