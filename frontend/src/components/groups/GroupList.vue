<template>
  <DefaultLayout>
    <div class="v1-page">

      <div class="v1-filter-bar">
        <div class="v1-title-row">
          <div class="v1-title-left">
            <h2>Groups</h2>
            <div class="v1-count">{{ filteredGroups.length }}</div>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center">
            <FyFilter v-model="selectedFy" />
            <button v-if="isAdmin" class="icon-btn" @click="showNewGroup = true" title="New group">
              <img src="/svg/add.svg" alt="New group" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="store.loading" class="v1-loading">Loading groups…</div>
      <div v-else-if="store.error" class="v1-error">{{ store.error }}</div>
      <div v-else-if="filteredGroups.length === 0" class="v1-empty">No groups found</div>

      <div v-else class="v1-groups-grid">
        <RouterLink
          v-for="group in filteredGroups"
          :key="group.key"
          :to="groupPath(group.key)"
          class="v1-group-card"
        >
          <h3>
            {{ group.displayName || group.key }}
            <img v-if="group.eventbriteSeriesId" src="/svg/eventbrite.svg" class="v1-eb-badge" alt="Eventbrite" title="Linked to Eventbrite" />
          </h3>
          <div v-if="group.description" class="v1-description">{{ group.description }}</div>
          <div class="v1-meta">
            <div v-if="group.regularsCount > 0" class="v1-meta-item">
              <strong>{{ group.regularsCount }}</strong> regulars
            </div>
            <div class="v1-meta-item">
              <strong>{{ sessionCount(group.id) }}</strong> sessions
            </div>
            <div class="v1-meta-item">
              <strong>{{ groupHours(group.id) }}</strong> hrs
            </div>
          </div>
        </RouterLink>
      </div>

    </div>

    <!-- New Group modal -->
    <div v-if="showNewGroup" class="v1-modal-overlay" @click.self="showNewGroup = false">
      <div class="v1-modal">
        <h3>New Group</h3>
        <div class="v1-modal-field">
          <label>Key (short name, e.g. "Sat")</label>
          <input v-model="newGroupKey" type="text" placeholder="sat" />
        </div>
        <div class="v1-modal-field">
          <label>Display Name (e.g. "Saturday Dig")</label>
          <input v-model="newGroupName" type="text" placeholder="Saturday Dig" />
        </div>
        <div class="v1-modal-field">
          <label>Description (optional)</label>
          <textarea v-model="newGroupDesc"></textarea>
        </div>
        <div class="v1-modal-buttons">
          <button class="v1-modal-btn v1-modal-btn-cancel" @click="showNewGroup = false">Cancel</button>
          <button class="v1-modal-btn v1-modal-btn-confirm" :disabled="!newGroupKey || saving" @click="createGroup">
            {{ saving ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import FyFilter from '../FyFilter.vue'
import { useGroupsStore } from '../../stores/groups'
import { useSessionsStore } from '../../stores/sessions'
import { useRole } from '../../composables/useRole'
import { groupPath } from '../../router/index'

const store = useGroupsStore()
const sessionsStore = useSessionsStore()
const { isAdmin } = useRole()
const router = useRouter()

const selectedFy = ref('all')
const showNewGroup = ref(false)
const newGroupName = ref('')
const newGroupKey = ref('')
const newGroupDesc = ref('')
const saving = ref(false)

onMounted(() => {
  store.fetch()
  sessionsStore.fetch()
})

const filteredGroups = computed(() => {
  if (selectedFy.value === 'all') return store.groups
  const activeIds = new Set(
    sessionsStore.sessions
      .filter(s => s.financialYear === selectedFy.value && s.groupId)
      .map(s => s.groupId)
  )
  return store.groups.filter(g => activeIds.has(g.id))
})

function sessionCount(groupId: number): number {
  return sessionsStore.sessions.filter(s =>
    s.groupId === groupId &&
    (selectedFy.value === 'all' || s.financialYear === selectedFy.value)
  ).length
}

function groupHours(groupId: number): number {
  const total = sessionsStore.sessions
    .filter(s =>
      s.groupId === groupId &&
      (selectedFy.value === 'all' || s.financialYear === selectedFy.value)
    )
    .reduce((sum, s) => sum + (s.hours || 0), 0)
  return Math.round(total * 10) / 10
}

async function createGroup() {
  if (!newGroupKey.value) return
  saving.value = true
  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: newGroupKey.value,
        name: newGroupName.value || undefined,
        description: newGroupDesc.value || undefined
      })
    })
    if (!res.ok) throw new Error('Failed to create group')
    const json = await res.json()
    showNewGroup.value = false
    newGroupKey.value = ''
    newGroupName.value = ''
    newGroupDesc.value = ''
    await store.fetch()
    if (json.data?.key) router.push(groupPath(json.data.key))
  } catch (e) {
    console.error('[GroupsListV1] create group', e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.v1-page {
  background: var(--color-surface-hover);
  min-height: 100%;
  padding: 1.5rem;
}

.v1-filter-bar {
  background: var(--color-white);

  padding: 1rem 1.25rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.5rem;
}

.v1-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.v1-title-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.v1-title-left h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.v1-count {
  background: var(--color-surface-subtle);
  color: var(--color-text-label);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;

}


.v1-groups-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .v1-groups-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .v1-groups-grid { grid-template-columns: 1fr; }
}

.v1-group-card {
  background: var(--color-white);

  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: block;
}

.v1-group-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.v1-group-card h3 {
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.v1-eb-badge {
  width: 16px;
  height: 16px;
  vertical-align: middle;
}

.v1-description {
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  line-height: 1.5;
  font-size: 0.95rem;
}

.v1-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-surface-subtle);
  padding-top: 1rem;
}

.v1-meta-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.v1-meta-item strong { color: var(--color-dtv-green); }

.v1-loading, .v1-error, .v1-empty {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-muted);
}

/* Modal */
.v1-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.v1-modal {
  background: var(--color-white);

  padding: 1.5rem;
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 400px;
}

.v1-modal h3 {
  color: var(--color-text);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.v1-modal-field {
  margin-bottom: 1rem;
}

.v1-modal-field label {
  display: block;
  font-size: 0.85rem;
  color: var(--color-text-label);
  margin-bottom: 0.3rem;
}

.v1-modal-field input,
.v1-modal-field textarea {
  width: 100%;
  font-size: 1rem;
  padding: 0.6rem 0.75rem;
  border: 2px solid var(--color-border);

  font-family: inherit;
}

.v1-modal-field textarea { min-height: 60px; resize: vertical; }

.v1-modal-field input:focus,
.v1-modal-field textarea:focus {
  outline: none;
  border-color: var(--color-dtv-green);
}

.v1-modal-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.v1-modal-btn {
  padding: 0.5rem 1rem;

  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  min-height: 40px;
}

.v1-modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.v1-modal-btn-cancel { background: var(--color-surface-hover); color: var(--color-text-label); }
.v1-modal-btn-confirm { background: var(--color-dtv-green); color: var(--color-white); }
.v1-modal-btn-confirm:hover:not(:disabled) { background: var(--color-green-hover); }
</style>
