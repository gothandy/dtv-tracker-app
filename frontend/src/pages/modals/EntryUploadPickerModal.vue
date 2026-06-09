<template>
  <ModalLayout title="Upload photos for…" action="Next" :action-disabled="!selected" @close="emit('close')" @action="onNext">
    <FormLayout>
      <FormRow title="Volunteer" :full-width="true">
        <ModalFormSelect id="upm-select" v-model="selected" :placeholder="selected === ''">
          <option disabled value="">Select a name…</option>
          <option v-for="entry in activeEntries" :key="entry.id" :value="entry.id">
            {{ entry.volunteerName ?? 'Unknown' }}
          </option>
        </ModalFormSelect>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import { useViewer } from '../../composables/useViewer'

const props = defineProps<{
  entries: { id: number; profileId?: number; volunteerName?: string; cancelled?: string }[]
}>()

const emit = defineEmits<{
  close: []
  select: [entryId: number]
}>()

const { user } = useViewer()

const currentProfileId = computed(() => {
  const slug = user?.profileSlug
  if (!slug) return null
  const id = parseInt(slug.split('-').pop() ?? '')
  return isNaN(id) ? null : id
})

const activeEntries = computed(() => props.entries.filter(e => !e.cancelled))

const selected = ref<number | ''>('')

watch(currentProfileId, (id) => {
  if (id && selected.value === '') {
    const match = activeEntries.value.find(e => e.profileId === id)
    if (match) selected.value = match.id
  }
}, { immediate: true })

function onNext() {
  if (selected.value !== '') emit('select', selected.value)
}
</script>
