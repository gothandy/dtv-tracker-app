<template>
  <ModalLayout
    title="Edit Session"
    action="Save"
    action-icon="save"
    show-delete
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <FormLayout :disabled="working">
      <FormRow title="Display Name" :full-width="true">
        <ModalFormInput v-model="form.displayName" placeholder="Leave blank to use group name" />
      </FormRow>

      <FormRow title="Description" :full-width="true">
        <ModalFormTextarea v-model="form.description" />
      </FormRow>

      <template v-if="profile.isAdmin">
        <FormRow title="Date" :full-width="true">
          <ModalFormInput v-model="form.date" type="date" />
        </FormRow>

        <FormRow title="Start time" :full-width="true">
          <ModalFormInput v-model="form.time" type="time" />
        </FormRow>

        <FormRow title="Length (hours)" :full-width="true">
          <ModalFormInput v-model="form.hours" type="number" min="0.25" step="0.25" />
        </FormRow>

        <FormRow title="Group" :full-width="true">
          <ModalFormSelect v-model="form.groupId">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </ModalFormSelect>
        </FormRow>

        <FormRow title="Project" :full-width="true">
          <ModalFormSelect v-model="form.projectId" :placeholder="form.projectId === null">
            <option :value="null">No project</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </ModalFormSelect>
        </FormRow>

        <FormRow title="Limits JSON" :full-width="true">
          <ModalFormInput v-model="form.limitsRaw" placeholder='{"new":4,"total":20}' />
        </FormRow>

        <FormRow title="Eventbrite Event ID" :full-width="true">
          <ModalFormInput v-model="form.eventbriteEventId" />
        </FormRow>
      </template>
    </FormLayout>

    <p v-if="validationError" class="modal-form-error">{{ validationError }}</p>
    <p v-else-if="error" class="modal-form-error">{{ error }}</p>
  </ModalLayout>

  <DeleteModal
    v-if="confirmDelete"
    title="Delete Session?"
    body="This will permanently delete the session and all its entries."
    :working="working"
    @close="confirmDelete = false"
    @confirm="emit('delete')"
  />
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useViewer } from '../../composables/useViewer'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormTextarea from '../../components/forms/ModalFormTextarea.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import DeleteModal from './DeleteModal.vue'
import {
  resolveSessionLength,
  resolveSessionTime,
} from '../../utils/sessionTime'

export interface GroupItem { id: number; name: string; key: string }

export interface ProjectItem { id: number; name: string; key: string }

export interface SessionSaveData {
  displayName: string
  description: string
  date: string
  /** HH:MM 24-hour; blank → 09:30 */
  time: string
  /** Hours; blank → 3 */
  length: number
  groupId: number | null
  projectId: number | null
  limits: Record<string, unknown> | null
  eventbriteEventId: string
}

const props = defineProps<{
  session: SessionDetailResponse
  groups: GroupItem[]
  projects: ProjectItem[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [data: SessionSaveData]
  delete: []
}>()

const profile = useViewer()

const confirmDelete = ref(false)
const validationError = ref('')

const form = reactive({
  displayName: props.session.displayName ?? '',
  description: props.session.description ?? '',
  date: props.session.date,
  time: resolveSessionTime(props.session.time),
  // Named hours (not length) — reactive objects with a numeric `length` break v-model updates
  hours: String(resolveSessionLength(props.session.length)),
  groupId: props.session.groupId ?? null as number | null,
  projectId: props.session.projectId ?? null as number | null,
  limitsRaw: props.session.storedLimits && Object.keys(props.session.storedLimits).length ? JSON.stringify(props.session.storedLimits) : '',
  eventbriteEventId: props.session.eventbriteEventId ?? '',
})

function save() {
  validationError.value = ''
  let limits: Record<string, unknown> | null = null
  if (profile.isAdmin) {
    const limitsRaw = form.limitsRaw.trim()
    if (limitsRaw !== '') {
      try {
        limits = JSON.parse(limitsRaw)
      } catch {
        validationError.value = 'Limits JSON is invalid'
        return
      }
    }
  }
  emit('save', {
    displayName: form.displayName,
    description: form.description,
    date: form.date,
    time: resolveSessionTime(form.time),
    length: resolveSessionLength(form.hours),
    groupId: form.groupId,
    projectId: form.projectId,
    limits,
    eventbriteEventId: form.eventbriteEventId,
  })
}
</script>
