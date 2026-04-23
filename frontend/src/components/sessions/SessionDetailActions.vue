<template>
  <div class="sab-wrap">
    <AppButton icon="share" label="Share" mode="icon-only" @click="onShare" />
    <AppButton icon="group" label="Group" mode="icon-only" @click="router.push(groupPath(groupKey))" />
    <AppButton v-if="canUpload" icon="uploadphoto" label="Upload" mode="icon-only" @click="onUpload" />
    <AppButton v-if="allowEmail" icon="email" label="Email" mode="icon-only" @click="showEmail = true" />
    <AppButton v-if="allowEdit" icon="edit" label="Edit" mode="icon-only" @click="showEdit = true" />

    <EntryUploadPickerModal
      v-if="showPicker"
      :entries="session.entries"
      @close="showPicker = false"
      @select="goUpload"
    />

    <SessionEmailSendModal
      v-if="showEmail"
      :adults="adults"
      :working="emailWorking"
      :error="emailError"
      @close="showEmail = false"
      @send="onEmailSend"
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
import { useRouter } from 'vue-router'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import type { GroupItem, SessionSaveData } from '../../pages/modals/SessionEditModal.vue'
import type { EmailAdult } from '../../pages/modals/SessionEmailSendModal.vue'
import AppButton from '../AppButton.vue'
import SessionEditModal from '../../pages/modals/SessionEditModal.vue'
import SessionEmailSendModal from '../../pages/modals/SessionEmailSendModal.vue'
import EntryUploadPickerModal from '../../pages/modals/EntryUploadPickerModal.vue'
import { groupPath } from '../../router/index'
import { shareCurrentUrl } from '../../utils/shareUrl'

const props = defineProps<{
  session: SessionDetailResponse
  groupKey: string
  date: string
  groups: GroupItem[]
  editWorking: boolean
  editError?: string
  allowEdit: boolean
  allowEmail: boolean
  isSelfService: boolean
}>()

const emit = defineEmits<{
  'session-save': [data: SessionSaveData]
  'session-delete': []
}>()

const router = useRouter()
const showPicker = ref(false)
const showEdit = ref(false)
const showEmail = ref(false)
const emailWorking = ref(false)
const emailError = ref<string | undefined>()

const canUpload = computed(() =>
  (props.isSelfService && !!props.session.userEntryId) || props.allowEdit
)

// Adults = non-cancelled, non-group, non-child entries (email may be absent)
const adults = computed<EmailAdult[]>(() =>
  props.session.entries
    .filter(e => !e.cancelled && !e.isGroup && !/#Child\b/i.test(e.notes ?? ''))
    .map(e => ({ entryId: e.id, name: e.volunteerName ?? '', email: e.email }))
)

function onShare() {
  shareCurrentUrl()
}

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

async function sendOne(entryId: number, preview: boolean, template: string): Promise<boolean> {
  const res = await fetch(`/api/entries/${entryId}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preview, template }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    emailError.value = data.error || 'Failed to send email'
    return false
  }
  return true
}

async function onEmailSend({ recipient, preview, template }: { recipient: number | 'send-all', preview: boolean, template: string }) {
  emailWorking.value = true
  emailError.value = undefined
  try {
    if (recipient === 'send-all') {
      const emailable = adults.value.filter(a => a.email)
      if (!emailable.length) {
        emailError.value = 'No recipients have an email address'
        return
      }
      for (const adult of emailable) {
        const ok = await sendOne(adult.entryId, false, template)
        if (!ok) return
      }
    } else {
      const ok = await sendOne(recipient, preview, template)
      if (!ok) return
    }
    showEmail.value = false
  } catch {
    emailError.value = 'Failed to send email'
  } finally {
    emailWorking.value = false
  }
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
