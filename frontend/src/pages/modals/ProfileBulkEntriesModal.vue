<template>
  <ModalLayout
    :title="`Add Entries — ${count} ${count === 1 ? 'profile' : 'profiles'}`"
    action="Add"
    action-icon="add"
    :action-disabled="!sessionId || count === 0 || loadingSessions || !futureSessions.length"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
  >
    <FormLayout :disabled="working">
      <FormRow title="Session" :full-width="true">
        <LoadingSpinner v-if="loadingSessions" />
        <p v-else-if="sessionsError" class="modal-form-hint">{{ sessionsError }}</p>
        <p v-else-if="!futureSessions.length" class="modal-form-hint">No future sessions available.</p>
        <ModalFormSelect v-else v-model="sessionId">
          <option value="" disabled>Select session…</option>
          <option v-for="s in futureSessions" :key="s.id" :value="String(s.id)">{{ sessionLabel(s) }}</option>
        </ModalFormSelect>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'

interface SessionOption {
  id: number
  date: string
  groupName?: string
  groupKey?: string
  displayName?: string
  isBookable: boolean
}

export interface BulkEntriesPayload {
  sessionId: number
}

defineProps<{
  count: number
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: BulkEntriesPayload]
}>()

const sessionId = ref('')
const loadingSessions = ref(true)
const sessionsError = ref('')
const sessions = ref<SessionOption[]>([])

const futureSessions = computed(() =>
  sessions.value.filter(s => s.isBookable).sort((a, b) => a.date.localeCompare(b.date))
)

function sessionLabel(s: SessionOption): string {
  const date = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const name = s.displayName || s.groupName || s.groupKey || 'Session'
  return `${date} — ${name}`
}

function save() {
  const id = parseInt(sessionId.value, 10)
  if (isNaN(id)) return
  emit('save', { sessionId: id })
}

onMounted(async () => {
  loadingSessions.value = true
  sessionsError.value = ''
  try {
    const res = await fetch('/api/sessions')
    if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`)
    const json = await res.json()
    sessions.value = json.data ?? []
  } catch (e) {
    sessionsError.value = e instanceof Error ? e.message : 'Failed to load sessions'
    console.error('[ProfileBulkEntriesModal] load sessions', e)
  } finally {
    loadingSessions.value = false
  }
})
</script>
