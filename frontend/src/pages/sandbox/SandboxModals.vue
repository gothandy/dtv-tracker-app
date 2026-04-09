<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Modals</h1>

      <div class="row">
        <div>
          <h2>Edit Session</h2>
          <AppButton label="Open" @click="open = 'edit-session'" />
        </div>
        <div>
          <h2>Set Hours</h2>
          <AppButton label="Open" @click="open = 'set-hours'" />
        </div>
        <div>
          <h2>Edit Entry</h2>
          <AppButton label="Open" @click="open = 'edit-entry'" />
        </div>
        <div>
          <h2>Add Entry</h2>
          <AppButton label="Open" @click="open = 'add-entry'" />
        </div>
        <div>
          <h2>Upload Picker</h2>
          <AppButton label="Open" @click="open = 'upload-picker'" />
        </div>
        <div>
          <h2>Edit Media</h2>
          <AppButton label="Open" @click="open = 'edit-media'" />
        </div>
      </div>

      <label class="fail-toggle">
        <input type="checkbox" v-model="failNext" /> Fail next action
      </label>

      <EditSessionModal
        v-if="open === 'edit-session'"
        :session="mockSession"
        group-key="sheepskull"
        date="2026-04-03"
        @close="closeModal('close')"
        @saved="closeModal('edit-session: saved')"
      />

      <SetHoursModal
        v-if="open === 'set-hours'"
        :entry-count="2"
        :default-hours="3"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @set-hours="onSetHours"
      />

      <EditEntryModal
        v-if="open === 'edit-entry'"
        :entry="mockEntry"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @save="onEditSave"
        @delete="onEditDelete"
      />

      <AddEntryModal
        v-if="open === 'add-entry'"
        :profiles="mockProfiles"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @add="onAdd"
      />

      <UploadPickerModal
        v-if="open === 'upload-picker'"
        :entries="mockEntries"
        @close="closeModal('close')"
        @select="closeModal('upload-picker: select')"
      />

      <EditMediaModal
        v-if="open === 'edit-media'"
        :item="mockMediaItem"
        :show-cover="true"
        :is-cover="false"
        @close="closeModal('close')"
        @save="closeModal('edit-media: save')"
        @delete="closeModal('edit-media: delete')"
      />

      <h2>Event log</h2>
      <div class="event-log">
        <div v-if="!events.length" class="event-log-empty">No events yet.</div>
        <div v-for="(e, i) in events" :key="i">{{ e }}</div>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import AppButton from '../../components/AppButton.vue'
import EditSessionModal from '../modals/EditSessionModal.vue'
import SetHoursModal from '../modals/SetHoursModal.vue'
import EditEntryModal from '../modals/EditEntryModal.vue'
import AddEntryModal from '../modals/AddEntryModal.vue'
import UploadPickerModal from '../modals/UploadPickerModal.vue'
import EditMediaModal from '../modals/EditMediaModal.vue'
import type { MediaItem } from '../../types/media'
import type { EntryItem } from '../../types/entry'
import type { PickerProfile } from '../../components/ProfilePicker.vue'

usePageTitle('Sandbox')

const open = ref<string | null>(null)
const working = ref(false)
const error = ref('')
const failNext = ref(false)
const events = ref<string[]>([])

function log(msg: string) {
  events.value.unshift(msg)
}

function closeModal(event: string) {
  log(event)
  open.value = null
  working.value = false
  error.value = ''
}

async function simulate(label: string) {
  working.value = true
  error.value = ''
  log(`${label} → saving…`)
  await new Promise(r => setTimeout(r, 2000))
  if (failNext.value) {
    failNext.value = false
    working.value = false
    error.value = 'Server error — please try again'
    log(`${label} → failed`)
    return
  }
  log(`${label} → done`)
  open.value = null
  working.value = false
}

function onSetHours(hours: number) {
  simulate(`set-hours: ${hours}h`)
}

function onEditSave(data: { checkedIn: boolean; count: number; hours: number; notes: string }) {
  simulate(`edit-entry save → checkedIn=${data.checkedIn}, hours=${data.hours}, notes="${data.notes}"`)
}

function onEditDelete() {
  simulate('edit-entry: delete')
}

function onAdd(payload: { profileId: number } | { newName: string; newEmail: string }) {
  simulate(`add-entry: ${JSON.stringify(payload)}`)
}

// --- mock data ---

const mockSession = {
  id: 1,
  displayName: 'Morning Session',
  description: 'A description of the session.',
  date: '2026-04-03',
  groupId: 1,
  eventbriteEventId: '',
  limits: { new: 4, total: 20 },
  registrations: 3,
  hours: 9,
  financialYear: '2025/26',
  isBookable: false,
  coverMediaId: null,
  statsRaw: null,
  entries: [],
}

const mockEntry: EntryItem = {
  id: 1,
  checkedIn: false,
  hours: 0,
  count: 1,
  notes: '#New',
  profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: true, cardStatus: 'Accepted', isGroup: false },
  session: { groupKey: 'dhsc', groupName: 'Sheepskull', date: '2026-04-19' },
}

const mockProfiles: PickerProfile[] = [
  { id: 1, name: 'Alice Bowen', email: 'alice@example.com' },
  { id: 2, name: 'Bob Carter', email: 'bob@example.com' },
  { id: 3, name: 'Carol Davies', email: 'carol@example.com' },
]

const mockMediaItem: MediaItem = {
  id: 'mock-media-1',
  listItemId: 0,
  thumbnailUrl: '/media/adhoc/2026-03-26/cover.jpg',
  largeUrl: '/media/adhoc/2026-03-26/cover.jpg',
  mimeType: 'image/jpeg',
  title: 'Sample photo',
  isPublic: true,
}

const session = { groupKey: 'dhsc', groupName: 'Sheepskull', date: '2026-04-19' }
const mockEntries: EntryItem[] = [
  { id: 1, checkedIn: true,  hours: 0, count: 1, profile: { name: 'Jane Smith',  slug: 'jane-smith-1',  isMember: false, isGroup: false }, session },
  { id: 2, checkedIn: true,  hours: 0, count: 1, profile: { name: 'John Doe',    slug: 'john-doe-2',    isMember: false, isGroup: false }, session },
  { id: 3, checkedIn: false, hours: 3, count: 1, profile: { name: 'Alice Brown', slug: 'alice-brown-3', isMember: false, isGroup: false }, session },
]
</script>

<style scoped>
.sandbox { gap: 2rem; }

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.fail-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  cursor: pointer;
}
</style>
