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
      <template v-if="pastSessionAdmin">
        Sets hours for all active entries where hours are not yet recorded (and marks them checked in).
      </template>
      <template v-else>
        Sets hours for all checked-in entries where hours are not yet recorded.
      </template>
      {{ entryCount === 1 ? '1 entry' : `${entryCount} entries` }} will be updated.
    </p>

    <FormLayout :disabled="working">
      <FormRow title="Hours (per person)">
        <ModalFormInput v-model="hours" type="number" narrow min="0" step="0.5" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'

const props = defineProps<{ entryCount: number; defaultHours: number; pastSessionAdmin?: boolean; working: boolean; error?: string }>()
const emit = defineEmits<{ close: []; setHours: [hours: number] }>()

const hours = ref(props.defaultHours)

function apply() {
  emit('setHours', Number(hours.value))
}
</script>

<style scoped>
.shm-desc {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 1rem;
  line-height: 1.5;
}
</style>
