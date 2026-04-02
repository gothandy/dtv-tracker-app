<template>
  <div class="dtv-modal-overlay" @click.self="emit('close')">
    <div class="dtv-modal">
      <div class="dtv-modal-header">
        <span class="dtv-modal-title">Edit Session</span>
        <button class="dtv-modal-close" @click="emit('close')">×</button>
      </div>

      <div class="dtv-field">
        <label class="dtv-label">Display Name</label>
        <input v-model="form.displayName" class="dtv-input" placeholder="Leave blank to use group name" />
      </div>

      <div class="dtv-field">
        <label class="dtv-label">Description</label>
        <textarea v-model="form.description" class="dtv-textarea" rows="3" />
      </div>

      <template v-if="isAdmin">
        <div class="dtv-field">
          <label class="dtv-label">Date</label>
          <input v-model="form.date" type="date" class="dtv-input" />
        </div>

        <div class="dtv-field">
          <label class="dtv-label">Group</label>
          <select v-model="form.groupId" class="dtv-select">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>

        <div class="dtv-field">
          <label class="dtv-label">Eventbrite Event ID</label>
          <input v-model="form.eventbriteEventId" class="dtv-input" />
        </div>
      </template>

      <div v-if="error" class="sem-error">{{ error }}</div>

      <div class="dtv-modal-footer">
        <button v-if="isAdmin" class="dtv-btn dtv-btn-danger" @click="confirmDelete = true">Delete</button>
        <button class="dtv-btn dtv-btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Delete confirmation -->
  <div v-if="confirmDelete" class="dtv-modal-overlay" @click.self="confirmDelete = false">
    <div class="dtv-modal">
      <div class="dtv-modal-header">
        <span class="dtv-modal-title">Delete Session?</span>
      </div>
      <p class="sem-confirm-text">This will permanently delete the session and all its entries.</p>
      <div class="dtv-modal-footer">
        <button class="dtv-btn" @click="confirmDelete = false">Cancel</button>
        <button class="dtv-btn dtv-btn-danger" :disabled="deleting" @click="deleteSession">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRole } from '../../composables/useRole'
import { groupPath } from '../../router/index'
import type { SessionDetailResponse } from '../../../../types/api-responses'

interface GroupItem { id: number; name: string; key: string }

const props = defineProps<{
  session: SessionDetailResponse
  groupKey: string
  date: string
}>()

const emit = defineEmits<{ close: []; saved: [groupKey: string, date: string] }>()

const router = useRouter()
const { isAdmin } = useRole()

const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const error = ref('')
const groups = ref<GroupItem[]>([])

const form = reactive({
  displayName: props.session.displayName ?? '',
  description: props.session.description ?? '',
  date: props.session.date,
  groupId: props.session.groupId ?? null as number | null,
  eventbriteEventId: props.session.eventbriteEventId ?? '',
})

onMounted(async () => {
  if (!isAdmin.value) return
  const res = await fetch('/api/groups')
  if (!res.ok) return
  const json = await res.json()
  groups.value = (json.data ?? []).map((g: any) => ({ id: g.id, name: g.name, key: g.key }))
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    const body: Record<string, unknown> = {
      displayName: form.displayName,
      description: form.description,
    }
    if (isAdmin.value) {
      body.date = form.date
      body.groupId = form.groupId
      body.eventbriteEventId = form.eventbriteEventId
    }
    const res = await fetch(`/api/sessions/${props.groupKey}/${props.date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    const json = await res.json()
    emit('saved', json.data?.groupKey ?? props.groupKey, json.data?.date ?? props.date)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function deleteSession() {
  deleting.value = true
  try {
    const res = await fetch(`/api/sessions/${props.groupKey}/${props.date}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    router.push(groupPath(props.groupKey))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Delete failed'
    confirmDelete.value = false
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.sem-error {
  color: var(--color-error);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}
.sem-confirm-text {
  font-size: 0.9rem;
  margin-bottom: 1rem;
  opacity: 0.8;
}
</style>
