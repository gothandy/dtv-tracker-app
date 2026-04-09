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
        <input v-model="form.name" class="gem-input" placeholder="Leave blank to use key" />
      </FormRow>

      <FormRow title="Key" :full-width="true">
        <input v-model="form.key" class="gem-input" />
      </FormRow>

      <FormRow title="Description" :full-width="true">
        <textarea v-model="form.description" class="gem-textarea" rows="3" />
      </FormRow>

      <FormRow title="Eventbrite Series ID" :full-width="true">
        <input v-model="form.eventbriteSeriesId" class="gem-input" />
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

<style scoped>
.gem-input,
.gem-textarea {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.gem-textarea { resize: vertical; }
</style>
