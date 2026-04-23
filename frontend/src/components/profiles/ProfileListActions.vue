<template>
  <div v-if="canBulkEdit" class="list-actions">
    <span class="list-actions-stats">
      {{ selected.length }} / {{ filteredProfiles.length }} {{ filteredProfiles.length === 1 ? 'profile' : 'profiles' }}
    </span>
    <div class="list-actions-buttons">
      <AppButton
        label="Add Records"
        icon="add"
        mode="icon-responsive"
        :disabled="individualSelected.length === 0"
        @click="emit('add-records')"
      />
      <AppButton
        label="Download CSV"
        icon="download"
        mode="icon-responsive"
        :disabled="selected.length === 0"
        @click="onDownload"
      />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import type { ProfileResponse } from '../../../../types/api-responses'
import { downloadCsv } from '../../utils/listCsv'
import { shareCurrentUrl } from '../../utils/shareUrl'

const props = defineProps<{
  filteredProfiles: ProfileResponse[]
  selected: number[]
  canBulkEdit: boolean
  fy: string
}>()

const emit = defineEmits<{
  'add-records': []
  'update:selected': [ids: number[]]
}>()

const individualSelected = computed(() =>
  props.selected.filter(id => {
    const p = props.filteredProfiles.find(x => x.id === id)
    return p && !p.isGroup
  })
)

function hoursFor(p: ProfileResponse): number {
  return props.fy === 'all' ? p.hoursAll : p.hoursThisFY
}

function sessionsFor(p: ProfileResponse): number {
  return props.fy === 'all' ? p.sessionsAll : p.sessionsThisFY
}

function onDownload() {
  const source = props.filteredProfiles.filter(p => props.selected.includes(p.id))
  const today = new Date().toISOString().slice(0, 10)
  downloadCsv(`${today} Profiles.csv`,
    ['Name', 'Email', 'Sessions', 'Hours'],
    source.map(p => [p.name ?? '', p.email ?? '', sessionsFor(p), Math.round(hoursFor(p) * 10) / 10])
  )
}

function onShare() {
  shareCurrentUrl()
}
</script>
