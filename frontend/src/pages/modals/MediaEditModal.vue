<template>
  <ModalLayout
    title="Edit Photo"
    action="Save"
    action-icon="save"
    show-delete
    :delete-disabled="form.isCover"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <div class="emm-actions">
      <AppButton label="Download" icon="download" :href="`/api/media/${item.id}/download`" target="_blank" />
    </div>

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

  <DeleteModal
    v-if="confirmDelete"
    title="Delete photo?"
    body="This will permanently delete the photo."
    @close="confirmDelete = false"
    @confirm="doDelete"
  />
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import AppButton from '../../components/AppButton.vue'
import FormRow from '../../components/FormRow.vue'
import DeleteModal from './DeleteModal.vue'
import type { MediaItem } from '../../types/media'

const props = defineProps<{
  item: MediaItem
  showCover?: boolean
  isCover?: boolean
  working?: boolean
  error?: string
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
.emm-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

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
</style>
