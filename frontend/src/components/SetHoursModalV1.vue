<template>
  <div class="dtv-modal-overlay" @click.self="emit('close')">
    <div class="dtv-modal">
      <div class="dtv-modal-header">
        <span class="dtv-modal-title">Set Default Hours</span>
        <button class="dtv-modal-close" @click="emit('close')">×</button>
      </div>

      <p class="shm-desc">
        Sets hours for all checked-in entries where hours are not yet recorded.
        <strong>{{ eligible }} entries</strong> will be updated.
      </p>

      <div class="dtv-field">
        <label class="dtv-label">Hours</label>
        <input v-model.number="hours" type="number" min="0" step="0.5" class="dtv-input" />
      </div>

      <div v-if="error" class="shm-error">{{ error }}</div>

      <div class="dtv-modal-footer">
        <button class="dtv-btn dtv-btn-primary" :disabled="saving || eligible === 0" @click="apply">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EntryResponse } from '../../../types/api-responses'

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
.shm-error { color: var(--color-error); font-size: 0.85rem; margin-top: 0.5rem; }
</style>
