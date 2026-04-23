<template>
  <div v-if="canBulkTag" class="gla-wrap">
    <span class="gla-stats">
      {{ selected.length }} / {{ groups.length }} groups &nbsp;&nbsp; {{ selectedHours }} / {{ totalHours }} hours
    </span>
    <div class="gla-buttons">
      <AppButton label="Download CSV" icon="download" mode="icon-responsive" @click="onDownload" />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
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

const selectedGroups = computed(() => props.groups.filter(g => props.selected.includes(g.id)))

const selectedHours = computed(() =>
  Math.round(selectedGroups.value.reduce((sum, g) => sum + g.hours, 0) * 10) / 10)

const totalHours = computed(() =>
  Math.round(props.groups.reduce((sum, g) => sum + g.hours, 0) * 10) / 10)

function onDownload() {
  const source = props.selected.length
    ? props.groups.filter(g => props.selected.includes(g.id))
    : props.groups

  const today = new Date().toISOString().slice(0, 10)
  downloadCsv(`${today} Groups.csv`, ['Key', 'Name', 'Description', 'Regulars', 'Sessions', 'Hours'],
    source.map(g => [g.key, g.displayName ?? '', g.description ?? '', g.regularsCount, g.sessionCount, g.hours])
  )
}

function onShare() {
  shareCurrentUrl()
}
</script>

<style scoped>
.gla-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: var(--color-dtv-sand);
  padding: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
}

.gla-stats { flex: 1; font-size: 0.85rem; color: var(--color-text-secondary); }
.gla-buttons { display: flex; gap: 0.5rem; margin-left: auto; }
</style>
