<template>
  <ModalLayout
    :title="title ?? entry.profile.name"
    action="Save"
    action-icon="save"
    :show-delete="!isCancelled || isAdmin"
    :delete-text="isCancelled ? 'Delete' : 'Cancel'"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="isCancelled ? (confirmDelete = true) : emit('delete')"
  >
    <div v-if="entry.cancelled" class="eem-cancelled">
      Cancelled {{ formatCancelled(entry.cancelled) }}
    </div>

    <div v-if="profileClick || sessionClick" class="eem-actions">
      <AppButton v-if="profileClick" label="View Profile" icon="profile" @click="profileClick!()" />
      <AppButton v-if="sessionClick" label="View Session" icon="register" @click="sessionClick!()" />
    </div>

    <FormLayout :disabled="working">
      <FormRow title="Checked In">
        <input type="checkbox" class="eem-checkbox" v-model="form.checkedIn" />
      </FormRow>

      <FormRow v-if="entry.profile.isGroup" title="Count">
        <input type="number" class="eem-input" v-model.number="form.count" min="1" />
      </FormRow>

      <FormRow title="Hours" :disabled="!form.checkedIn">
        <input type="number" class="eem-input" v-model.number="form.hours" min="0" step="0.5" :disabled="!form.checkedIn" />
      </FormRow>

      <FormRow title="Notes" :full-width="true">
        <textarea class="eem-textarea" v-model="form.notes" rows="2" />
        <EntryIconPicker v-model="form.notes" />
      </FormRow>

      <FormRow v-if="sessionAdults" title="Accompanying Adult" :disabled="!hasChild">
        <select
          class="eem-select"
          :class="{ 'eem-select--placeholder': form.accompanyingAdultId === null }"
          v-model="form.accompanyingAdultId"
          :disabled="!hasChild"
        >
          <option :value="null">Select adult…</option>
          <option v-for="a in sessionAdults" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <p v-if="accompanyingAdultMissing" class="eem-adult-warning">Not registered at this session</p>
      </FormRow>
    </FormLayout>
  </ModalLayout>

  <DeleteModal
    v-if="confirmDelete"
    title="Delete entry?"
    @close="confirmDelete = false"
    @confirm="deleteEntry"
  />
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { EntryItem } from '../../types/entry'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import AppButton from '../../components/AppButton.vue'
import EntryIconPicker from '../../components/EntryIconPicker.vue'
import DeleteModal from './DeleteModal.vue'

const props = defineProps<{
  entry: EntryItem
  working: boolean
  error?: string
  title?: string
  isCancelled?: boolean
  isAdmin?: boolean
  profileClick?: () => void
  sessionClick?: () => void
  sessionAdults?: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  close: []
  save: [data: { checkedIn: boolean; count: number; hours: number; notes: string; accompanyingAdultId: number | null }]
  delete: []
}>()

const confirmDelete = ref(false)

const form = reactive({
  checkedIn: props.entry.checkedIn,
  count: props.entry.count,
  hours: props.entry.hours,
  notes: props.entry.notes ?? '',
  accompanyingAdultId: props.entry.accompanyingAdultId ?? null as number | null,
})

const hasChild = computed(() => /\#child\b/i.test(form.notes))

const accompanyingAdultMissing = computed(() =>
  hasChild.value &&
  form.accompanyingAdultId !== null &&
  !!props.sessionAdults &&
  !props.sessionAdults.some(a => a.id === form.accompanyingAdultId)
)

watch(() => props.entry, (e) => {
  form.checkedIn = e.checkedIn
  form.count = e.count
  form.hours = e.hours
  form.notes = e.notes ?? ''
  form.accompanyingAdultId = e.accompanyingAdultId ?? null
})

watch(hasChild, (val) => {
  if (!val) form.accompanyingAdultId = null
})

function formatCancelled(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function save() {
  emit('save', {
    checkedIn: form.checkedIn,
    count: form.count,
    hours: form.hours,
    notes: form.notes,
    accompanyingAdultId: form.accompanyingAdultId,
  })
}

function deleteEntry() {
  confirmDelete.value = false
  emit('delete')
}
</script>

<style scoped>
.eem-cancelled {
  background: var(--color-dtv-dirt-light);
  color: var(--color-dtv-dirt-dark, var(--color-dtv-dirt));
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.eem-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.eem-input {
  width: 5rem;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
}

.eem-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}

.eem-textarea {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.4rem 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}

.eem-select {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.eem-select:disabled { color: var(--color-text-muted); }
.eem-select--placeholder { color: var(--color-text-muted); }

.eem-adult-warning {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-dtv-dirt);
}
</style>
