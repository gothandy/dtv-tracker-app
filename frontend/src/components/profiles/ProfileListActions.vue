<template>
  <div v-if="canBulkEdit" class="pla-wrap">
    <span class="pla-stats">
      {{ selected.length }} / {{ filteredProfiles.length }} {{ filteredProfiles.length === 1 ? 'profile' : 'profiles' }}
    </span>
    <div class="pla-buttons">
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
        @click="downloadCsv"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import type { ProfileResponse } from '../../../../types/api-responses'

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

// Only individual profiles (not groups) are eligible for bulk records
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

function downloadCsv() {
  const source = props.filteredProfiles.filter(p => props.selected.includes(p.id))

  const headers = ['Name', 'Email', 'Sessions', 'Hours']
  const rows = source.map(p => [
    p.name ?? '',
    p.email ?? '',
    sessionsFor(p),
    Math.round(hoursFor(p) * 10) / 10,
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => {
      const str = String(cell)
      return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
    }).join(','))
    .join('\n')

  const today = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `${today} Profiles.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<style scoped>
.pla-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: var(--color-dtv-sand);
  padding: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
}

.pla-stats { flex: 1; font-size: 0.85rem; color: var(--color-text-secondary); }
.pla-buttons { display: flex; gap: 0.5rem; margin-left: auto; }
</style>
