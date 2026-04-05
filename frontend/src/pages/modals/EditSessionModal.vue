<template>
  <ModalLayout
    title="Edit Session"
    action="Save"
    action-icon="save"
    show-delete
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <ModalRow title="Display Name" :full-width="true">
      <input v-model="form.displayName" class="sem-input" placeholder="Leave blank to use group name" />
    </ModalRow>

    <ModalRow title="Description" :full-width="true">
      <textarea v-model="form.description" class="sem-textarea" rows="3" />
    </ModalRow>

    <template v-if="isAdmin">
      <ModalRow title="Date" :full-width="true">
        <input v-model="form.date" type="date" class="sem-input" />
      </ModalRow>

      <ModalRow title="Group" :full-width="true">
        <select v-model="form.groupId" class="sem-select">
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </ModalRow>

      <ModalRow title="Eventbrite Event ID" :full-width="true">
        <input v-model="form.eventbriteEventId" class="sem-input" />
      </ModalRow>
    </template>

    <div v-if="error" class="sem-error">{{ error }}</div>
  </ModalLayout>

  <!-- Delete confirmation -->
  <ModalLayout
    v-if="confirmDelete"
    title="Delete Session?"
    action="Cancel"
    show-delete
    @close="confirmDelete = false"
    @action="confirmDelete = false"
    @delete="deleteSession"
  >
    <p class="sem-confirm-text">This will permanently delete the session and all its entries.</p>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRole } from '../../composables/useRole'
import { groupPath } from '../../router/index'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import ModalRow from '../../components/ModalRow.vue'

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
.sem-input,
.sem-select,
.sem-textarea {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.sem-select { cursor: pointer; }
.sem-textarea { resize: vertical; }

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
