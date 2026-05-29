<template>
  <ModalLayout
    title="Transfer Profile"
    action="Transfer"
    action-icon="transfer"
    :action-disabled="!targetProfile"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="transfer"
  >
    <FormLayout :disabled="working">
      <FormRow title="Transfer to" :full-width="true">
        <ProfilePicker
          ref="pickerRef"
          :profiles="filteredProfiles"
          placeholder="Search by name…"
          @select="onSelect"
        />
      </FormRow>
      <FormRow v-if="targetProfile" title="Selected" :full-width="true">
        <span class="ptm-target">{{ targetProfile.name }}</span>
        <button type="button" class="ptm-clear" @click="clearTarget">Clear</button>
      </FormRow>
      <FormRow title="Add to emails" :full-width="true">
        <ModalFormCheckbox v-model="addEmail" :disabled="!canAddEmail" />
      </FormRow>
      <FormRow title="Delete after transfer" :full-width="true">
        <ModalFormCheckbox v-model="deleteAfter" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ProfileDetailResponse } from '../../../../types/api-responses'
import type { PickerProfile } from '../../components/ProfilePicker.vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ProfilePicker from '../../components/ProfilePicker.vue'
import ModalFormCheckbox from '../../components/forms/ModalFormCheckbox.vue'

export interface TransferProfilePayload {
  targetProfileId: number
  deleteAfter: boolean
  addEmail: boolean
}

const props = defineProps<{
  profile: ProfileDetailResponse
  profiles: PickerProfile[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: TransferProfilePayload]
}>()

const pickerRef = ref<InstanceType<typeof ProfilePicker> | null>(null)
const targetProfile = ref<PickerProfile | null>(null)
const deleteAfter = ref(false)
const addEmail = ref(false)

const sourceEmail = computed(() => props.profile.emails[0] ?? '')

const canAddEmail = computed(() => {
  if (!sourceEmail.value) return false
  if (!targetProfile.value) return true
  return targetProfile.value.email !== sourceEmail.value
})

watch(canAddEmail, (ok) => { if (!ok) addEmail.value = false })

const filteredProfiles = computed(() =>
  props.profiles.filter(p => p.id !== props.profile.id)
)

function onSelect(p: PickerProfile | null) {
  targetProfile.value = p
}

function clearTarget() {
  targetProfile.value = null
  pickerRef.value?.reset()
}

function transfer() {
  if (!targetProfile.value) return
  emit('save', {
    targetProfileId: targetProfile.value.id,
    deleteAfter: deleteAfter.value,
    addEmail: addEmail.value,
  })
}
</script>

<style scoped>
.ptm-target {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.ptm-clear {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-dtv-dirt);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.ptm-clear:hover { text-decoration: underline; }
</style>
