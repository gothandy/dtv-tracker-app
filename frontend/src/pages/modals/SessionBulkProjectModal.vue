<template>
  <ModalLayout
    title="Update project"
    action="Apply"
    action-icon="save"
    :action-disabled="!chosen"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
  >
    <p class="sbpm-count">{{ count }} session{{ count === 1 ? '' : 's' }} selected</p>
    <FormRow title="Project" :full-width="true">
      <ModalFormSelect v-model="projectId" :placeholder="!chosen">
        <option value="" disabled hidden>Choose a project…</option>
        <option :value="null">No project</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </ModalFormSelect>
    </FormRow>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import type { ProjectItem } from './SessionEditModal.vue'

/** Empty string = no selection yet (distinct from null = "No project"). */
type ProjectPick = number | null | ''

defineProps<{
  count: number
  projects: ProjectItem[]
  working?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [projectId: number | null]
}>()

const projectId = ref<ProjectPick>('')
const chosen = ref(false)

watch(projectId, v => {
  if (v !== '') chosen.value = true
})

function save() {
  const v = projectId.value
  if (!chosen.value || v === '') return
  emit('save', v)
}
</script>

<style scoped>
.sbpm-count {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0 0 0.5rem;
}
</style>
