<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>ProfileRecordList</h1>

      <h2>Admin — consent link, add, edit</h2>
      <div class="demo">
        <ProfileRecordList
          :records="mockRecords"
          :profile-id="1"
          profile-slug="alice-bowen-1"
          :show-consent-link="true"
          :allow-edit="true"
          :states="mockStates"
          ref="adminRef"
          @add-record="onAddRecord"
          @save-record="onSaveRecord"
          @delete-record="onDeleteRecord"
        />
      </div>

      <h2>Check-In — consent link, no add/edit</h2>
      <div class="demo">
        <ProfileRecordList
          :records="mockRecords"
          :profile-id="1"
          profile-slug="alice-bowen-1"
          :show-consent-link="true"
          :states="mockStates"
        />
      </div>

      <h2>Self-Service — consent link, no add/edit</h2>
      <div class="demo">
        <ProfileRecordList
          :records="mockRecords"
          :profile-id="1"
          profile-slug="alice-bowen-1"
          :show-consent-link="true"
          :states="mockStates"
        />
      </div>

      <h2>Read-Only — no actions</h2>
      <div class="demo">
        <ProfileRecordList
          :records="mockRecords"
          :profile-id="1"
          profile-slug="alice-bowen-1"
          :states="mockStates"
        />
      </div>

      <h2>Empty state</h2>
      <div class="demo">
        <ProfileRecordList
          :records="[]"
          :profile-id="1"
          profile-slug="alice-bowen-1"
          :show-consent-link="true"
          :allow-edit="true"
          :states="mockStates"
        />
      </div>

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
import ProfileRecordList from '../../components/profiles/ProfileRecordList.vue'
import type { AddRecordPayload } from '../modals/RecordAddModal.vue'
import type { SaveRecordPayload } from '../modals/RecordEditModal.vue'
import type { RecordState } from '../../../../types/record-state'

usePageTitle('Sandbox')

const events = ref<string[]>([])
const adminRef = ref<InstanceType<typeof ProfileRecordList> | null>(null)

function log(msg: string) {
  events.value.unshift(msg)
}

function onAddRecord(payload: AddRecordPayload) {
  log(`addRecord → ${JSON.stringify(payload)}`)
  setTimeout(() => adminRef.value?.onAddSuccess(), 1000)
}

function onSaveRecord(id: number, payload: SaveRecordPayload) {
  log(`saveRecord id=${id} → ${JSON.stringify(payload)}`)
  setTimeout(() => adminRef.value?.onSaveSuccess(), 1000)
}

function onDeleteRecord(id: number) {
  log(`deleteRecord id=${id}`)
  setTimeout(() => adminRef.value?.onDeleteSuccess(), 1000)
}

const mockStates: RecordState[] = [
  { id: 1, type: 'Parking Permit', name: 'Invite', after: 'Invited' },
  { id: 2, type: 'Parking Permit', name: 'Decline', after: 'Declined' },
  { id: 3, type: 'Parking Permit', name: 'Active', before: 'Expires', after: 'Expired' },
  { id: 4, type: 'Privacy Consent', name: 'Invited' },
  { id: 5, type: 'Privacy Consent', name: 'Accepted' },
  { id: 6, type: 'Photo Consent', name: 'Accepted' },
  { id: 7, type: 'Photo Consent', name: 'Declined' },
  { id: 8, type: 'Charity Membership', name: 'Invited' },
  { id: 9, type: 'Charity Membership', name: 'Accepted' },
  { id: 10, type: 'Discount Card', name: 'Invited' },
  { id: 11, type: 'Discount Card', name: 'Accepted' },
  { id: 12, type: 'First Aid Certificate', name: 'Active', before: 'Expires', after: 'Expired' },
  { id: 13, type: 'DofE', name: 'Active', before: 'Starts', after: 'Started' },
]

const mockRecords = [
  { id: 1, type: 'Privacy Consent',    stateName: 'Accepted', label: 'Accepted', date: '2025-09-01T00:00:00Z' },
  { id: 2, type: 'Photo Consent',      stateName: 'Accepted', label: 'Accepted', date: '2025-09-01T00:00:00Z' },
  { id: 3, type: 'Charity Membership', stateName: 'Accepted', label: 'Accepted', date: '2024-04-01T00:00:00Z' },
  { id: 4, type: 'Discount Card',      stateName: 'Invited', label: 'Invited',  date: '2026-01-15T00:00:00Z' },
]
</script>
