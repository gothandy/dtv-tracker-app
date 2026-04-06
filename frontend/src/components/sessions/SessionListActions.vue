<template>
  <div v-if="profile.isAdmin" class="sa-wrap">
    <span class="sa-stats">
      <template v-if="selected.length">
        {{ selected.length }} session{{ selected.length === 1 ? '' : 's' }} selected — {{ selectedHours }}h
      </template>
      <template v-else>No sessions selected.</template>
    </span>

    <div class="sa-buttons">
      <AppButton label="Add Tags" icon="add" mode="icon-responsive" :disabled="!selected.length" @click="showTagPicker = true" />
      <AppButton label="Download CSV" icon="download" mode="icon-responsive" :disabled="!selected.length" @click="downloadCsv" />
    </div>

    <!-- Tag picker modal -->
    <div v-if="showTagPicker" class="sa-modal-overlay" @click.self="showTagPicker = false">
      <div class="sa-modal">
        <h3>Add tag to {{ selected.length }} session{{ selected.length === 1 ? '' : 's' }}</h3>
        <TagPicker v-model="pickedTag" placeholder="Choose a tag…" />
        <div class="sa-modal-buttons">
          <AppButton label="Cancel" @click="showTagPicker = false" />
          <AppButton label="Apply" :disabled="!pickedTag" :working="saving" @click="applyTag" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TagPicker from '../TagPicker.vue'
import AppButton from '../AppButton.vue'
import { useProfile } from '../../composables/useProfile'
import type { Session } from '../../types/session'

const props = defineProps<{
  sessions: Session[]   // full filtered list (for CSV + hours summary)
  selected: number[]
}>()

const emit = defineEmits<{ 'update:selected': [ids: number[]]; tagged: [] }>()

const profile = useProfile()
const showTagPicker = ref(false)
const pickedTag = ref('')
const saving = ref(false)

const selectedSessions = computed(() => props.sessions.filter(s => props.selected.includes(s.id)))

const selectedHours = computed(() =>
  Math.round(selectedSessions.value.reduce((sum, s) => sum + (s.hours || 0), 0) * 10) / 10
)

async function applyTag() {
  if (!pickedTag.value || !props.selected.length) return
  saving.value = true
  try {
    const res = await fetch('/api/sessions/bulk-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionIds: props.selected,
        tags: [{ label: pickedTag.value, termGuid: '' }]
      })
    })
    if (!res.ok) throw new Error('Bulk tag failed')
    showTagPicker.value = false
    pickedTag.value = ''
    emit('update:selected', [])
    emit('tagged')
  } catch (e) {
    console.error('[SessionActionsV1] bulk tag', e)
  } finally {
    saving.value = false
  }
}

function downloadCsv() {
  const headers = ['Date', 'Group', 'Name', 'Registrations', 'Hours', 'New', 'Children', 'Regulars', 'Financial Year']
  const rows = selectedSessions.value.map(s => [
    s.date?.substring(0, 10) ?? '',
    s.groupName ?? '',
    s.displayName ?? '',
    s.registrations ?? 0,
    s.hours ?? 0,
    s.newCount ?? 0,
    s.childCount ?? 0,
    s.regularCount ?? 0,
    s.financialYear ?? '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(cell => {
      const str = String(cell)
      return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
    }).join(','))
    .join('\n')

  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'sessions.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<style scoped>
.sa-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: var(--color-dtv-sand);
  padding: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
}

.sa-stats { flex: 1; font-size: 0.85rem; color: var(--color-text-secondary); }

.sa-buttons { display: flex; gap: 0.5rem; margin-left: auto; }

.sa-modal-overlay {
  position: fixed; inset: 0; background: var(--color-overlay);
  z-index: 100; display: flex; align-items: center; justify-content: center;
}
.sa-modal {
  background: var(--color-white); padding: 1.5rem;
  box-shadow: var(--shadow-lg); width: 90%; max-width: 360px;
  display: flex; flex-direction: column; gap: 1rem;
}
.sa-modal h3 { color: var(--color-text); margin: 0; font-size: 1rem; }
.sa-modal-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; }
</style>
