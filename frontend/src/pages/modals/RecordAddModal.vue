<template>
  <ModalLayout
    title="Add Record"
    action="Add"
    action-icon="add"
    :working="working"
    :error="error"
    :action-disabled="!form.type || !form.state"
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
      <FormRow title="State" :full-width="true">
        <ModalFormSelect v-model="form.state" :disabled="!form.type">
          <option value="" disabled>Select state…</option>
          <option v-for="s in typeStates" :key="s.id" :value="s.name">{{ s.name }}</option>
        </ModalFormSelect>
      </FormRow>
      <FormRow :title="dateTitle" :full-width="true">
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
import { dateLabel, stateTypes, statesOfType, type RecordState } from '../../../../types/record-state'

export interface AddRecordPayload {
  type: string
  state: string
  date: string
}

const props = defineProps<{
  /** The States list: Types and each Type's States come from here. */
  states: RecordState[]
  /** Pre-filled Type and State (from Edit Record's change of State). */
  initialType?: string
  initialState?: string
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddRecordPayload]
}>()

const today = ukToday()

const form = reactive({
  type: props.initialType ?? '',
  state: props.initialState ?? '',
  date: today,
})

const types = computed(() => stateTypes(props.states))
const typeStates = computed(() => statesOfType(props.states, form.type))
/** The Date field's label from the chosen State (Before, else After, else Date). */
const dateTitle = computed(() => dateLabel(typeStates.value.find(s => s.name === form.state)))
watch(() => form.type, () => { form.state = '' })

function add() {
  if (!form.type || !form.state) return
  emit('add', {
    type: form.type,
    state: form.state,
    date: form.date,
  })
}
</script>
