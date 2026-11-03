<template>
  <ModalLayout
    title="Edit Record"
    action="Save"
    action-icon="save"
    show-delete
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="emit('delete')"
  >
    <FormLayout :disabled="working">
      <FormRow title="Type" :full-width="true">
        <span class="modal-form-readonly">{{ record.type }}</span>
      </FormRow>
      <FormRow title="Status" :full-width="true">
        <ModalFormSelect v-model="form.status">
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </ModalFormSelect>
      </FormRow>
      <FormRow title="Date" :full-width="true">
        <ModalFormInput v-model="form.date" type="date" />
      </FormRow>
      <FormRow title="Notes" :full-width="true">
        <ModalFormInput v-model="form.notes" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { RecordResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'

export interface SaveRecordPayload {
  status: string
  date: string
  notes: string
}

const props = defineProps<{
  record: RecordResponse
  statuses: string[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: SaveRecordPayload]
  delete: []
}>()

const form = reactive({
  status: props.record.storedStatus,
  date: props.record.date?.slice(0, 10) ?? '',
  notes: props.record.notes ?? '',
})

function save() {
  emit('save', {
    status: form.status,
    date: form.date,
    notes: form.notes,
  })
}
</script>
