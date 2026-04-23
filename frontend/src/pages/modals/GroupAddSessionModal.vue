<template>
  <ModalLayout
    title="Add Session"
    action="Create"
    :action-disabled="!form.date || !resolvedGroupId"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="add"
  >
    <FormLayout :disabled="working">
      <FormRow v-if="groups" title="Group" :full-width="true">
        <select v-model="form.groupId" class="gasm-input">
          <option value="">Select a group…</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.displayName || g.key }}</option>
        </select>
      </FormRow>

      <FormRow title="Date" :full-width="true">
        <input v-model="form.date" type="date" class="gasm-input" />
      </FormRow>

      <FormRow title="Display Name" :full-width="true">
        <input v-model="form.name" class="gasm-input" :placeholder="group?.displayName || group?.key || ''" />
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { GroupDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'

export type AddSessionPayload = {
  groupId: number
  date: string
  name?: string
}

type GroupOption = { id: number; key: string; displayName?: string | null }

const props = defineProps<{
  group?: GroupDetailResponse
  groups?: GroupOption[]
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddSessionPayload]
}>()

const form = reactive({
  date: '',
  name: '',
  groupId: '' as number | '',
})

const resolvedGroupId = computed(() =>
  props.group ? props.group.id : (form.groupId || null)
)

function add() {
  if (!resolvedGroupId.value) return
  emit('add', {
    groupId: resolvedGroupId.value,
    date: form.date,
    name: form.name || undefined,
  })
}
</script>

<style scoped>
.gasm-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
</style>
