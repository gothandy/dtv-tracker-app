<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>RecordListItem</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>
      <p>
        State colours for Records v2 PR 2 (#324): each State has a Before and an After colour
        (Green, Amber = brand gold, Red; blank = sand). Three ways to show it, to compare and choose.
      </p>

      <h2>Today (no colour)</h2>
      <div class="demo srli-list">
        <RecordListItem v-for="e in examples" :key="e.record.id" :record="e.record" />
      </div>

      <template v-for="s in styles" :key="s.value">
        <h2>{{ s.label }}</h2>
        <p>{{ s.note }}</p>
        <div class="demo srli-list">
          <RecordListItem
            v-for="e in examples"
            :key="e.record.id"
            :record="e.record"
            :colour="e.colour"
            :colour-style="s.value"
          />
          <RecordListItem :record="examples[1].record" :colour="examples[1].colour" :colour-style="s.value" selected />
        </div>
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import RecordListItem, { type RecordColour, type RecordColourStyle } from '../../components/records/RecordListItem.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { RecordListItemResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const record = (id: number, type: string, status: string, profileName: string, date: string, notes?: string): RecordListItemResponse => ({
  id, type, status, storedStatus: status, date, notes, profileId: id, profileName, profileSlug: `p-${id}`,
})

/** The same Records in each style; the State shown is the label PR 1 will give it. */
const examples: Array<{ record: RecordListItemResponse; colour?: RecordColour }> = [
  { record: record(1, 'First Aid Certificate', 'Requested', 'Alice Example', '2026-10-01') },
  { record: record(2, 'First Aid Certificate', 'Expires', 'Bob Example', '2027-08-22', 'St John Ambulance, 3 day'), colour: 'green' },
  { record: record(3, 'First Aid Certificate', 'Expired', 'Cara Example', '2025-08-22'), colour: 'amber' },
  { record: record(4, 'Photo Consent', 'Given', 'Dan Example', '2026-02-24'), colour: 'green' },
  { record: record(5, 'Photo Consent', 'Declined', 'Eve Example', '2026-03-01'), colour: 'red' },
]

const styles: Array<{ value: RecordColourStyle; label: string; note: string }> = [
  { value: 'text', label: 'Option 1: State text', note: 'The State is coloured; the card stays sand.' },
  { value: 'border', label: 'Option 2: Left border', note: 'A coloured left border, as Entries use for checked in (green) and problems (red).' },
  { value: 'background', label: 'Option 3: Background', note: 'The card is coloured, with white or dark text to suit.' },
]
</script>

<style scoped>
.srli-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
