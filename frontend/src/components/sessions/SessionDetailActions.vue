<template>
  <div class="sab-wrap">
    <AppButton v-if="canUpload" icon="uploadphoto" label="Upload" mode="icon-responsive" @click="onUpload" />
    <AppButton v-if="isCheckIn || isAdmin" icon="edit" label="Edit" mode="icon-responsive" @click="showEdit = true" />

    <UploadPickerModal
      v-if="showPicker"
      :entries="session.entries"
      @close="showPicker = false"
      @select="goUpload"
    />

    <EditSessionModal
      v-if="showEdit"
      :session="session"
      :group-key="groupKey"
      :date="date"
      @close="showEdit = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRole } from '../../composables/useRole'
import { sessionPath } from '../../router/index'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import AppButton from '../AppButton.vue'
import EditSessionModal from '../../pages/modals/EditSessionModal.vue'
import UploadPickerModal from '../../pages/modals/UploadPickerModal.vue'

const props = defineProps<{
  session: SessionDetailResponse
  groupKey: string
  date: string
}>()

const emit = defineEmits<{ saved: [groupKey: string, date: string] }>()

const router = useRouter()
const { isAdmin, isCheckIn, isSelfService } = useRole()

const showPicker = ref(false)
const showEdit = ref(false)

const canUpload = computed(() =>
  (isSelfService.value && !!props.session.userEntryId) ||
  isCheckIn.value ||
  isAdmin.value
)

function onUpload() {
  if (isSelfService.value && props.session.userEntryId) {
    window.location.href = `/upload.html?entryId=${props.session.userEntryId}`
    return
  }
  showPicker.value = true
}

function goUpload(entryId: number) {
  window.location.href = `/upload.html?entryId=${entryId}`
}

function onSaved(newGroupKey: string, newDate: string) {
  showEdit.value = false
  emit('saved', newGroupKey, newDate)
  if (newGroupKey !== props.groupKey || newDate !== props.date) {
    router.push(sessionPath(newGroupKey, newDate))
  }
}
</script>

<style scoped>
.sab-wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
}
</style>
