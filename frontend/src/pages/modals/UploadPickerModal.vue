<template>
  <ModalLayout title="Upload photos for…" action="Next" :action-disabled="!selected" @close="emit('close')" @action="onNext">
    <div class="field">
      <label class="label" for="upm-select">Volunteer</label>
      <select id="upm-select" class="select" v-model="selected">
        <option disabled value="">Select a name…</option>
        <option v-for="entry in entries" :key="entry.id" :value="entry.id">
          {{ entry.volunteerName ?? 'Unknown' }}
        </option>
      </select>
    </div>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import { useAuth } from '../../composables/useAuth'

const props = defineProps<{
  entries: { id: number; profileId?: number; volunteerName?: string }[]
}>()

const emit = defineEmits<{
  close: []
  select: [entryId: number]
}>()

const { user } = useAuth()

const currentProfileId = computed(() => {
  const slug = user.value?.profileSlug
  if (!slug) return null
  const id = parseInt(slug.split('-').pop() ?? '')
  return isNaN(id) ? null : id
})

const selected = ref<number | ''>('')

watch(currentProfileId, (id) => {
  if (id && selected.value === '') {
    const match = props.entries.find(e => e.profileId === id)
    if (match) selected.value = match.id
  }
}, { immediate: true })

function onNext() {
  if (selected.value !== '') emit('select', selected.value)
}
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
}

.select {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.45rem 0.6rem;
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  box-sizing: border-box;
}
</style>
