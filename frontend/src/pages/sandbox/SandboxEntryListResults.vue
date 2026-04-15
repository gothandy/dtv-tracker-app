<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>EntryListResults</h1>
      <p class="sandbox-warning">Static mocked data — no API calls. Selection and edit events work locally.</p>

      <h2>Default (no select, no edit — links to entry detail)</h2>
      <div class="demo">
        <EntryListResults
          :entries="mockEntries"
          :loading="false"
          :error="null"
          :selected="[]"
        />
      </div>

      <h2>allowSelect — checkbox mode</h2>
      <div class="demo">
        <EntryListResults
          :entries="mockEntries"
          :loading="false"
          :error="null"
          :selected="selected"
          allow-select
          @update:selected="selected = $event"
        />
      </div>
      <p class="note">Selected IDs: {{ selected.length ? selected.join(', ') : '(none)' }}</p>

      <h2>allowEdit — click row to open modal (edit event logged)</h2>
      <div class="demo">
        <EntryListResults
          :entries="mockEntries"
          :loading="false"
          :error="null"
          :selected="editSelected"
          allow-select
          allow-edit
          @update:selected="editSelected = $event"
          @edit-entry="onEdit"
        />
      </div>
      <p v-if="lastEdited" class="note">edit-entry: {{ lastEdited.volunteerName }} (id {{ lastEdited.id }})</p>

      <h2>Loading state</h2>
      <div class="demo">
        <EntryListResults
          :entries="[]"
          :loading="true"
          :error="null"
          :selected="[]"
        />
      </div>

      <h2>Error state</h2>
      <div class="demo">
        <EntryListResults
          :entries="[]"
          :loading="false"
          error="Failed to load entries (500)"
          :selected="[]"
        />
      </div>

      <h2>Empty state</h2>
      <div class="demo">
        <EntryListResults
          :entries="[]"
          :loading="false"
          :error="null"
          :selected="[]"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import EntryListResults from '../../components/entries/EntryListResults.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { EntryListItemResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const selected = ref<number[]>([2])
const editSelected = ref<number[]>([])
const lastEdited = ref<EntryListItemResponse | null>(null)

function onEdit(entry: EntryListItemResponse) {
  lastEdited.value = entry
}

const mockEntries: EntryListItemResponse[] = [
  {
    id: 1, profileId: 10, volunteerName: 'Alice Smith', volunteerSlug: 'alice-smith-10',
    date: '2026-04-08', groupKey: 'wed-dig', groupName: 'Wednesday Dig',
    notes: undefined, checkedIn: true, hours: 4, count: 1, isGroup: false, hasAccompanyingAdult: false,
  },
  {
    id: 2, profileId: 11, volunteerName: 'Bob Jones', volunteerSlug: 'bob-jones-11',
    date: '2026-04-08', groupKey: 'wed-dig', groupName: 'Wednesday Dig',
    notes: '#Child #New', checkedIn: false, hours: 0, count: 1, isGroup: false, hasAccompanyingAdult: true,
  },
  {
    id: 3, profileId: 12, volunteerName: 'Carol White', volunteerSlug: 'carol-white-12',
    date: '2026-03-20', groupKey: 'trail-crew', groupName: 'Trail Crew',
    notes: undefined, checkedIn: true, hours: 5, count: 1, isGroup: false, hasAccompanyingAdult: false,
  },
  {
    id: 4, profileId: 20, volunteerName: 'Saturday Crew', volunteerSlug: 'saturday-crew-20',
    date: '2026-03-20', groupKey: 'trail-crew', groupName: 'Trail Crew',
    notes: undefined, checkedIn: true, hours: 20, count: 6, isGroup: true, hasAccompanyingAdult: false,
  },
]
</script>

<style scoped>
.demo { outline: 1px solid var(--color-border); }
.note { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem; }
</style>
