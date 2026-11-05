<template>
  <ModalLayout
    :title="title ?? 'Edit Record'"
    action="Save"
    action-icon="save"
    show-delete
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="emit('delete')"
  >
    <div v-if="profileClick || archiveClick" class="modal-form-links">
      <AppButton v-if="profileClick" label="View Profile" icon="profile" @click="profileClick!()" />
      <AppButton v-if="archiveClick" label="View Archive" icon="clock" @click="archiveClick!()" />
    </div>

    <FormLayout :disabled="working">
      <FormRow title="Type" :full-width="true">
        <span class="modal-form-readonly">{{ record.type }}</span>
      </FormRow>
      <FormRow title="State" :full-width="true">
        <ModalFormSelect v-model="form.state">
          <option v-for="s in stateNames" :key="s" :value="s">{{ s }}</option>
        </ModalFormSelect>
      </FormRow>
      <FormRow :title="dateTitle" :full-width="true">
        <ModalFormInput v-model="form.date" type="date" />
      </FormRow>
      <FormRow title="Notes" :full-width="true">
        <ModalFormInput v-model="form.notes" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
  <ConfirmModal
    v-if="confirmingState"
    title="Change State?"
    :body="`Updating the Record to ${form.state} will archive this Record and create a new one.`"
    confirm-label="Add New"
    confirm-icon="add"
    @close="confirmingState = false"
    @confirm="emit('changeState', form.state)"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ConfirmModal from './ConfirmModal.vue'
import type { RecordResponse } from '../../../../types/api-responses'
import { dateLabel, statesOfType, type RecordState } from '../../../../types/record-state'
import ModalLayout from '../../components/ModalLayout.vue'
import AppButton from '../../components/AppButton.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'

export interface SaveRecordPayload {
  state: string
  date: string
  notes: string
}

const props = defineProps<{
  record: RecordResponse
  /** The States list: Edit offers the Record's Type's States. */
  states: RecordState[]
  working: boolean
  error?: string
  /** Heading; defaults to "Edit Record". The Records page uses the Profile's name, as Edit Entry does. */
  title?: string
  /** Shows View Profile at the top (Records page), as Edit Entry does. */
  profileClick?: () => void
  /** Shows View Archive at the top: the Records page for this Profile and Type (viewRecords). */
  archiveClick?: () => void
  /** The Profile's current Record of its Type: changing its State adds a new Record (#322 §1). */
  isCurrent?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: SaveRecordPayload]
  delete: []
  /** The current Record's State was changed and confirmed: add a new Record with this State. */
  changeState: [state: string]
}>()

const form = reactive({
  state: props.record.stateName,
  date: props.record.date?.slice(0, 10) ?? '',
  notes: props.record.notes ?? '',
})

/** The Date field's label from the chosen State (Before, else After, else Date). */
const dateTitle = computed(() => dateLabel(statesOfType(props.states, props.record.type).find(s => s.name === form.state)))

/** The Record's Type's States (by ID); its current State stays offered even if it's no longer listed. */
const stateNames = computed(() => {
  const names = statesOfType(props.states, props.record.type).map(st => st.name)
  return props.record.stateName && !names.includes(props.record.stateName) ? [props.record.stateName, ...names] : names
})

const confirmingState = ref(false)

function save() {
  // A new State on the current Record is a new Record; an older Record is corrected in place
  if (props.isCurrent && form.state !== props.record.stateName) {
    confirmingState.value = true
    return
  }
  emit('save', {
    state: form.state,
    date: form.date,
    notes: form.notes,
  })
}
</script>

