<template>
  <ModalLayout
    title="Set status"
    action="Apply"
    action-icon="save"
    :action-disabled="!chosen"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
  >
    <p class="pbsm-count">{{ count }} project{{ count === 1 ? '' : 's' }} selected</p>
    <FormRow title="Status" :full-width="true">
      <ModalFormSelect v-model="status" :placeholder="!chosen">
        <option value="" disabled hidden>Choose a status…</option>
        <option :value="null">No status</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </ModalFormSelect>
    </FormRow>
  </ModalLayout>
</template>

<script setup lang="ts">
// Set the status of the selected projects; the same pattern as Sessions' Update project.
import { ref, watch } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'

/** Empty string = no selection yet (distinct from null = "No status"). */
type StatusPick = string | null

defineProps<{
  count: number
  /** The Projects list's Status choices */
  statuses: string[]
  working?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [status: string | null]
}>()

const status = ref<StatusPick>('')
const chosen = ref(false)

watch(status, v => {
  if (v !== '') chosen.value = true
})

function save() {
  if (!chosen.value || status.value === '') return
  emit('save', status.value)
}
</script>

<style scoped>
.pbsm-count {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0 0 0.5rem;
}
</style>
