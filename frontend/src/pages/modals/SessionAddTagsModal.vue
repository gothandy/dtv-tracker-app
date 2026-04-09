<template>
  <ModalLayout
    title="Add tag"
    action="Apply"
    action-icon="add"
    :action-disabled="!pickedLabel"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
  >
    <p class="satm-count">{{ count }} session{{ count === 1 ? '' : 's' }} selected</p>
    <TagPicker v-model="pickedLabel" :tree="taxonomyTree" :loading="taxonomyLoading" placeholder="Choose a tag…" @select="onSelect" />
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import TagPicker from '../../components/TagPicker.vue'
import { useTaxonomy } from '../../composables/useTaxonomy'

defineProps<{
  count: number
  working?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [label: string, termGuid: string]
}>()

const { tree: taxonomyTree, loading: taxonomyLoading } = useTaxonomy()
const pickedLabel = ref('')
const pickedGuid = ref('')

function onSelect(label: string, termGuid: string) {
  pickedLabel.value = label
  pickedGuid.value = termGuid
}

function save() {
  if (pickedLabel.value) emit('save', pickedLabel.value, pickedGuid.value)
}
</script>

<style scoped>
.satm-count {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0 0 0.5rem;
}

/* Allow the tag picker dropdown to overflow the modal body */
:deep(.am-body) {
  overflow: visible;
}
</style>
