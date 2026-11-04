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
        <ModalFormSelect v-model="form.type">
          <option value="" disabled>Select type…</option>
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </ModalFormSelect>
      </FormRow>
      <FormRow title="State" :full-width="true">
        <ModalFormSelect v-model="form.status" :disabled="!form.type">
          <option value="" disabled>Select state…</option>
          <option v-for="s in typeStates" :key="s.id" :value="s.name">{{ s.name }}</option>
        </ModalFormSelect>
      </FormRow>
      <FormRow title="Date" :full-width="true">
        <ModalFormInput v-model="form.date" type="date" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import { ukToday } from '../../../../types/uk-date'
import { stateTypes, statesOfType, type RecordState } from '../../../../types/record-state'

export interface BulkRecordPayload {
  type: string
  status: string
  date: string
}

const props = defineProps<{
  count: number
  /** The States list: Types and each Type's States come from here. */
  states: RecordState[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: BulkRecordPayload]
}>()

const today = ukToday()

const form = reactive({
  type: '',
  status: '',
  date: today,
})

const types = computed(() => stateTypes(props.states))
const typeStates = computed(() => statesOfType(props.states, form.type))
watch(() => form.type, () => { form.status = '' })

function save() {
  if (!form.type || !form.status) return
  emit('save', {
    type: form.type,
    status: form.status,
    date: form.date,
  })
}
</script>
