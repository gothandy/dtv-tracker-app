<template>
  <ModalLayout
    :title="`Add Record — ${count} ${count === 1 ? 'profile' : 'profiles'}`"
    action="Add"
    action-icon="add"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
  >
    <FormLayout :disabled="working">
      <FormRow title="Type" :full-width="true">
        <select v-model="form.type" class="pbrm-select">
          <option value="" disabled>Select type…</option>
          <option v-for="t in recordOptions.types" :key="t" :value="t">{{ t }}</option>
        </select>
      </FormRow>
      <FormRow title="Status" :full-width="true">
        <select v-model="form.status" class="pbrm-select">
          <option value="" disabled>Select status…</option>
          <option v-for="s in recordOptions.statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </FormRow>
      <FormRow title="Date" :full-width="true">
        <input v-model="form.date" class="pbrm-input" type="date" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

export interface BulkRecordPayload {
  type: string
  status: string
  date: string
}

const props = defineProps<{
  count: number
  recordOptions: { types: string[]; statuses: string[] }
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: BulkRecordPayload]
}>()

const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  type: '',
  status: '',
  date: today,
})

function save() {
  if (!form.type || !form.status) return
  emit('save', {
    type: form.type,
    status: form.status,
    date: form.date,
  })
}
</script>

<style scoped>
.pbrm-select,
.pbrm-input {
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
