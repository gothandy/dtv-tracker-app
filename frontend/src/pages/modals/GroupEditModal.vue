<template>
  <ModalLayout
    title="Edit Group"
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
      <FormRow title="Display Name" :full-width="true">
        <ModalFormInput v-model="form.name" placeholder="Leave blank to use key" />
      </FormRow>

      <FormRow title="Key" :full-width="true">
        <ModalFormInput v-model="form.key" />
      </FormRow>

      <FormRow title="Description" :full-width="true">
        <ModalFormTextarea v-model="form.description" />
      </FormRow>

      <FormRow title="Eventbrite Series ID" :full-width="true">
        <ModalFormInput v-model="form.eventbriteSeriesId" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { GroupDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormTextarea from '../../components/forms/ModalFormTextarea.vue'

export type EditGroupPayload = {
  name?: string
  key: string
  description?: string
  eventbriteSeriesId?: string
}

const props = defineProps<{
  group: GroupDetailResponse
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: EditGroupPayload]
  delete: []
}>()

const form = reactive({
  name: props.group.displayName ?? '',
  key: props.group.key,
  description: props.group.description ?? '',
  eventbriteSeriesId: props.group.eventbriteSeriesId ?? '',
})

function save() {
  emit('save', {
    name: form.name || undefined,
    key: form.key,
    description: form.description || undefined,
    eventbriteSeriesId: form.eventbriteSeriesId || undefined,
  })
}
</script>
