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
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'

export type AddSessionPayload = {
  groupId: number
  date: string
  name?: string
}

type GroupOption = { id: number; key: string; displayName?: string | null }

const props = defineProps<{
  group?: GroupDetailResponse
  groups?: GroupOption[]
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
  })
}
</script>
