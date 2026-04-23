<template>
  <div v-if="canBulkTag" class="list-actions">
    <span class="list-actions-stats">
      {{ selected.length }} / {{ groups.length }} groups &nbsp;&nbsp; {{ selectedHours }} / {{ totalHours }} hours
    </span>
    <div class="list-actions-buttons">
      <AppButton label="Download CSV" icon="download" mode="icon-only" :disabled="!selectedGroups.length" @click="onDownload" />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
      <AppButton label="New group" icon="add" mode="icon-only" @click="emit('add-group')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import { downloadCsv } from '../../utils/listCsv'
import { shareCurrentUrl } from '../../utils/shareUrl'
import type { GroupWithStats } from './GroupListFilter.vue'

const props = defineProps<{
  groups: GroupWithStats[]
  selected: number[]
  canBulkTag: boolean
}>()

const emit = defineEmits<{
  'add-group': []
  'update:selected': [ids: number[]]
}>()

const selectedGroups = computed(() => props.groups.filter(g => props.selected.includes(g.id)))

const selectedHours = computed(() =>
  Math.round(selectedGroups.value.reduce((sum, g) => sum + g.hours, 0) * 10) / 10)

const totalHours = computed(() =>
  Math.round(props.groups.reduce((sum, g) => sum + g.hours, 0) * 10) / 10)

function onDownload() {
  const today = new Date().toISOString().slice(0, 10)
  downloadCsv(`${today} Groups.csv`, ['Key', 'Name', 'Description', 'Regulars', 'Sessions', 'Hours'],
    selectedGroups.value.map(g => [g.key, g.displayName ?? '', g.description ?? '', g.regularsCount, g.sessionCount, g.hours])
  )
}

function onShare() {
  shareCurrentUrl()
}
</script>
