<template>
  <ModalLayout
    title="Add Entry"
    action="Add"
    action-icon="new"
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

      <FormRow title="Email" :full-width="true">
        <input
          v-model="emailInput"
          class="aem-input"
          :disabled="!addNew"
          placeholder="email@example.com"
          type="email"
          autocomplete="off"
        />
      </FormRow>

      <FormRow title="Add New">
        <input type="checkbox" class="aem-checkbox" v-model="addNew" @change="onAddNewToggle" />
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

type AddPayload = { profileId: number } | { newName: string; newEmail: string }

const props = defineProps<{ profiles: PickerProfile[]; working: boolean; error?: string }>()
const emit = defineEmits<{ close: []; add: [payload: AddPayload] }>()

const picker = ref<InstanceType<typeof ProfilePicker> | null>(null)
const selectedProfile = ref<PickerProfile | null>(null)
const addNew = ref(false)
const emailInput = ref('')

const canAdd = computed(() => selectedProfile.value !== null || addNew.value)

function onSelect(profile: PickerProfile | null) {
  selectedProfile.value = profile
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

<style scoped>
.aem-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.aem-input:disabled { color: var(--color-text-muted); }

.aem-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}
</style>
