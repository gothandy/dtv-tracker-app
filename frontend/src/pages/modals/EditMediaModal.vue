<template>
  <ModalLayout
    title="Edit Photo"
    action="Save"
    action-icon="save"
    show-delete
    :delete-disabled="form.isCover"
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <FormRow title="Public" :disabled="form.isCover">
      <input id="emm-public" v-model="form.isPublic" type="checkbox" class="emm-checkbox" :disabled="form.isCover" @change="onPublicChange" />
    </FormRow>

    <FormRow v-if="showCover" title="Cover" :disabled="!form.isPublic">
      <input id="emm-cover" v-model="form.isCover" type="checkbox" class="emm-checkbox" :disabled="!form.isPublic" @change="onCoverChange" />
    </FormRow>

    <FormRow title="Title" :full-width="true">
      <textarea v-model="form.title" class="emm-input emm-textarea" placeholder="Optional caption" rows="2" />
    </FormRow>
  </ModalLayout>

  <ModalLayout
    v-if="confirmDelete"
    title="Delete photo?"
    action="Cancel"
    show-delete
    @close="confirmDelete = false"
    @action="confirmDelete = false"
    @delete="doDelete"
  >
    <p class="emm-confirm-text">This will permanently delete the photo.</p>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormRow from '../../components/FormRow.vue'
import type { MediaItem } from '../../types/media'

const props = defineProps<{
  item: MediaItem
  showCover?: boolean
  isCover?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [{ title: string; isPublic: boolean; isCover: boolean }]
  delete: []
}>()

const confirmDelete = ref(false)

const form = reactive({
  title: props.item.title ?? '',
  isPublic: props.item.isPublic,
  isCover: props.isCover ?? false,
})

function onPublicChange() {
  if (!form.isPublic) form.isCover = false
}

function onCoverChange() {
  if (form.isCover) form.isPublic = true
}

function save() {
  emit('save', { title: form.title, isPublic: form.isPublic, isCover: form.isCover })
}

function doDelete() {
  confirmDelete.value = false
  emit('delete')
}
</script>

<style scoped>
.emm-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.emm-textarea {
  resize: vertical;
}

.emm-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}

.emm-confirm-text {
  font-size: 0.9rem;
  opacity: 0.8;
}
</style>
