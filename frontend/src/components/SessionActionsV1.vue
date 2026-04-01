<template>
  <div v-if="isAdmin" class="sa-wrap">
    <span class="sa-stats" v-if="selected.length">
      {{ selected.length }} session{{ selected.length === 1 ? '' : 's' }} selected
      — {{ selectedHours }}h
    </span>

    <div class="sa-buttons">
      <button class="sa-btn" :disabled="!selected.length" @click="showTagPicker = true">
        Add Tags{{ selected.length ? ` (${selected.length})` : '' }}
      </button>
      <button class="sa-btn" :disabled="!selected.length" @click="downloadCsv">
        Download CSV
      </button>
    </div>

    <!-- Tag picker modal -->
    <div v-if="showTagPicker" class="sa-modal-overlay" @click.self="showTagPicker = false">
      <div class="sa-modal">
        <h3>Add tag to {{ selected.length }} session{{ selected.length === 1 ? '' : 's' }}</h3>
        <TagPickerV1 v-model="pickedTag" placeholder="Choose a tag…" />
        <div class="sa-modal-buttons">
          <button class="sa-btn" @click="showTagPicker = false">Cancel</button>
          <button class="sa-btn sa-btn--primary" :disabled="!pickedTag || saving" @click="applyTag">
            {{ saving ? 'Applying…' : 'Apply' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TagPickerV1 from './TagPickerV1.vue'
import { useRole } from '../composables/useRole'
import type { Session } from '../types/session'

const props = defineProps<{
  sessions: Session[]   // full filtered list (for CSV + hours summary)
  selected: number[]
}>()

const emit = defineEmits<{ 'update:selected': [ids: number[]]; tagged: [] }>()

const { isAdmin } = useRole()
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
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: white;
  padding: 0.75rem 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.sa-stats { font-size: 0.85rem; color: #555; }

.sa-buttons { display: flex; gap: 0.5rem; margin-left: auto; }

.sa-btn {
  padding: 0.4rem 0.9rem;
  border: 1px solid #ddd;
  background: #f5f5f5;
  color: #333;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.sa-btn:hover:not(:disabled) { background: #e8e8e8; }
.sa-btn--primary { background: #4FAF4A; color: white; border-color: #4FAF4A; }
.sa-btn--primary:hover:not(:disabled) { background: #3d9a3d; }
.sa-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sa-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 100; display: flex; align-items: center; justify-content: center;
}
.sa-modal {
  background: white; padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2); width: 90%; max-width: 360px;
  display: flex; flex-direction: column; gap: 1rem;
}
.sa-modal h3 { color: #333; margin: 0; font-size: 1rem; }
.sa-modal-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; }
</style>
