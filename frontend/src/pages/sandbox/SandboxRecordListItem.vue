<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>RecordListItem</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>
      <p>
        State styles for Records v2 PR 2 (#324): each State has a <strong>BeforeStyle</strong> and an
        <strong>AfterStyle</strong>: <strong>Active</strong> (green), <strong>Info</strong> (gold) or
        <strong>Warn</strong> (dirt); blank = sand. Shown as a left border and the State's text.
      </p>

      <h2>No style (today: Accepted Active, Invited and Declined Warn, the rest Default)</h2>
      <div class="demo srli-list">
        <RecordListItem v-for="e in examples" :key="e.record.id" :record="e.record" />
      </div>

      <h2>With State styles</h2>
      <div class="demo srli-list">
        <RecordListItem v-for="e in examples" :key="e.record.id" :record="e.record" :state-style="e.stateStyle" />
      </div>

      <h2>Selected</h2>
      <div class="demo srli-list">
        <RecordListItem v-for="e in examples.slice(1, 3)" :key="e.record.id" :record="e.record" :state-style="e.stateStyle" selected />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import RecordListItem from '../../components/records/RecordListItem.vue'
import type { RecordStateStyle } from '../../utils/recordStateStyle'
import { usePageTitle } from '../../composables/usePageTitle'
import type { RecordListItemResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const record = (id: number, type: string, status: string, profileName: string, date: string, notes?: string): RecordListItemResponse => ({
  id, type, status, storedStatus: status, date, notes, profileId: id, profileName, profileSlug: `p-${id}`,
})

/** The same Records in each style; the State shown is the label PR 1 will give it. */
const examples: Array<{ record: RecordListItemResponse; stateStyle?: RecordStateStyle }> = [
  { record: record(1, 'First Aid Certificate', 'Requested', 'Alice Example', '2026-10-01') },
  { record: record(2, 'First Aid Certificate', 'Expires', 'Bob Example', '2027-08-22', 'St John Ambulance, 3 day'), stateStyle: 'active' },
  { record: record(3, 'First Aid Certificate', 'Expired', 'Cara Example', '2025-08-22'), stateStyle: 'info' },
  { record: record(4, 'Photo Consent', 'Given', 'Dan Example', '2026-02-24'), stateStyle: 'active' },
  { record: record(5, 'Photo Consent', 'Declined', 'Eve Example', '2026-03-01'), stateStyle: 'warn' },
  { record: record(6, 'Discount Card', 'Accepted', 'Fay Example', '2026-05-02'), stateStyle: 'active' },
]
</script>

<style scoped>
.srli-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
