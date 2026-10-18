<template>
  <div class="pda-wrap">
    <AppButton label="Edit" icon="edit" mode="icon-responsive" @click="showEdit = true" />
    <AppButton
      v-if="switchAccessTo"
      :label="switchAccessTo === 'admin' ? 'To Admin' : 'To Assist'"
      :title="`Switch to ${switchAccessTo === 'admin' ? ACCESS_LABEL_ADMIN : ACCESS_LABEL_CHECK_IN}`"
      :icon="switchAccessTo === 'admin' ? 'arrows/up' : 'arrows/down'"
      mode="icon-responsive"
      :working="accessWorking"
      @click="emit('switchAccess', switchAccessTo)"
    />
    <AppButton
      v-if="allowTransfer"
      label="Transfer"
      icon="transfer"
      mode="icon-responsive"
      @click="onTransferClick"
    />

    <ProfileEditModal
      v-if="showEdit"
      :profile="profile"
      :show-user="showUser"
      :show-delete="showUser"
      :delete-disabled="!canDelete"
      :working="workingEdit"
      :error="editError"
      @close="showEdit = false"
      @save="onSaveEdit"
      @delete="showEdit = false; showDelete = true"
    />

    <DeleteModal
      v-if="showDelete"
      :title="`Delete ${profile.name ?? 'profile'}?`"
      body="This will permanently delete the profile and cannot be undone."
      :working="workingDelete"
      @close="showDelete = false"
      @confirm="onConfirmDelete"
    />

    <ProfileTransferModal
      v-if="showTransfer"
      :profile="profile"
      :profiles="profiles"
      :working="workingTransfer"
      :error="transferError"
      @close="showTransfer = false"
      @save="onSaveTransfer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProfileDetailResponse } from '../../../../types/api-responses'
import type { PickerProfile } from '../ProfilePicker.vue'
import AppButton from '../AppButton.vue'
import ProfileEditModal, { type EditProfilePayload } from '../../pages/modals/ProfileEditModal.vue'
import ProfileTransferModal, { type TransferProfilePayload } from '../../pages/modals/ProfileTransferModal.vue'
import DeleteModal from '../../pages/modals/DeleteModal.vue'
import { ACCESS_LABEL_ADMIN, ACCESS_LABEL_CHECK_IN } from '../../utils/accessLabels'

const props = defineProps<{
  profile: ProfileDetailResponse
  showUser: boolean
  allowTransfer: boolean
  profiles: PickerProfile[]
  /** On your own profile, if you're on the admin list: the access to switch to. */
  switchAccessTo?: 'admin' | 'checkin' | null
  accessWorking?: boolean
}>()

const emit = defineEmits<{
  editProfile: [data: EditProfilePayload]
  deleteProfile: []
  transferOpen: []
  transferProfile: [data: TransferProfilePayload]
  switchAccess: [role: 'admin' | 'checkin']
}>()

const canDelete = computed(() =>
  props.profile.entries.length === 0 &&
  !props.profile.records?.length &&
  props.profile.regularCount === 0
)

const showEdit = ref(false)
const workingEdit = ref(false)
const editError = ref('')

const showDelete = ref(false)
const workingDelete = ref(false)

const showTransfer = ref(false)
const workingTransfer = ref(false)
const transferError = ref('')

function onSaveEdit(payload: EditProfilePayload) {
  workingEdit.value = true
  editError.value = ''
  emit('editProfile', payload)
}

function onConfirmDelete() {
  workingDelete.value = true
  emit('deleteProfile')
}

function onTransferClick() {
  emit('transferOpen')
  showTransfer.value = true
}

function onSaveTransfer(payload: TransferProfilePayload) {
  workingTransfer.value = true
  transferError.value = ''
  emit('transferProfile', payload)
}

defineExpose({
  onEditSuccess() {
    showEdit.value = false
    workingEdit.value = false
    editError.value = ''
  },
  onEditError(msg: string) {
    workingEdit.value = false
    editError.value = msg
  },
  onDeleteSuccess() {
    showDelete.value = false
    workingDelete.value = false
  },
  onDeleteError() {
    workingDelete.value = false
  },
  onTransferSuccess() {
    showTransfer.value = false
    workingTransfer.value = false
    transferError.value = ''
  },
  onTransferError(msg: string) {
    workingTransfer.value = false
    transferError.value = msg
  },
})
</script>

<style scoped>
.pda-wrap {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
}
</style>
