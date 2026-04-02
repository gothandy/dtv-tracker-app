<template>
  <div class="gf-wrap">
    <div class="gf-title-row">
      <h2 class="gf-heading">Groups</h2>
      <span class="gf-count">{{ filtered.length }}</span>
      <div class="gf-actions">
        <FyFilter v-model="fy" />
        <button v-if="isAdmin" class="icon-btn" @click="showNew = true" title="New group">
          <img src="/svg/add.svg" alt="New group" />
        </button>
      </div>
    </div>

    <!-- New Group modal -->
    <div v-if="showNew" class="gf-modal-overlay" @click.self="showNew = false">
      <div class="gf-modal">
        <h3>New Group</h3>
        <div class="gf-modal-field">
          <label>Key (short name, e.g. "sat")</label>
          <input v-model="newKey" type="text" placeholder="sat" />
        </div>
        <div class="gf-modal-field">
          <label>Display Name (e.g. "Saturday Dig")</label>
          <input v-model="newName" type="text" placeholder="Saturday Dig" />
        </div>
        <div class="gf-modal-field">
          <label>Description (optional)</label>
          <textarea v-model="newDesc"></textarea>
        </div>
        <div class="gf-modal-buttons">
          <button class="gf-btn" @click="showNew = false">Cancel</button>
          <button class="gf-btn gf-btn--primary" :disabled="!newKey || saving" @click="createGroup">
            {{ saving ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import { useRole } from '../../composables/useRole'
import { useGroupsStore } from '../../stores/groups'
import { groupPath } from '../../router/index'
import type { GroupResponse } from '../../../../types/api-responses'
import type { Session } from '../../types/session'

export interface GroupWithStats extends GroupResponse {
  sessionCount: number
  hours: number
}

const props = defineProps<{ groups: GroupResponse[]; sessions: Session[] }>()
const emit = defineEmits<{ filtered: [groups: GroupWithStats[]] }>()

const { isAdmin } = useRole()
const router = useRouter()
const groupsStore = useGroupsStore()

const fy = ref('all')
const showNew = ref(false)
const newKey = ref('')
const newName = ref('')
const newDesc = ref('')
const saving = ref(false)

const filtered = computed<GroupWithStats[]>(() => {
  const fyGroups = fy.value === 'all'
    ? props.groups
    : props.groups.filter(g => props.sessions.some(s => s.groupId === g.id && s.financialYear === fy.value))

  return fyGroups.map(g => {
    const groupSessions = props.sessions.filter(s =>
      s.groupId === g.id && (fy.value === 'all' || s.financialYear === fy.value)
    )
    return {
      ...g,
      sessionCount: groupSessions.length,
      hours: Math.round(groupSessions.reduce((sum, s) => sum + (s.hours || 0), 0) * 10) / 10,
    }
  })
})

watch(filtered, list => emit('filtered', list), { immediate: true })

async function createGroup() {
  if (!newKey.value) return
  saving.value = true
  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: newKey.value,
        name: newName.value || undefined,
        description: newDesc.value || undefined,
      })
    })
    if (!res.ok) throw new Error('Failed to create group')
    const json = await res.json()
    showNew.value = false
    newKey.value = ''; newName.value = ''; newDesc.value = ''
    await groupsStore.fetch()
    if (json.data?.key) router.push(groupPath(json.data.key))
  } catch (e) {
    console.error('[GroupsFilterV1] create', e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.gf-wrap {
  background: var(--color-white);
  padding: 1rem 1.25rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.5rem;
}

.gf-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.gf-heading { font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin: 0; }

.gf-count {
  background: var(--color-surface-subtle); color: var(--color-text-label);
  font-size: 0.8rem; font-weight: 600;
  padding: 0.15rem 0.5rem;
  margin-right: auto;
}

.gf-actions { display: flex; gap: 0.5rem; align-items: center; }


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
