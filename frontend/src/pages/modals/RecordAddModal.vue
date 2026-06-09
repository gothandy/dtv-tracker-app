<template>
  <ModalLayout
    title="Add Record"
    action="Add"
    action-icon="add"
    :working="working"
    :error="error"
    :action-disabled="!form.type || !form.status"
    @close="emit('close')"
    @action="add"
  >
    <FormLayout :disabled="working">
      <FormRow title="Type" :full-width="true">
        <ModalFormSelect v-model="form.type">
          <option value="" disabled>Select type…</option>
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </ModalFormSelect>
      </FormRow>
      <FormRow title="Status" :full-width="true">
        <ModalFormSelect v-model="form.status">
          <option value="" disabled>Select status…</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </ModalFormSelect>
      </FormRow>
      <FormRow title="Date" :full-width="true">
        <ModalFormInput v-model="form.date" type="date" />
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

export interface AddRecordPayload {
  type: string
  status: string
  date: string
}

defineProps<{
  types: string[]
  statuses: string[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddRecordPayload]
}>()

const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  type: '',
  status: '',
  date: today,
})

function add() {
  if (!form.type || !form.status) return
  emit('add', {
    type: form.type,
    status: form.status,
    date: form.date,
  })
}
</script>
