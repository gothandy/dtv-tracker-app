<template>
  <div class="pda-wrap">
    <AppButton label="Edit" icon="edit" mode="icon-responsive" @click="showEdit = true" />

    <ProfileEditModal
      v-if="showEdit"
      :profile="profile"
      :show-user="showUser"
      :working="workingEdit"
      :error="editError"
      @close="showEdit = false"
      @save="onSaveEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ProfileDetailResponse } from '../../../../types/api-responses'
import AppButton from '../AppButton.vue'
import ProfileEditModal, { type EditProfilePayload } from '../../pages/modals/ProfileEditModal.vue'

const props = defineProps<{
  profile: ProfileDetailResponse
  showUser: boolean
}>()

const emit = defineEmits<{
  editProfile: [data: EditProfilePayload]
}>()

const showEdit = ref(false)
const workingEdit = ref(false)
const editError = ref('')

function onSaveEdit(payload: EditProfilePayload) {
  workingEdit.value = true
  editError.value = ''
  emit('editProfile', payload)
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
