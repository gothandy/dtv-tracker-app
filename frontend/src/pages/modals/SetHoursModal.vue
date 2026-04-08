<template>
  <ModalLayout
    title="Set Default Hours"
    action="Save"
    action-icon="save"
    :working="saving"
    @close="emit('close')"
    @action="apply"
  >
    <p class="shm-desc">
      Sets hours for all checked-in entries where hours are not yet recorded.
      <strong>{{ eligible }} entries</strong> will be updated.
    </p>

    <FormLayout :disabled="saving">
      <FormRow title="Hours">
        <input v-model.number="hours" type="number" min="0" step="0.5" class="shm-input" />
      </FormRow>
    </FormLayout>

    <div v-if="error" class="shm-error">{{ error }}</div>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EntryResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

const props = defineProps<{ entries: EntryResponse[] }>()
const emit = defineEmits<{ close: []; done: [] }>()

const hours = ref(3)
const saving = ref(false)
const error = ref('')

const eligible = computed(() => props.entries.filter(e => e.checkedIn && e.hours === 0).length)

async function apply() {
  saving.value = true
  error.value = ''
  const targets = props.entries.filter(e => e.checkedIn && e.hours === 0)
  try {
    await Promise.all(targets.map(e =>
      fetch(`/api/entries/${e.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: hours.value }),
      })
    ))
    emit('done')
    emit('close')
  } catch (e) {
    error.value = 'Some updates failed — please retry'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.shm-desc {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.shm-input {
  width: 5rem;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
}

.shm-error { color: var(--color-error); font-size: 0.85rem; margin-top: 0.5rem; }
</style>
