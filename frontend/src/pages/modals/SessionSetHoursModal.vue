<template>
  <ModalLayout
    title="Set Default Hours"
    action="Save"
    action-icon="save"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="apply"
  >
    <p class="shm-desc">
      Sets hours for all checked-in entries where hours are not yet recorded.
      <strong>{{ entryCount }} entries</strong> will be updated.
    </p>

    <FormLayout :disabled="working">
      <FormRow title="Hours">
        <input v-model.number="hours" type="number" min="0" step="0.5" class="shm-input" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

const props = defineProps<{ entryCount: number; defaultHours: number; working: boolean; error?: string }>()
const emit = defineEmits<{ close: []; setHours: [hours: number] }>()

const hours = ref(props.defaultHours)

function apply() {
  emit('setHours', hours.value)
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
</style>
