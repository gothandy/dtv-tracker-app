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

      <EditSessionModal
        v-if="open === 'edit-session'"
        :session="mockSession"
        group-key="sheepskull"
        date="2026-04-03"
        @close="open = null"
        @saved="open = null"
      />

      <SetHoursModal
        v-if="open === 'set-hours'"
        :entries="mockEntries"
        @close="open = null"
        @done="open = null"
      />

      <EditEntryModal
        v-if="open === 'edit-entry'"
        :entry-id="1"
        @close="open = null"
        @saved="open = null"
        @deleted="open = null"
      />

      <AddEntryModal
        v-if="open === 'add-entry'"
        group-key="sheepskull"
        date="2026-04-03"
        @close="open = null"
        @added="open = null"
      />

      <UploadPickerModal
        v-if="open === 'upload-picker'"
        :entries="mockEntries"
        @close="open = null"
        @select="open = null"
      />

      <EditMediaModal
        v-if="open === 'edit-media'"
        :item="mockMediaItem"
        :show-cover="true"
        :is-cover="false"
        @close="open = null"
        @save="open = null"
        @delete="open = null"
      />

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import AppButton from '../../components/AppButton.vue'
import EditSessionModal from '../modals/EditSessionModal.vue'
import SetHoursModal from '../modals/SetHoursModal.vue'
import EditEntryModal from '../modals/EditEntryModal.vue'
import AddEntryModal from '../modals/AddEntryModal.vue'
import UploadPickerModal from '../modals/UploadPickerModal.vue'
import EditMediaModal from '../modals/EditMediaModal.vue'
import type { MediaItem } from '../../types/media'

const open = ref<string | null>(null)

const mockSession = {
  id: 1,
  displayName: 'Morning Session',
  description: 'A description of the session.',
  date: '2026-04-03',
  groupId: 1,
  eventbriteEventId: '',
  spacesAvailable: 20,
  registrations: 3,
  hours: 9,
  financialYear: '2025/26',
  coverMediaId: null,
  statsRaw: null,
  entries: [],
}

const mockMediaItem: MediaItem = {
  id: 'mock-media-1',
  thumbnailUrl: '/media/adhoc/2026-03-26/cover.jpg',
  largeUrl: '/media/adhoc/2026-03-26/cover.jpg',
  mimeType: 'image/jpeg',
  title: 'Sample photo',
  isPublic: true,
}

const mockEntries = [
  { id: 1, profileId: 101, volunteerName: 'Jane Smith', checkedIn: true, hours: 0, count: 1, isGroup: false, isMember: false },
  { id: 2, profileId: 102, volunteerName: 'John Doe',   checkedIn: true, hours: 0, count: 1, isGroup: false, isMember: false },
  { id: 3, profileId: 103, volunteerName: 'Alice Brown', checkedIn: false, hours: 3, count: 1, isGroup: false, isMember: false },
]
</script>

<style scoped>
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.back { color: var(--color-dtv-green); text-decoration: none; font-size: 0.9rem; }
.back:hover { text-decoration: underline; }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  border-bottom: 2px solid #ccc;
  padding-bottom: 0.5rem;
}

h2 { font-size: 1rem; font-weight: 600; color: #666; margin-bottom: 0.5rem; }

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}
</style>
