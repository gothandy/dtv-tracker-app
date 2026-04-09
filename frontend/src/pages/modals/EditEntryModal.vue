<template>
  <ModalLayout
    :title="title ?? entry.profile.name"
    action="Save"
    action-icon="save"
    show-delete
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <div v-if="entry.profile.slug" class="eem-actions">
      <AppButton label="View Profile" icon="profile" @click="router.push(profilePath(entry.profile.slug!))" />
    </div>

    <FormLayout :disabled="working">
      <FormRow title="Checked In">
        <input type="checkbox" class="eem-checkbox" v-model="form.checkedIn" />
      </FormRow>

      <FormRow title="Count">
        <input type="number" class="eem-input" v-model.number="form.count" min="1" />
      </FormRow>

      <FormRow title="Hours">
        <input type="number" class="eem-input" v-model.number="form.hours" min="0" step="0.5" />
      </FormRow>

      <FormRow title="Notes" :full-width="true">
        <textarea class="eem-textarea" v-model="form.notes" rows="2" />
        <EntryTagPicker v-model="form.notes" />
      </FormRow>
    </FormLayout>
  </ModalLayout>

  <ModalLayout
    v-if="confirmDelete"
    title="Delete entry?"
    action="Cancel"
    show-delete
    @close="confirmDelete = false"
    @action="confirmDelete = false"
    @delete="deleteEntry"
  />
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { profilePath } from '../../router/index'
import type { EntryItem } from '../../types/entry'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import AppButton from '../../components/AppButton.vue'
import EntryTagPicker from '../../components/EntryTagPicker.vue'

const props = defineProps<{ entry: EntryItem; working: boolean; error?: string; title?: string }>()
const emit = defineEmits<{
  close: []
  save: [data: { checkedIn: boolean; count: number; hours: number; notes: string }]
  delete: []
}>()

const router = useRouter()
const confirmDelete = ref(false)

const form = reactive({
  checkedIn: props.entry.checkedIn,
  count: props.entry.count,
  hours: props.entry.hours,
  notes: props.entry.notes ?? '',
})

watch(() => props.entry, (e) => {
  form.checkedIn = e.checkedIn
  form.count = e.count
  form.hours = e.hours
  form.notes = e.notes ?? ''
})

function save() {
  emit('save', { checkedIn: form.checkedIn, count: form.count, hours: form.hours, notes: form.notes })
}

function deleteEntry() {
  confirmDelete.value = false
  emit('delete')
}
</script>

<style scoped>
.eem-actions { margin-bottom: 1.25rem; }

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
</style>
