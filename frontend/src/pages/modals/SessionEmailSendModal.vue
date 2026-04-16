<template>
  <ModalLayout
    title="Send Email"
    action="Send"
    action-icon="email"
    :action-disabled="!canSend"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="onSend"
  >
    <FormLayout>
      <FormRow title="Template">
        <select v-model="template" class="sem-select">
          <option value="pre-session">Pre-Session</option>
        </select>
      </FormRow>

      <FormRow title="Send To">
        <select v-model="recipient" class="sem-select">
          <option v-for="a in adults" :key="a.entryId" :value="a.entryId" :disabled="!a.email">
            {{ a.name }}{{ a.email ? ` ${a.email}` : ' (no email)' }}
          </option>
          <option value="send-all">Send All</option>
        </select>
      </FormRow>

      <FormRow title="Preview">
        <label class="sem-check">
          <input type="checkbox" v-model="preview" :disabled="recipient === 'send-all'" />
          Send to my email address only
        </label>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

export interface EmailAdult {
  entryId: number
  name: string
  email?: string
}

const props = defineProps<{
  adults: EmailAdult[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  send: [{ recipient: number | 'send-all', preview: boolean }]
}>()

const template = ref<'pre-session'>('pre-session')
const recipient = ref<number | 'send-all'>(props.adults.find(a => a.email)?.entryId ?? 'send-all')
const preview = ref(true)

// Disable preview when Send All is selected
watch(recipient, val => {
  if (val === 'send-all') preview.value = false
})

const canSend = computed(() => props.adults.length > 0)

function onSend() {
  emit('send', { recipient: recipient.value, preview: preview.value })
}
</script>

<style scoped>
.sem-select {
  width: 100%;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-white);
  font-size: 0.9rem;
  color: var(--color-text);
}

.sem-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.sem-check input {
  cursor: pointer;
}
</style>
