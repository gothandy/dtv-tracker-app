<template>
  <div class="gab-wrap">
    <button class="v1-btn v1-btn-primary" @click="showAdd = true">+ Add session</button>
    <button class="v1-btn" @click="openEdit">Edit</button>
    <a v-if="group.eventbriteSeriesId" :href="`https://www.eventbrite.co.uk/e/${group.eventbriteSeriesId}`" target="_blank" rel="noopener" class="v1-btn" title="View on Eventbrite">
      <img src="/icons/eventbrite.svg" alt="Eventbrite" class="gab-eb-icon" />
    </a>

    <!-- Edit modal -->
    <div v-if="showEdit" class="v1-modal-overlay" @click.self="showEdit = false">
      <div class="v1-modal">
        <h3>Edit group</h3>
        <div class="v1-modal-field">
          <label>Display name</label>
          <input v-model="editName" type="text" />
        </div>
        <div class="v1-modal-field">
          <label>Key</label>
          <input v-model="editKey" type="text" />
        </div>
        <div class="v1-modal-field">
          <label>Description</label>
          <textarea v-model="editDesc"></textarea>
        </div>
        <div class="v1-modal-field">
          <label>Eventbrite series ID</label>
          <input v-model="editEbId" type="text" />
        </div>
        <div class="v1-modal-buttons">
          <button class="v1-btn" @click="showEdit = false">Cancel</button>
          <button class="v1-btn v1-btn-danger" style="margin-right:auto" @click="showEdit = false; showDelete = true">Delete</button>
          <button class="v1-btn v1-btn-primary" :disabled="saving" @click="saveEdit">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add session modal -->
    <div v-if="showAdd" class="v1-modal-overlay" @click.self="showAdd = false">
      <div class="v1-modal">
        <h3>New session</h3>
        <div class="v1-modal-field">
          <label>Date</label>
          <input v-model="newDate" type="date" />
        </div>
        <div class="v1-modal-field">
          <label>Display name (optional)</label>
          <input v-model="newName" type="text" :placeholder="group.displayName || group.key" />
        </div>
        <div class="v1-modal-buttons">
          <button class="v1-btn" @click="showAdd = false">Cancel</button>
          <button class="v1-btn v1-btn-primary" :disabled="!newDate || saving" @click="createSession">
            {{ saving ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="showDelete" class="v1-modal-overlay" @click.self="showDelete = false">
      <div class="v1-modal">
        <h3>Delete group?</h3>
        <p class="v1-modal-body">This will permanently delete <strong>{{ group.displayName || group.key }}</strong> and cannot be undone.</p>
        <div class="v1-modal-buttons">
          <button class="v1-btn" @click="showDelete = false">Cancel</button>
          <button class="v1-btn v1-btn-danger" :disabled="saving" @click="confirmDelete">
            {{ saving ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { groupsPath, sessionPath } from '../../router/index'
import type { GroupDetailResponse } from '../../../../types/api-responses'

const props = defineProps<{ group: GroupDetailResponse }>()
const emit = defineEmits<{ updated: [] }>()

const router = useRouter()

const showEdit = ref(false)
const showDelete = ref(false)
const showAdd = ref(false)
const saving = ref(false)

const newDate = ref('')
const newName = ref('')

const editName = ref('')
const editKey = ref('')
const editDesc = ref('')
const editEbId = ref('')

function openEdit() {
  editName.value = props.group.displayName || ''
  editKey.value = props.group.key
  editDesc.value = props.group.description || ''
  editEbId.value = props.group.eventbriteSeriesId || ''
  showEdit.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    const res = await fetch(`/api/groups/${props.group.key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName.value || undefined,
        key: editKey.value,
        description: editDesc.value || undefined,
        eventbriteSeriesId: editEbId.value || undefined
      })
    })
    if (!res.ok) throw new Error('Failed to save')
    const json = await res.json()
    showEdit.value = false
    if (json.data?.key && json.data.key !== props.group.key) {
      router.push(`/groups/${json.data.key}`)
    } else {
      emit('updated')
    }
  } catch (e) {
    console.error('[GroupActionButtonsV1] save', e)
  } finally {
    saving.value = false
  }
}

async function createSession() {
  saving.value = true
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: props.group.id,
        date: newDate.value,
        name: newName.value || undefined
      })
    })
    if (!res.ok) throw new Error('Failed to create session')
    const json = await res.json()
    showAdd.value = false
    newDate.value = ''
    newName.value = ''
    router.push(sessionPath(props.group.key, json.data?.date ?? newDate.value))
  } catch (e) {
    console.error('[GroupActionButtonsV1] create session', e)
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  saving.value = true
  try {
    const res = await fetch(`/api/groups/${props.group.key}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete')
    router.push(groupsPath())
  } catch (e) {
    console.error('[GroupActionButtonsV1] delete', e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.gab-wrap {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-white);
}

.v1-btn {
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--color-border);
  background: var(--color-surface-hover);
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.v1-btn:hover { background: var(--color-surface-subtle); }
.v1-btn-primary { background: var(--color-dtv-green); color: var(--color-white); border-color: var(--color-dtv-green); }
.v1-btn-primary:hover:not(:disabled) { background: var(--color-green-hover); }
.v1-btn-danger { background: var(--color-dtv-red); color: var(--color-white); border-color: var(--color-dtv-red); }
.v1-btn-danger:hover:not(:disabled) { opacity: 0.88; }
.v1-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.gab-eb-icon { width: 18px; height: 18px; opacity: 0.7; display: block; }

.v1-modal-overlay {
  position: fixed; inset: 0; background: var(--color-overlay);
  z-index: 100; display: flex; align-items: center; justify-content: center;
}

.v1-modal {
  background: var(--color-white); padding: 1.5rem;
  box-shadow: var(--shadow-lg); width: 90%; max-width: 420px;
}

.v1-modal h3 { color: var(--color-text); margin-bottom: 1rem; font-size: 1.1rem; }

.v1-modal-body { color: var(--color-text-secondary); margin-bottom: 1rem; line-height: 1.5; }

.v1-modal-field { margin-bottom: 1rem; }

.v1-modal-field label {
  display: block; font-size: 0.85rem; color: var(--color-text-label); margin-bottom: 0.3rem;
}

.v1-modal-field input,
.v1-modal-field textarea {
  width: 100%; font-size: 1rem; padding: 0.6rem 0.75rem;
  border: 2px solid var(--color-border); font-family: inherit;
  color: var(--color-text); background: var(--color-white); box-sizing: border-box;
}

.v1-modal-field textarea { min-height: 60px; resize: vertical; }

.v1-modal-field input:focus,
.v1-modal-field textarea:focus { outline: none; border-color: var(--color-dtv-green); }

.v1-modal-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
</style>
