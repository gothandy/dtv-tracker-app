<template>
  <ModalLayout
    :title="entry?.volunteerName ?? '…'"
    action="Save"
    action-icon="save"
    show-delete
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <div v-if="loading" class="eem-status">Loading…</div>
    <div v-else-if="loadError" class="eem-status eem-error">{{ loadError }}</div>

    <template v-else-if="entry">

      <div v-if="entry.volunteerSlug" class="eem-actions">
        <AppButton label="View Profile" icon="profile" @click="router.push(profilePath(entry.volunteerSlug!))" />
      </div>

      <ModalRow title="Checked In">
        <input type="checkbox" class="eem-checkbox" v-model="form.checkedIn" />
      </ModalRow>

      <ModalRow title="Count">
        <input type="number" class="eem-input" v-model.number="form.count" min="1" />
      </ModalRow>

      <ModalRow title="Hours">
        <input type="number" class="eem-input" v-model.number="form.hours" min="0" step="0.5" />
      </ModalRow>

      <ModalRow title="Notes" :full-width="true">
        <textarea class="eem-textarea" v-model="form.notes" rows="2" />
        <EntryTagPicker v-model="form.notes" />
      </ModalRow>

      <div v-if="saveError" class="eem-error">{{ saveError }}</div>

    </template>
  </ModalLayout>

  <ModalLayout
    v-if="confirmDelete"
    title="Delete entry?"
    action="Cancel"
    show-delete
    @close="confirmDelete = false"
    @action="confirmDelete = false"
    @delete="deleteEntry"
  />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { profilePath } from '../../router/index'
import ModalLayout from '../../components/ModalLayout.vue'
import ModalRow from '../../components/ModalRow.vue'
import AppButton from '../../components/AppButton.vue'
import EntryTagPicker from '../../components/EntryTagPicker.vue'

const props = defineProps<{ entryId: number }>()
const emit = defineEmits<{ close: []; saved: []; deleted: [] }>()

const router = useRouter()

interface EntryDetail {
  id: number
  volunteerName?: string
  volunteerSlug?: string
  isGroup: boolean
  isMember: boolean
  checkedIn: boolean
  count: number
  hours: number
  notes?: string
}

const entry = ref<EntryDetail | null>(null)
const loading = ref(false)
const loadError = ref('')
const saveError = ref('')
const saving = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)

const form = reactive({ checkedIn: false, count: 1, hours: 0, notes: '' })


onMounted(async () => {
  loading.value = true
  try {
    const res = await fetch(`/api/entries/${props.entryId}`)
    if (!res.ok) throw new Error(`Failed to load (${res.status})`)
    const json = await res.json()
    entry.value = json.data
    form.checkedIn = json.data.checkedIn
    form.count = json.data.count
    form.hours = json.data.hours
    form.notes = json.data.notes ?? ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Load failed'
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  saveError.value = ''
  try {
    const res = await fetch(`/api/entries/${props.entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedIn: form.checkedIn, count: form.count, hours: form.hours, notes: form.notes }),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    emit('saved')
    emit('close')
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function deleteEntry() {
  deleting.value = true
  try {
    const res = await fetch(`/api/entries/${props.entryId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    emit('deleted')
    emit('close')
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Delete failed'
    confirmDelete.value = false
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.eem-status { font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 1rem; }
.eem-error { color: var(--color-error); }

.eem-actions { margin-bottom: 1.25rem; }

.eem-input {
  width: 5rem;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
}

.eem-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}

.eem-textarea {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.4rem 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}
</style>
