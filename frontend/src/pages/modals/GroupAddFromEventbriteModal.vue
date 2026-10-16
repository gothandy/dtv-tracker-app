<template>
  <ModalLayout
    title="Add from Eventbrite"
    :action="noEvents ? 'Add manually' : 'Next'"
    :action-disabled="!noEvents && !selected"
    :error="eventsError"
    @close="emit('close')"
    @action="next"
  >
    <p v-if="noEvents">No upcoming Eventbrite events to add.</p>
    <FormLayout v-else>
      <FormRow title="Event" :full-width="true">
        <LoadingSpinner v-if="eventsLoading" />
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
  /** The picked event, to pre-fill Add Session with; null to add manually. */
  next: [event: EventbriteEventOption | null]
}>()

const eventId = ref('')

const sortedEvents = computed(() =>
  [...props.events].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
)
const selected = computed(() => props.events.find(e => e.id === eventId.value) ?? null)
const noEvents = computed(() => !props.eventsLoading && !props.eventsError && !props.events.length)

function eventLabel(e: EventbriteEventOption): string {
  const date = new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${date} ${e.time} — ${e.name}`
}

function next() {
  if (noEvents.value) emit('next', null)
  else if (selected.value) emit('next', selected.value)
}
</script>
