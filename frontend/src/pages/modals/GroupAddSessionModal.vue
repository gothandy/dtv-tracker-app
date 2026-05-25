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
  name?: string
  projectId?: number | null
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
    name: form.name || undefined,
    projectId: form.projectId,
  })
}
</script>
