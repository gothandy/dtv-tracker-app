<template>
  <div class="sl-section">
    <div class="sl-title-row">
      <h3>Sessions</h3>
      <span class="sl-count">{{ filtered.length }}</span>
      <button v-if="isAdmin" class="sl-add-btn" @click="showAdd = true">+ Add session</button>
    </div>
    <div v-if="filtered.length === 0" class="sl-empty">No sessions for this period.</div>
    <div v-else class="sl-list">
      <RouterLink
        v-for="s in filtered"
        :key="s.id"
        :to="sessionPath(s.groupKey!, s.date)"
        class="sl-card"
      >
        <div class="sl-date">{{ formatDate(s.date) }}</div>
        <div class="sl-name">{{ s.displayName || (s.groupName + ' · ' + s.date) }}</div>
        <div class="sl-meta">
          <span v-if="s.registrations">{{ s.registrations }} {{ isPast(s.date) ? 'attended' : 'registered' }}</span>
          <span v-if="s.hours">{{ s.hours }}h</span>
          <span v-if="s.isAttended" class="sl-pill sl-attended">Attended</span>
          <span v-else-if="s.isRegistered" class="sl-pill sl-registered">Registered</span>
        </div>
      </RouterLink>
    </div>
    <!-- New session modal -->
    <div v-if="showAdd" class="sl-modal-overlay" @click.self="showAdd = false">
      <div class="sl-modal">
        <h3>New session</h3>
        <div class="sl-modal-field">
          <label>Date</label>
          <input v-model="newDate" type="date" />
        </div>
        <div class="sl-modal-field">
          <label>Display name (optional)</label>
          <input v-model="newName" type="text" placeholder="Defaults to group name" />
        </div>
        <div class="sl-modal-buttons">
          <button class="sl-btn" @click="showAdd = false">Cancel</button>
          <button class="sl-btn sl-btn-primary" :disabled="!newDate || saving" @click="createSession">
            {{ saving ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { sessionPath } from '../router/index'
import { useRole } from '../composables/useRole'
import type { SessionResponse } from '../../../types/api-responses'

const props = defineProps<{
  sessions: SessionResponse[]
  selectedFy: string
  groupId: number
  groupKey: string
}>()

const { isAdmin } = useRole()
const router = useRouter()

const showAdd = ref(false)
const newDate = ref('')
const newName = ref('')
const saving = ref(false)

const filtered = computed(() =>
  props.selectedFy === 'all'
    ? props.sessions
    : props.sessions.filter(s => s.financialYear === props.selectedFy)
)

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isPast(date: string) {
  return new Date(date) < new Date()
}

async function createSession() {
  saving.value = true
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: props.groupId,
        date: newDate.value,
        name: newName.value || undefined
      })
    })
    if (!res.ok) throw new Error('Failed to create session')
    const json = await res.json()
    showAdd.value = false
    newDate.value = ''
    newName.value = ''
    router.push(sessionPath(props.groupKey, json.data?.date ?? newDate.value))
  } catch (e) {
    console.error('[SessionsListV1] create', e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.sl-section {
  background: var(--color-white);
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.5rem;
}

.sl-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.sl-title-row h3 { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }

.sl-count {
  background: var(--color-surface-subtle); color: var(--color-text-label);
  font-size: 0.8rem; font-weight: 600;
  padding: 0.15rem 0.5rem;
}

.sl-empty { color: var(--color-text-muted); font-size: 0.9rem; padding: 0.5rem 0; }

.sl-list { display: flex; flex-direction: column; gap: 0; }

.sl-card {
  display: block;
  padding: 0.75rem 0.5rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--color-surface-hover);
}

.sl-card:last-child { border-bottom: none; }

.sl-card:hover { background: var(--color-surface-hover); }

.sl-date { font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.15rem; }

.sl-name { font-size: 0.95rem; font-weight: 600; color: var(--color-text); margin-bottom: 0.25rem; }

.sl-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-label);
}

.sl-pill {
  padding: 0.1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.sl-attended { background: var(--color-green-tint); color: var(--color-green-hover); }
.sl-registered { background: var(--color-warning-bg); color: var(--color-warning-text); }

.sl-add-btn {
  margin-left: auto;
  padding: 0.3rem 0.75rem;
  background: var(--color-dtv-green); color: var(--color-white); border: none;
  font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
.sl-add-btn:hover { background: var(--color-green-hover); }

.sl-modal-overlay {
  position: fixed; inset: 0; background: var(--color-overlay);
  z-index: 100; display: flex; align-items: center; justify-content: center;
}
.sl-modal {
  background: var(--color-white); padding: 1.5rem;
  box-shadow: var(--shadow-lg); width: 90%; max-width: 380px;
}
.sl-modal h3 { color: var(--color-text); margin: 0 0 1rem; font-size: 1.1rem; }
.sl-modal-field { margin-bottom: 1rem; }
.sl-modal-field label { display: block; font-size: 0.85rem; color: var(--color-text-label); margin-bottom: 0.3rem; }
.sl-modal-field input {
  width: 100%; font-size: 1rem; padding: 0.6rem 0.75rem;
  border: 2px solid var(--color-border); font-family: inherit; box-sizing: border-box;
  color: var(--color-text); background: var(--color-white);
}
.sl-modal-field input:focus { outline: none; border-color: var(--color-dtv-green); }
.sl-modal-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
.sl-btn { padding: 0.4rem 0.9rem; border: 1px solid var(--color-border); background: var(--color-surface-hover); color: var(--color-text); font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.sl-btn:hover { background: var(--color-surface-subtle); }
.sl-btn-primary { background: var(--color-dtv-green); color: var(--color-white); border-color: var(--color-dtv-green); }
.sl-btn-primary:hover:not(:disabled) { background: var(--color-green-hover); }
.sl-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
