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
        <ModalFormInput v-model="form.length" type="number" min="0.25" step="0.25" placeholder="3" />
      </FormRow>

      <FormRow title="Display Name" :full-width="true">
        <ModalFormInput v-model="form.name" :placeholder="group?.displayName || group?.key || ''" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { GroupDetailResponse } from '../../../../types/api-responses'
import type { ProjectItem } from './SessionEditModal.vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'

export type AddSessionPayload = {
  groupId: number
  date: string
  /** HH:MM 24-hour; blank / omitted → 09:30 */
  time?: string
  /** Hours; blank / omitted → 3 */
  length?: number
  name?: string
  projectId?: number | null
}

const DEFAULT_SESSION_TIME = '09:30'
const DEFAULT_SESSION_LENGTH = 3

function resolveSessionTime(raw: string): string {
  return raw.trim() || DEFAULT_SESSION_TIME
}

function resolveSessionLength(raw: string | number): number {
  if (raw === '' || raw === null || raw === undefined) return DEFAULT_SESSION_LENGTH
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw).trim())
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_SESSION_LENGTH
  return value
}

type GroupOption = { id: number; key: string; displayName?: string | null }

const props = defineProps<{
  group?: GroupDetailResponse
  groups?: GroupOption[]
  projects: ProjectItem[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddSessionPayload]
}>()

const form = reactive({
  date: '',
  time: '',
  length: '' as string | number,
  name: '',
  groupId: '' as number | '',
  projectId: null as number | null,
})

const resolvedGroupId = computed(() =>
  props.group ? props.group.id : (form.groupId || null)
)

function add() {
  if (!resolvedGroupId.value) return
  emit('add', {
    groupId: resolvedGroupId.value,
    date: form.date,
    time: resolveSessionTime(form.time),
    length: resolveSessionLength(form.length),
    name: form.name || undefined,
    projectId: form.projectId,
  })
}
</script>
