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
        <span class="rem-type">{{ record.type }}</span>
      </FormRow>
      <FormRow title="Status" :full-width="true">
        <select v-model="form.status" class="rem-select">
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </FormRow>
      <FormRow title="Date" :full-width="true">
        <input v-model="form.date" class="rem-input" type="date" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { ConsentRecordResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

export interface SaveRecordPayload {
  status: string
  date: string
}

const props = defineProps<{
  record: ConsentRecordResponse
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
  status: props.record.status,
  date: props.record.date?.slice(0, 10) ?? '',
})

function save() {
  emit('save', {
    status: form.status,
    date: form.date,
  })
}
</script>

<style scoped>
.rem-select,
.rem-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.rem-type {
  font-size: 0.95rem;
  color: var(--color-text-muted);
}
</style>
