<template>
  <div class="sab-wrap">
    <AppButton v-if="canUpload" icon="uploadphoto" label="Upload" mode="icon-responsive" @click="onUpload" />
    <AppButton v-if="allowEdit" icon="edit" label="Edit" mode="icon-responsive" @click="showEdit = true" />

    <EntryUploadPickerModal
      v-if="showPicker"
      :entries="session.entries"
      @close="showPicker = false"
      @select="goUpload"
    />

    <SessionEditModal
      v-if="showEdit"
      :session="session"
      :groups="groups"
      :working="editWorking"
      :error="editError"
      @close="showEdit = false"
      @save="emit('session-save', $event)"
      @delete="emit('session-delete')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import type { GroupItem, SessionSaveData } from '../../pages/modals/SessionEditModal.vue'
import AppButton from '../AppButton.vue'
import SessionEditModal from '../../pages/modals/SessionEditModal.vue'
import EntryUploadPickerModal from '../../pages/modals/EntryUploadPickerModal.vue'

const props = defineProps<{
  session: SessionDetailResponse
  groupKey: string
  date: string
  groups: GroupItem[]
  editWorking: boolean
  editError?: string
  allowEdit: boolean
  isSelfService: boolean
}>()

const emit = defineEmits<{
  'session-save': [data: SessionSaveData]
  'session-delete': []
}>()

const showPicker = ref(false)
const showEdit = ref(false)

const canUpload = computed(() =>
  (props.isSelfService && !!props.session.userEntryId) || props.allowEdit
)

function onUpload() {
  if (props.isSelfService && props.session.userEntryId) {
    window.location.href = `/upload?entryId=${props.session.userEntryId}`
    return
  }
  showPicker.value = true
}

function goUpload(entryId: number) {
  window.location.href = `/upload?entryId=${entryId}`
}

function closeEdit() {
  showEdit.value = false
}

defineExpose({ closeEdit })
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
