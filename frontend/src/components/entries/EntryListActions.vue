<template>
  <div class="list-actions">
    <span class="list-actions-stats">
      {{ selected.length }} / {{ entries.length }} entries &nbsp;&nbsp; {{ selectedHours }} / {{ totalHours }} hours
    </span>
    <div class="list-actions-buttons">
      <AppButton label="Download CSV" icon="download" mode="icon-only" :disabled="!selectedEntries.length" @click="onDownload" />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import type { EntryListItemResponse } from '../../../../types/api-responses'
import { downloadCsv } from '../../utils/listCsv'
import { shareCurrentUrl } from '../../utils/shareUrl'

const props = defineProps<{
  entries: EntryListItemResponse[]
  selected: number[]
}>()

const selectedEntries = computed(() => props.entries.filter(e => props.selected.includes(e.id)))

const selectedHours = computed(() =>
  Math.round(selectedEntries.value.reduce((sum, e) => sum + e.hours, 0) * 10) / 10)

const totalHours = computed(() =>
  Math.round(props.entries.reduce((sum, e) => sum + e.hours, 0) * 10) / 10)

function onDownload() {
  const source = selectedEntries.value.length ? selectedEntries.value : props.entries

  const today = new Date().toISOString().slice(0, 10)
  downloadCsv(`${today} Entries.csv`,
    ['Date', 'Group', 'Volunteer', 'Hours', 'Checked In', 'Notes'],
    source.map(e => [
      e.date?.substring(0, 10) ?? '',
      e.groupName ?? '',
      e.volunteerName ?? '',
      e.hours,
      e.checkedIn ? 'Yes' : 'No',
      e.notes ?? '',
    ])
  )
}

function onShare() {
  shareCurrentUrl()
}
</script>
