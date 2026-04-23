<template>
  <div class="ela-wrap">
    <span class="ela-stats">
      <template v-if="selected.length">{{ selected.length }} / </template>{{ entries.length }} {{ entries.length === 1 ? 'entry' : 'entries' }}<template v-if="totalHours > 0"> &nbsp;&nbsp; {{ totalHours }} hours</template>
    </span>
    <div class="ela-buttons">
      <AppButton label="Download CSV" icon="download" mode="icon-responsive" @click="onDownload" />
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

const totalHours = computed(() =>
  Math.round(props.entries.reduce((sum, e) => sum + e.hours, 0) * 10) / 10
)

function onDownload() {
  const source = props.selected.length
    ? props.entries.filter(e => props.selected.includes(e.id))
    : props.entries

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

<style scoped>
.ela-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: var(--color-dtv-sand);
  padding: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
}

.ela-stats { flex: 1; font-size: 0.85rem; color: var(--color-text-secondary); }
.ela-buttons { display: flex; gap: 0.5rem; margin-left: auto; }
</style>
