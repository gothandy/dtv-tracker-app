<template>
  <ModalLayout
    title="Add Record"
    action="Add"
    action-icon="add"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="add"
  >
    <FormLayout :disabled="working">
      <FormRow title="Type" :full-width="true">
        <select v-model="form.type" class="ram-select">
          <option value="" disabled>Select type…</option>
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </select>
      </FormRow>
      <FormRow title="Status" :full-width="true">
        <select v-model="form.status" class="ram-select">
          <option value="" disabled>Select status…</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </FormRow>
      <FormRow title="Date" :full-width="true">
        <input v-model="form.date" class="ram-input" type="date" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

export interface AddRecordPayload {
  type: string
  status: string
  date: string
}

const props = defineProps<{
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

<style scoped>
.ram-select,
.ram-input {
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
