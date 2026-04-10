<template>
  <ModalLayout
    title="Edit Session"
    action="Save"
    action-icon="save"
    show-delete
    :working="working"
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <FormLayout :disabled="working">
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

    <div v-if="validationError" class="sem-error">{{ validationError }}</div>
    <div v-else-if="error" class="sem-error">{{ error }}</div>
  </ModalLayout>

  <DeleteModal
    v-if="confirmDelete"
    title="Delete Session?"
    body="This will permanently delete the session and all its entries."
    :working="working"
    @close="confirmDelete = false"
    @confirm="emit('delete')"
  />
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useProfile } from '../../composables/useProfile'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import DeleteModal from './DeleteModal.vue'

export interface GroupItem { id: number; name: string; key: string }

export interface SessionSaveData {
  displayName: string
  description: string
  date: string
  groupId: number | null
  limits: Record<string, unknown> | null
  eventbriteEventId: string
}

const props = defineProps<{
  session: SessionDetailResponse
  groups: GroupItem[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [data: SessionSaveData]
  delete: []
}>()

const profile = useProfile()

const confirmDelete = ref(false)
const validationError = ref('')

const form = reactive({
  displayName: props.session.displayName ?? '',
  description: props.session.description ?? '',
  date: props.session.date,
  groupId: props.session.groupId ?? null as number | null,
  limitsRaw: props.session.limits && Object.keys(props.session.limits).length ? JSON.stringify(props.session.limits) : '',
  eventbriteEventId: props.session.eventbriteEventId ?? '',
})

function save() {
  validationError.value = ''
  let limits: Record<string, unknown> | null = null
  if (profile.isAdmin) {
    const limitsRaw = form.limitsRaw.trim()
    if (limitsRaw !== '') {
      try {
        limits = JSON.parse(limitsRaw)
      } catch {
        validationError.value = 'Limits JSON is invalid'
        return
      }
    }
  }
  emit('save', {
    displayName: form.displayName,
    description: form.description,
    date: form.date,
    groupId: form.groupId,
    limits,
    eventbriteEventId: form.eventbriteEventId,
  })
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
