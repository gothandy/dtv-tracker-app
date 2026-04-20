<template>
  <ModalLayout
    :title="regular.name"
    :action="regular.regularId ? 'Update' : 'Add'"
    action-icon="save"
    :show-delete="!!regular.regularId"
    :delete-disabled="!regular.regularId"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="emit('delete')"
  >
    <div class="rem-actions">
      <AppButton :label="viewLinkLabel ?? 'View Profile'" icon="profile" @click="emit('viewLink')" />
    </div>

    <FormLayout :disabled="working">
      <FormRow v-if="accompanyingFor?.length || adults.length" title="Accompanying Adult">
        <p v-if="accompanyingFor?.length" class="rem-info">
          Accompanying adult for {{ accompanyingFor.join(', ') }}
        </p>
        <select
          v-else
          class="rem-select"
          :class="{ 'rem-select--placeholder': form.accompanyingAdultId === null }"
          v-model="form.accompanyingAdultId"
        >
          <option :value="null">Select if child…</option>
          <option v-for="a in adults" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import AppButton from '../../components/AppButton.vue'

export interface RegularEditItem {
  name: string
  slug: string
  groupKey?: string
  regularId?: number
  accompanyingAdultId?: number
}

const props = defineProps<{
  regular: RegularEditItem
  adults: { id: number; name: string }[]
  accompanyingFor?: string[]
  working: boolean
  error?: string
  viewLinkLabel?: string
}>()

const emit = defineEmits<{
  close: []
  viewLink: []
  save: [data: { accompanyingAdultId: number | null }]
  delete: []
}>()

const form = reactive({
  accompanyingAdultId: props.regular.accompanyingAdultId ?? null as number | null,
})

watch(() => props.regular, (r) => {
  form.accompanyingAdultId = r.accompanyingAdultId ?? null
})

function save() {
  emit('save', { accompanyingAdultId: form.accompanyingAdultId })
}
</script>

<style scoped>
.rem-actions {
  margin-bottom: 1.25rem;
}

.rem-select {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.rem-select--placeholder { color: var(--color-text-muted); }

.rem-info {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
}
</style>
