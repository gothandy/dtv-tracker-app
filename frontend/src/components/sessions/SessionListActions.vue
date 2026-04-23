<template>
  <div v-if="canBulkTag" class="list-actions">
    <span class="list-actions-stats">
      {{ selected.length }} / {{ sessions.length }} sessions &nbsp;&nbsp; {{ selectedHours }} / {{ totalHours }} hours
    </span>

    <div class="list-actions-buttons">
      <AppButton label="Add Tags" icon="add" mode="icon-responsive" :disabled="!selectedSessions.length" @click="emit('add-tags')" />
      <AppButton label="Download CSV" icon="download" mode="icon-only" :disabled="!selectedSessions.length" @click="onDownload" />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
      <AppButton label="Add session" icon="add" mode="icon-only" @click="emit('add-session')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import type { Session } from '../../types/session'
import { downloadCsv } from '../../utils/listCsv'
import { shareCurrentUrl } from '../../utils/shareUrl'

const props = defineProps<{
  sessions: Session[]
  selected: number[]
  canBulkTag: boolean
}>()

const emit = defineEmits<{
  'update:selected': [ids: number[]]
  'add-tags': []
  'add-session': []
}>()

const selectedSessions = computed(() => props.sessions.filter(s => props.selected.includes(s.id)))

const selectedHours = computed(() =>
  Math.round(selectedSessions.value.reduce((sum, s) => sum + (s.stats.hours || 0), 0) * 10) / 10)

const totalHours = computed(() =>
  Math.round(props.sessions.reduce((sum, s) => sum + (s.stats.hours || 0), 0) * 10) / 10)

function onDownload() {
  downloadCsv('sessions.csv',
    ['Date', 'Group', 'Name', 'Registrations', 'Hours', 'New', 'Children', 'Regulars', 'Financial Year'],
    selectedSessions.value.map(s => [
      s.date?.substring(0, 10) ?? '',
      s.groupName ?? '',
      s.displayName ?? '',
      s.stats.count,
      s.stats.hours,
      s.stats.new ?? 0,
      s.stats.child ?? 0,
      s.stats.regular ?? 0,
      s.financialYear ?? '',
    ]),
    false
  )
}

function onShare() {
  shareCurrentUrl()
}
</script>
