<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>RecordListResults</h1>
      <p class="sandbox-warning">Static mocked data — no API calls. Selection and edit events work locally.</p>
      <p>The Records page's list: <RouterLink to="/sandbox/record-list-item">RecordListItem</RouterLink> cards with selection and Edit.</p>

      <h2>Default (no select, no edit)</h2>
      <div class="demo">
        <RecordListResults :records="mockRecords" :loading="false" :error="null" :selected="[]" />
      </div>

      <h2>allowSelect — checkbox mode</h2>
      <div class="demo">
        <RecordListResults
          :records="mockRecords"
          :loading="false"
          :error="null"
          :selected="selected"
          allow-select
          @update:selected="selected = $event"
        />
      </div>
      <p class="note">Selected IDs: {{ selected.length ? selected.join(', ') : '(none)' }}</p>

      <h2>allowEdit — click a card to open Edit (edit event logged)</h2>
      <div class="demo">
        <RecordListResults
          :records="mockRecords"
          :loading="false"
          :error="null"
          :selected="editSelected"
          allow-select
          allow-edit
          @update:selected="editSelected = $event"
          @edit-record="lastEdited = $event"
        />
      </div>
      <p v-if="lastEdited" class="note">edit-record: {{ lastEdited.type }} · {{ lastEdited.profileName }} (id {{ lastEdited.id }})</p>

      <h2>Loading state</h2>
      <div class="demo">
        <RecordListResults :records="[]" :loading="true" :error="null" :selected="[]" />
      </div>

      <h2>Error state</h2>
      <div class="demo">
        <RecordListResults :records="[]" :loading="false" error="Failed to load records (500)" :selected="[]" />
      </div>

      <h2>Empty state</h2>
      <div class="demo">
        <RecordListResults :records="[]" :loading="false" :error="null" :selected="[]" />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import RecordListResults from '../../components/records/RecordListResults.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { RecordListItemResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const selected = ref<number[]>([2])
const editSelected = ref<number[]>([])
const lastEdited = ref<RecordListItemResponse | null>(null)

const mockRecords: RecordListItemResponse[] = [
  { id: 1, type: 'Discount Card', status: 'Accepted', storedStatus: 'Accepted', date: '2025-05-02', profileId: 11, profileName: 'Alice Bowen', profileSlug: 'alice-bowen-11' },
  { id: 2, type: 'Discount Card', status: 'Invited', storedStatus: 'Invited', date: '2026-02-23', profileId: 12, profileName: 'Bob Carter', profileSlug: 'bob-carter-12' },
  { id: 3, type: 'Photo Consent', status: 'Declined', storedStatus: 'Declined', date: '2026-10-02', notes: 'Asked again in May', profileId: 13, profileName: 'Carol Davies', profileSlug: 'carol-davies-13' },
  { id: 4, type: 'First Aid Certificate', status: 'Expires', storedStatus: 'Expires', date: '2027-08-22', profileId: 11, profileName: 'Alice Bowen', profileSlug: 'alice-bowen-11' },
]
</script>
