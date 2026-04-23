<template>
  <ModalLayout
    title="New Group"
    action="Create"
    :action-disabled="!form.key.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="emit('add', { key: form.key.trim(), name: form.name.trim() || undefined, description: form.description.trim() || undefined })"
  >
    <FormLayout :disabled="working">
      <FormRow title="Key (short name, e.g. &quot;sat&quot;)" :full-width="true">
        <input v-model="form.key" type="text" class="gam-input" placeholder="sat" />
      </FormRow>
      <FormRow title="Display Name (e.g. &quot;Saturday Dig&quot;)" :full-width="true">
        <input v-model="form.name" type="text" class="gam-input" placeholder="Saturday Dig" />
      </FormRow>
      <FormRow title="Description (optional)" :full-width="true">
        <textarea v-model="form.description" class="gam-input gam-textarea"></textarea>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

export type AddGroupPayload = {
  key: string
  name?: string
  description?: string
}

const props = defineProps<{
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddGroupPayload]
}>()

const form = reactive({ key: '', name: '', description: '' })
</script>

<style scoped>
.gam-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.gam-textarea { min-height: 60px; resize: vertical; }
</style>
