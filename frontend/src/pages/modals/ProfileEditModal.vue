<template>
  <ModalLayout
    title="Edit Profile"
    action="Save"
    action-icon="save"
    :show-delete="showDelete"
    :delete-disabled="deleteDisabled"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="emit('delete')"
  >
    <FormLayout :disabled="working">
      <FormRow title="Name" :full-width="true">
        <ModalFormInput v-model="form.name" />
      </FormRow>
      <FormRow title="Emails" :full-width="true">
        <ModalFormInput v-model="form.emails" placeholder="email comma-separated" />
      </FormRow>
      <FormRow title="Match Name" :full-width="true">
        <ModalFormInput v-model="form.matchName" />
      </FormRow>
      <FormRow v-if="showUser" title="Username" :full-width="true">
        <ModalFormInput v-model="form.user" placeholder="e.g. andrew.davies@dtv.org.uk" />
      </FormRow>
      <FormRow title="Is Group" :full-width="true">
        <ModalFormCheckbox v-model="form.isGroup" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { ProfileDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormCheckbox from '../../components/forms/ModalFormCheckbox.vue'

export interface EditProfilePayload {
  name: string
  emails: string[]
  matchName: string
  user?: string
  isGroup: boolean
}

const props = defineProps<{
  profile: ProfileDetailResponse
  showUser: boolean
  showDelete: boolean
  deleteDisabled?: boolean
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: EditProfilePayload]
  delete: []
}>()

const form = reactive({
  name: props.profile.name ?? '',
  emails: props.profile.emails.join(', '),
  matchName: props.profile.matchName ?? '',
  user: props.profile.user ?? '',
  isGroup: props.profile.isGroup,
})

function save() {
  emit('save', {
    name: form.name,
    emails: form.emails.split(',').map((e: string) => e.trim()).filter(Boolean),
    matchName: form.matchName,
    user: form.user || undefined,
    isGroup: form.isGroup,
  })
}
</script>
