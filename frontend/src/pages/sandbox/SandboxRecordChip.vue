<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>RecordChip</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>
      <p>
        One Record on the Profile page (<RouterLink to="/sandbox/profile-record-list">ProfileRecordList</RouterLink>).
        Today its style comes from its Status; from Records v2 PR 2 (#324) by the State's <strong>BeforeStyle</strong> or
        <strong>AfterStyle</strong>: <strong>Active</strong> (green), <strong>Info</strong> (gold) or <strong>Warn</strong>
        (dirt); blank = sand. Shown here as on the Records cards: a left border and the text.
      </p>

      <h2>No style (today: Accepted Active, Invited and Declined Warn, the rest Default)</h2>
      <div class="demo srch-list">
        <RecordChip v-for="e in examples" :key="e.record.type + e.record.status" :record="e.record" @click="log(e.record)" />
      </div>

      <h2>With State styles</h2>
      <div class="demo srch-list">
        <RecordChip v-for="e in examples" :key="e.record.type + e.record.status" :record="e.record" :state-style="e.stateStyle" @click="log(e.record)" />
      </div>

      <h2>Disabled (can't edit)</h2>
      <div class="demo srch-list">
        <RecordChip v-for="e in examples" :key="e.record.type + e.record.status" :record="e.record" :state-style="e.stateStyle" disabled />
      </div>

      <h2>No Date</h2>
      <div class="demo srch-list">
        <RecordChip :record="{ type: 'Newsletter Consent', status: 'Pending' }" @click="log({ type: 'Newsletter Consent', status: 'Pending' })" />
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
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import RecordChip from '../../components/records/RecordChip.vue'
import type { RecordStateStyle } from '../../utils/recordStateStyle'
import { usePageTitle } from '../../composables/usePageTitle'

usePageTitle('Sandbox')

const events = ref<string[]>([])
function log(record: { type: string; status: string }) {
  events.value.unshift(`click → ${record.type} · ${record.status}`)
}

type Example = { record: { type: string; status: string; date?: string }; stateStyle?: RecordStateStyle }

/** The same Records in each style; the State shown is the label PR 1 will give it. */
const examples: Example[] = [
  { record: { type: 'Privacy Consent', status: 'Accepted', date: '2025-09-01' }, stateStyle: 'active' },
  { record: { type: 'Discount Card', status: 'Invited', date: '2026-01-15' }, stateStyle: 'info' },
  { record: { type: 'Photo Consent', status: 'Declined', date: '2026-03-01' }, stateStyle: 'warn' },
  { record: { type: 'First Aid Certificate', status: 'Requested', date: '2026-10-01' } },
  { record: { type: 'First Aid Certificate', status: 'Expired', date: '2025-08-22' }, stateStyle: 'warn' },
]
</script>

<style scoped>
.srch-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
