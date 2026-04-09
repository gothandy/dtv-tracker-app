<template>
  <ModalLayout
    title="Edit Session"
    action="Save"
    action-icon="save"
    show-delete
    :working="saving || deleting"
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <FormLayout :disabled="saving || deleting">
      <FormRow title="Display Name" :full-width="true">
        <input v-model="form.displayName" class="sem-input" placeholder="Leave blank to use group name" />
      </FormRow>

      <FormRow title="Description" :full-width="true">
        <textarea v-model="form.description" class="sem-textarea" rows="3" />
      </FormRow>

      <template v-if="profile.isAdmin">
        <FormRow title="Date" :full-width="true">
          <input v-model="form.date" type="date" class="sem-input" />
        </FormRow>

        <FormRow title="Group" :full-width="true">
          <select v-model="form.groupId" class="sem-select">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </FormRow>

        <FormRow title="Limits JSON" :full-width="true">
          <input v-model="form.limitsRaw" class="sem-input" placeholder='{"new":4,"total":20}' />
        </FormRow>

        <FormRow title="Eventbrite Event ID" :full-width="true">
          <input v-model="form.eventbriteEventId" class="sem-input" />
        </FormRow>
      </template>
    </FormLayout>

    <div v-if="error" class="sem-error">{{ error }}</div>
  </ModalLayout>

  <DeleteModal
    v-if="confirmDelete"
    title="Delete Session?"
    body="This will permanently delete the session and all its entries."
    @close="confirmDelete = false"
    @confirm="deleteSession"
  />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfile } from '../../composables/useProfile'
import { groupPath } from '../../router/index'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import DeleteModal from './DeleteModal.vue'

interface GroupItem { id: number; name: string; key: string }

const props = defineProps<{
  session: SessionDetailResponse
  groupKey: string
  date: string
}>()

const emit = defineEmits<{ close: []; saved: [groupKey: string, date: string] }>()

const router = useRouter()
const profile = useProfile()

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
  limitsRaw: props.session.limits && Object.keys(props.session.limits).length ? JSON.stringify(props.session.limits) : '',
  eventbriteEventId: props.session.eventbriteEventId ?? '',
})

onMounted(async () => {
  if (!profile.isAdmin) return
  const res = await fetch('/api/groups')
  if (!res.ok) return
  const json = await res.json()
  groups.value = (json.data ?? []).map((g: any) => ({ id: g.id as number, name: g.displayName as string, key: g.key as string })).sort((a: GroupItem, b: GroupItem) => (a.name ?? '').localeCompare(b.name ?? ''))
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    const body: Record<string, unknown> = {
      displayName: form.displayName,
      description: form.description,
    }
    if (profile.isAdmin) {
      body.date = form.date
      body.groupId = form.groupId
      const limitsRaw = form.limitsRaw.trim()
      if (limitsRaw === '') {
        body.limits = null
      } else {
        try { JSON.parse(limitsRaw); body.limits = limitsRaw } catch {
          error.value = 'Limits JSON is invalid'
          saving.value = false
          return
        }
      }
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
</style>
