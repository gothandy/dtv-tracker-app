<template>
  <ModalLayout
    title="Add from Eventbrite"
    action="Next"
    :action-disabled="!selected || eventsLoading"
    @close="emit('close')"
    @action="next"
  >
    <FormLayout>
      <FormRow title="Event" :full-width="true">
        <LoadingSpinner v-if="eventsLoading" />
        <p v-else-if="eventsError" class="modal-form-hint">{{ eventsError }}</p>
        <p v-else-if="!sortedEvents.length" class="modal-form-hint">No upcoming Eventbrite events to add.</p>
        <ModalFormSelect v-else v-model="eventId" :placeholder="!selected">
          <option value="" disabled>Select event…</option>
          <option v-for="e in sortedEvents" :key="e.id" :value="e.id">{{ eventLabel(e) }}</option>
        </ModalFormSelect>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'

/** A DTV Eventbrite event not yet linked to a session. */
export interface EventbriteEventOption {
  id: string
  name: string
  /** YYYY-MM-DD, UK time */
  date: string
  /** HH:MM 24-hour, UK time */
  time: string
  /** Hours */
  length: number
}

const props = defineProps<{
  events: EventbriteEventOption[]
  eventsLoading?: boolean
  eventsError?: string
}>()

const emit = defineEmits<{
  close: []
  /** The picked event, to pre-fill Add Session with. */
  next: [event: EventbriteEventOption]
}>()

const eventId = ref('')

const sortedEvents = computed(() =>
  [...props.events].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
)
const selected = computed(() => props.events.find(e => e.id === eventId.value) ?? null)

function eventLabel(e: EventbriteEventOption): string {
  const date = new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${date} ${e.time} — ${e.name}`
}

function next() {
  if (selected.value) emit('next', selected.value)
}
</script>
