<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>Modals</h1>

      <div class="row">
        <div>
          <h2>Session Edit</h2>
          <AppButton label="Open" @click="open = 'session-edit'" />
        </div>
        <div>
          <h2>Session Set Hours</h2>
          <AppButton label="Open" @click="open = 'session-set-hours'" />
        </div>
        <div>
          <h2>Session Add Tags</h2>
          <AppButton label="Open" @click="open = 'session-add-tags'" />
        </div>
        <div>
          <h2>Entry Edit</h2>
          <AppButton label="Open" @click="open = 'entry-edit'" />
        </div>
        <div>
          <h2>Entry Add</h2>
          <AppButton label="Open" @click="open = 'entry-add'" />
        </div>
        <div>
          <h2>Entry Upload Picker</h2>
          <AppButton label="Open" @click="open = 'entry-upload-picker'" />
        </div>
        <div>
          <h2>Group Edit</h2>
          <AppButton label="Open" @click="open = 'group-edit'" />
        </div>
        <div>
          <h2>Group Add Session</h2>
          <AppButton label="Open" @click="open = 'group-add-session'" />
        </div>
        <div>
          <h2>Media Edit</h2>
          <AppButton label="Open" @click="open = 'media-edit'" />
        </div>
        <div>
          <h2>Profile Edit</h2>
          <AppButton label="Open" @click="open = 'profile-edit'" />
        </div>
        <div>
          <h2>Record Add</h2>
          <AppButton label="Open" @click="open = 'record-add'" />
        </div>
        <div>
          <h2>Record Edit</h2>
          <AppButton label="Open" @click="open = 'record-edit'" />
        </div>
        <div>
          <h2>Delete</h2>
          <AppButton label="Open" @click="open = 'delete'" />
        </div>
        <div>
          <h2>About</h2>
          <AppButton label="Open" @click="open = 'about'" />
        </div>
      </div>

      <label class="fail-toggle">
        <input type="checkbox" v-model="failNext" /> Fail next action
      </label>

      <SessionEditModal
        v-if="open === 'session-edit'"
        :session="mockSession"
        :groups="mockGroups"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @save="onSessionEditSave"
        @delete="onSessionEditDelete"
      />

      <SessionSetHoursModal
        v-if="open === 'session-set-hours'"
        :entry-count="2"
        :default-hours="3"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @set-hours="onSetHours"
      />

      <EntryEditModal
        v-if="open === 'entry-edit'"
        :entry="mockEntry"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @save="onEditSave"
        @delete="onEditDelete"
      />

      <EntryAddModal
        v-if="open === 'entry-add'"
        :profiles="mockProfiles"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @add="onAdd"
      />

      <EntryUploadPickerModal
        v-if="open === 'entry-upload-picker'"
        :entries="mockEntries"
        @close="closeModal('close')"
        @select="closeModal('entry-upload-picker: select')"
      />

      <MediaEditModal
        v-if="open === 'media-edit'"
        :item="mockMediaItem"
        :show-cover="true"
        :is-cover="false"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @save="onMediaEditSave"
        @delete="onMediaEditDelete"
      />

      <ProfileEditModal
        v-if="open === 'profile-edit'"
        :profile="mockProfile"
        :show-user="true"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @save="onProfileEditSave"
      />

      <RecordAddModal
        v-if="open === 'record-add'"
        :types="mockRecordTypes"
        :statuses="mockRecordStatuses"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @add="onRecordAdd"
      />

      <RecordEditModal
        v-if="open === 'record-edit'"
        :record="mockRecord"
        :statuses="mockRecordStatuses"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @save="onRecordSave"
        @delete="onRecordDelete"
      />

      <GroupEditModal
        v-if="open === 'group-edit'"
        :group="mockGroup"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @save="onGroupEditSave"
        @delete="open = 'delete'; log('group-edit: delete → confirm')"
      />

      <GroupAddSessionModal
        v-if="open === 'group-add-session'"
        :group="mockGroup"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @add="onGroupAddSession"
      />

      <SessionAddTagsModal
        v-if="open === 'session-add-tags'"
        :count="3"
        :working="working"
        :error="error"
        @close="closeModal('close')"
        @save="onAddTags"
      />

      <DeleteModal
        v-if="open === 'delete'"
        title="Delete something?"
        body="This will permanently delete this thing and cannot be undone."
        :working="working"
        @close="closeModal('close')"
        @confirm="onDelete"
      />

      <AboutModal
        v-if="open === 'about'"
        @close="closeModal('close')"
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
import SandboxBackLink from './SandboxBackLink.vue'
import AppButton from '../../components/AppButton.vue'
import SessionEditModal from '../modals/SessionEditModal.vue'
import SessionSetHoursModal from '../modals/SessionSetHoursModal.vue'
import EntryEditModal from '../modals/EntryEditModal.vue'
import EntryAddModal from '../modals/EntryAddModal.vue'
import EntryUploadPickerModal from '../modals/EntryUploadPickerModal.vue'
import MediaEditModal from '../modals/MediaEditModal.vue'
import DeleteModal from '../modals/DeleteModal.vue'
import GroupEditModal from '../modals/GroupEditModal.vue'
import ProfileEditModal from '../modals/ProfileEditModal.vue'
import RecordAddModal from '../modals/RecordAddModal.vue'
import RecordEditModal from '../modals/RecordEditModal.vue'
import GroupAddSessionModal from '../modals/GroupAddSessionModal.vue'
import SessionAddTagsModal from '../modals/SessionAddTagsModal.vue'
import AboutModal from '../../components/AboutModal.vue'
import type { MediaItem } from '../../types/media'
import type { EntryItem } from '../../types/entry'
import type { PickerProfile } from '../../components/ProfilePicker.vue'
import type { SessionSaveData } from '../modals/SessionEditModal.vue'

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
  simulate(`entry-edit save → checkedIn=${data.checkedIn}, hours=${data.hours}, notes="${data.notes}"`)
}

function onEditDelete() {
  simulate('entry-edit: delete')
}

function onDelete() {
  simulate('delete: confirm')
}

function onMediaEditSave(payload: unknown) {
  simulate(`media-edit: save → ${JSON.stringify(payload)}`)
}

function onMediaEditDelete() {
  simulate('media-edit: delete')
}

function onRecordAdd(payload: unknown) {
  simulate(`record-add: add → ${JSON.stringify(payload)}`)
}

function onRecordSave(payload: unknown) {
  simulate(`record-edit: save → ${JSON.stringify(payload)}`)
}

function onRecordDelete() {
  simulate('record-edit: delete')
}

function onProfileEditSave(payload: unknown) {
  simulate(`profile-edit: save → ${JSON.stringify(payload)}`)
}

function onGroupEditSave(payload: unknown) {
  simulate(`group-edit: save → ${JSON.stringify(payload)}`)
}

function onGroupAddSession(payload: unknown) {
  simulate(`group-add-session: add → ${JSON.stringify(payload)}`)
}

function onAddTags(label: string) {
  simulate(`session-add-tags: "${label}"`)
}

function onAdd(payload: { profileId: number } | { newName: string; newEmail: string }) {
  simulate(`entry-add: ${JSON.stringify(payload)}`)
}

function onSessionEditSave(data: SessionSaveData) {
  simulate(`session-edit: save → ${JSON.stringify(data)}`)
}

function onSessionEditDelete() {
  simulate('session-edit: delete')
}

// --- mock data ---

const mockGroups = [
  { id: 1, name: 'Sheepskull', key: 'sheepskull' },
  { id: 2, name: 'Adhoc', key: 'adhoc' },
  { id: 3, name: 'Fundraising', key: 'fundraising' },
]

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

const mockProfile = {
  id: 1,
  slug: 'alice-bowen-1',
  name: 'Alice Bowen',
  emails: ['alice@example.com', 'alice.bowen@old.example.com'],
  matchName: 'alice bowen',
  user: 'alice.bowen@dtv.org.uk',
  isGroup: false,
  isMember: true,
  hoursLastFY: 40,
  hoursThisFY: 12,
  hoursAll: 120,
  groupHours: [],
  entries: [],
  records: [],
}

const mockGroup = {
  id: 1,
  key: 'sheepskull',
  displayName: 'Sheepskull',
  description: 'A volunteer crew.',
  eventbriteSeriesId: '',
  regulars: [],
  financialYear: '2025/26',
  stats: { sessions: 12, hours: 240, newVolunteers: 5, children: 2, totalVolunteers: 30 },
  sessions: [],
}

const mockRecordTypes = [
  'Privacy Consent', 'Photo Consent', 'Newsletter Consent', 'Charity Membership', 'Discount Card',
]
const mockRecordStatuses = ['Accepted', 'Invited', 'Declined', 'Pending']
const mockRecord = { id: 1, type: 'Charity Membership', status: 'Invited', date: '2026-01-15T00:00:00Z' }

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
