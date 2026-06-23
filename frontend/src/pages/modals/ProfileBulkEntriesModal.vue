<template>
  <ModalLayout
    :title="`Add Entries — ${count} ${count === 1 ? 'profile' : 'profiles'}`"
    action="Add"
    action-icon="add"
    :action-disabled="!sessionId || count === 0 || sessionsLoading || !sessionOptions.length"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
  >
    <FormLayout :disabled="working">
      <FormRow title="Session" :full-width="true">
        <LoadingSpinner v-if="sessionsLoading" />
        <p v-else-if="sessionsError" class="modal-form-hint">{{ sessionsError }}</p>
        <p v-else-if="!sessionOptions.length" class="modal-form-hint">No future sessions available.</p>
        <ModalFormSelect v-else v-model="sessionId">
          <option value="" disabled>Select session…</option>
          <option v-for="s in sessionOptions" :key="s.id" :value="String(s.id)">{{ s.label }}</option>
        </ModalFormSelect>
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
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import type { BulkEntrySessionOption } from '../../utils/bulkEntrySessionOptions'

export interface BulkEntriesPayload {
  sessionId: number
}

defineProps<{
  count: number
  sessionOptions: BulkEntrySessionOption[]
  sessionsLoading?: boolean
  sessionsError?: string
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: BulkEntriesPayload]
}>()

const sessionId = ref('')

function save() {
  const id = parseInt(sessionId.value, 10)
  if (isNaN(id)) return
  emit('save', { sessionId: id })
}
</script>
