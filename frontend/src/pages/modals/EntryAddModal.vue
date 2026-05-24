<template>
  <ModalLayout
    title="Add Entry"
    action="Add"
    action-icon="add"
    :action-disabled="!canAdd"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="addEntry"
  >
    <FormLayout :disabled="working">
      <FormRow title="Name" :full-width="true">
        <ProfilePicker
          ref="picker"
          :profiles="profiles"
          :add-new="addNew"
          @select="onSelect"
        />
      </FormRow>

      <FormRow title="No match? Add new">
        <ModalFormCheckbox
          v-model="addNew"
          :disabled="selectedProfile !== null"
          @change="onAddNewToggle"
        />
      </FormRow>

      <FormRow title="Email" :full-width="true">
        <ModalFormInput
          v-model="emailInput"
          type="email"
          placeholder="Enter email address"
          autocomplete="off"
          :disabled="!addNew"
        />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ProfilePicker, { type PickerProfile } from '../../components/ProfilePicker.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormCheckbox from '../../components/forms/ModalFormCheckbox.vue'

type AddPayload = { profileId: number } | { newName: string; newEmail: string }

defineProps<{ profiles: PickerProfile[]; working: boolean; error?: string }>()
const emit = defineEmits<{ close: []; add: [payload: AddPayload] }>()

const picker = ref<InstanceType<typeof ProfilePicker> | null>(null)
const selectedProfile = ref<PickerProfile | null>(null)
const addNew = ref(false)
const emailInput = ref('')

const canAdd = computed(() => selectedProfile.value !== null || addNew.value)

function onSelect(profile: PickerProfile | null) {
  selectedProfile.value = profile
  emailInput.value = profile?.email ?? ''
}

function onAddNewToggle() {
  selectedProfile.value = null
  emailInput.value = ''
  if (!addNew.value) picker.value?.reset()
}

function addEntry() {
  if (addNew.value) {
    emit('add', { newName: picker.value?.query ?? '', newEmail: emailInput.value })
  } else if (selectedProfile.value) {
    emit('add', { profileId: selectedProfile.value.id })
  }
}
</script>
