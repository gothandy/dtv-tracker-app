<template>
  <div class="gf-wrap">
    <div class="gf-title-row">
      <div class="gf-actions">
        <FyFilter v-model="fy" />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { GroupResponse } from '../../../../types/api-responses'
import type { Session } from '../../types/session'

export interface GroupWithStats extends GroupResponse {
  sessionCount: number
  hours: number
}

const props = defineProps<{ groups: GroupResponse[]; sessions: Session[] }>()
const emit = defineEmits<{ filtered: [groups: GroupWithStats[]] }>()

const route = useRoute()
const router = useRouter()

const fy = ref((route.query.fy as string) || 'future')

function rollingStart(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

function matchesFy(s: Session): boolean {
  if (fy.value === 'all') return true
  if (fy.value === 'future') return s.date >= new Date().toISOString().slice(0, 10)
  if (fy.value === 'rolling') return s.date >= rollingStart() && s.date <= new Date().toISOString().slice(0, 10)
  return s.financialYear === fy.value
}

const filtered = computed<GroupWithStats[]>(() => {
  const fyGroups = fy.value === 'all'
    ? props.groups
    : props.groups.filter(g => props.sessions.some(s => s.groupId === g.id && matchesFy(s)))

  return fyGroups.map(g => {
    const groupSessions = props.sessions.filter(s => s.groupId === g.id && matchesFy(s))
    return {
      ...g,
      sessionCount: groupSessions.length,
      hours: Math.round(groupSessions.reduce((sum, s) => sum + (s.stats.hours || 0), 0) * 10) / 10,
    }
  })
})

watch(filtered, list => emit('filtered', list), { immediate: true })

watch(fy, newFy => {
  router.replace({ query: newFy ? { fy: newFy } : {} })
})

</script>

<style scoped>
.gf-wrap {
  background: var(--color-dtv-sand);
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.gf-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.gf-heading { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; }

.gf-actions { display: flex; gap: 0.5rem; align-items: center; margin-left: auto; }


.gf-modal-overlay {
  position: fixed; inset: 0; background: var(--color-overlay);
  z-index: 100; display: flex; align-items: center; justify-content: center;
}
.gf-modal {
  background: var(--color-white); padding: 1.5rem;
  box-shadow: var(--shadow-lg); width: 90%; max-width: 400px;
}
.gf-modal h3 { color: var(--color-text); margin: 0 0 1rem; font-size: 1.1rem; }
.gf-modal-field { margin-bottom: 1rem; }
.gf-modal-field label { display: block; font-size: 0.85rem; color: var(--color-text-label); margin-bottom: 0.3rem; }
.gf-modal-field input,
.gf-modal-field textarea {
  width: 100%; font-size: 1rem; padding: 0.6rem 0.75rem;
  border: 2px solid var(--color-border); font-family: inherit; box-sizing: border-box;
  color: var(--color-text); background: var(--color-white);
}
.gf-modal-field textarea { min-height: 60px; resize: vertical; }
.gf-modal-field input:focus,
.gf-modal-field textarea:focus { outline: none; border-color: var(--color-dtv-green); }
.gf-modal-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
.gf-btn { padding: 0.5rem 1rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; }
.gf-btn { background: var(--color-surface-hover); color: var(--color-text-label); }
.gf-btn--primary { background: var(--color-dtv-green); color: var(--color-white); }
.gf-btn--primary:hover:not(:disabled) { background: var(--color-green-hover); }
.gf-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
