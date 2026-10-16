<template>
  <ModalLayout
    title="Add Session"
    action="Create"
    :action-disabled="!form.date || !resolvedGroupId"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="add"
  >
    <FormLayout :disabled="working">
      <FormRow v-if="groups" title="Group" :full-width="true">
        <ModalFormSelect v-model="form.groupId" :placeholder="form.groupId === ''">
          <option value="">Select a group…</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.displayName || g.key }}</option>
        </ModalFormSelect>
      </FormRow>

      <FormRow title="Project" :full-width="true">
        <ModalFormSelect v-model="form.projectId" :placeholder="form.projectId === null">
          <option :value="null">No project</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </ModalFormSelect>
      </FormRow>

      <FormRow title="Date" :full-width="true">
        <ModalFormInput v-model="form.date" type="date" />
      </FormRow>

      <FormRow title="Start time" :full-width="true">
        <ModalFormInput v-model="form.time" type="time" />
      </FormRow>

      <FormRow title="Length (hours)" :full-width="true">
        <ModalFormInput v-model="form.hours" type="number" min="0.25" step="0.25" />
      </FormRow>

      <FormRow title="Display Name" :full-width="true">
        <ModalFormInput v-model="form.name" :placeholder="group?.displayName || group?.key || ''" />
      </FormRow>

      <FormRow title="Eventbrite Event ID" :full-width="true">
        <ModalFormInput v-model="form.eventbrite" />
      </FormRow>
    </FormLayout>

    <p v-if="validationError" class="modal-form-error">{{ validationError }}</p>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { GroupDetailResponse } from '../../../../types/api-responses'
import type { ProjectItem } from './SessionEditModal.vue'
import type { EventbriteEventOption } from './GroupAddFromEventbriteModal.vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import {
  DEFAULT_SESSION_LENGTH,
  DEFAULT_SESSION_TIME,
  resolveSessionLength,
  resolveSessionTime,
} from '../../utils/sessionTime'

export type AddSessionPayload = {
  groupId: number
  date: string
  /** HH:MM 24-hour; blank / omitted → 09:30 */
  time?: string
  /** Hours; blank / omitted → 3 */
  length?: number
  name?: string
  projectId?: number | null
  /** Set when adding from Eventbrite: the session is linked to this event. */
  eventbriteEventId?: string
}

type GroupOption = { id: number; key: string; displayName?: string | null }

const props = defineProps<{
  group?: GroupDetailResponse
  groups?: GroupOption[]
  projects: ProjectItem[]
  /** Adding from Eventbrite: pre-fills the form from this event and links the session to it. */
  eventbrite?: EventbriteEventOption
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddSessionPayload]
}>()

const validationError = ref('')

const form = reactive({
  date: props.eventbrite?.date ?? '',
  time: props.eventbrite?.time ?? DEFAULT_SESSION_TIME,
  // Named hours (not length) — reactive objects with a numeric `length` break v-model updates
  hours: String(props.eventbrite?.length ?? DEFAULT_SESSION_LENGTH),
  name: props.eventbrite?.name ?? '',
  eventbrite: props.eventbrite?.id ?? '',
  groupId: '' as number | '',
  projectId: null as number | null,
})

const resolvedGroupId = computed(() =>
  props.group ? props.group.id : (form.groupId || null)
)

function add() {
  if (!resolvedGroupId.value) return
  validationError.value = ''
  const length = resolveSessionLength(form.hours)
  if (length === null) {
    validationError.value = 'Length must be a positive number of hours'
    return
  }
  emit('add', {
    groupId: resolvedGroupId.value,
    date: form.date,
    time: resolveSessionTime(form.time),
    length,
    name: form.name || undefined,
    projectId: form.projectId,
    eventbriteEventId: form.eventbrite.trim() || undefined,
  })
}
</script>
