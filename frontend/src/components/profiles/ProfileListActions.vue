<template>
  <div v-if="canBulkEdit" class="list-actions">
    <span class="list-actions-stats">
      {{ selectedInFiltered.length }} / {{ filteredProfiles.length }} {{ filteredProfiles.length === 1 ? 'profile' : 'profiles' }}
    </span>
    <div class="list-actions-buttons">
      <AppButton label="Add Records" icon="file-add" mode="icon-responsive" :disabled="individualSelected.length === 0" @click="emit('add-records')" />
      <AppButton label="Add Entries" icon="register" mode="icon-responsive" :disabled="individualSelected.length === 0" @click="emit('add-entries')" />
      <AppButton label="Send Email" icon="email" mode="icon-responsive" :disabled="emailableSelected.length === 0" @click="emit('send-email')" />
      <AppButton label="Download CSV" icon="download" mode="icon-only" :disabled="selectedInFiltered.length === 0" @click="onDownload" />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
      <AppButton label="Add profile" icon="add" mode="icon-only" @click="emit('add-profile')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import type { ProfileResponse } from '../../../../types/api-responses'
import { downloadCsv } from '../../utils/listCsv'
import { shareCurrentUrl } from '../../utils/shareUrl'
import { ukToday } from '../../../../types/uk-date'
import { hoursInView, sessionsInView } from '../../../../types/hours'

const props = defineProps<{
  filteredProfiles: ProfileResponse[]
  selected: number[]
  canBulkEdit: boolean
  fy: string
}>()

const emit = defineEmits<{
  'add-records': []
  'add-entries': []
  'add-profile': []
  'send-email': []
  'update:selected': [ids: number[]]
}>()

const selectedInFiltered = computed(() => props.filteredProfiles.filter(p => props.selected.includes(p.id)))

const individualSelected = computed(() => selectedInFiltered.value.filter(p => !p.isGroup))

const emailableSelected = computed(() =>
  individualSelected.value.filter(p => !!p.email?.trim())
)

function hoursFor(p: ProfileResponse): number {
  return hoursInView(p, props.fy)
}

function sessionsFor(p: ProfileResponse): number {
  return sessionsInView(p, props.fy)
}

function onDownload() {
  const source = selectedInFiltered.value
  const today = ukToday()
  downloadCsv(`${today} Profiles.csv`,
    ['Name', 'Email', 'Sessions', 'Hours'],
    source.map(p => [p.name ?? '', p.email ?? '', sessionsFor(p), Math.round(hoursFor(p) * 10) / 10])
  )
}

function onShare() {
  shareCurrentUrl()
}
</script>
