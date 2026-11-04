<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>RecordChip</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>

      <h2>Default, Active, Info, Warn</h2>
      <div class="demo srch-list">
        <RecordChip v-for="r in examples" :key="r.type + r.label" :record="r" @click="log(r)" />
      </div>

      <h2>Disabled</h2>
      <div class="demo srch-list">
        <RecordChip v-for="r in examples" :key="r.type + r.label" :record="r" disabled />
      </div>

      <h2>No Date</h2>
      <div class="demo srch-list">
        <RecordChip :record="noDate" @click="log(noDate)" />
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
import type { RecordStateStyle } from '../../../../types/record-state'
import { usePageTitle } from '../../composables/usePageTitle'

usePageTitle('Sandbox')

const events = ref<string[]>([])
function log(record: Chip) {
  events.value.unshift(`click → ${record.type} · ${record.label}`)
}

type Chip = { type: string; label: string; style?: RecordStateStyle; date?: string }

/** A From State shows its After label; an Until State its Before label up to its Date, then After. */
const examples: Chip[] = [
  { type: 'Privacy Consent', label: 'Given', style: 'active', date: '2025-09-01' },
  { type: 'Parking Permit', label: 'Invited', style: 'info', date: '2026-01-15' },
  { type: 'Parking Permit', label: 'Expires', style: 'active', date: '2026-12-31' },
  { type: 'First Aid Certificate', label: 'Expired', style: 'warn', date: '2025-08-22' },
  { type: 'Photo Consent', label: 'Declined', date: '2026-03-01' },
]
const noDate: Chip = { type: 'Newsletter Consent', label: 'Invited' }
</script>

<style scoped>
.srch-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
