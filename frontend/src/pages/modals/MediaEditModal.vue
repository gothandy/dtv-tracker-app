<template>
  <ModalLayout
    title="Edit Photo"
    action="Save"
    action-icon="save"
    :show-delete="showDelete"
    :delete-disabled="deleteDisabled"
    :action-disabled="saveDisabled"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <div class="emm-actions" :class="{ 'emm-actions--blocked': working }">
      <AppButton
        label="Download"
        icon="download"
        :href="working ? undefined : `/api/media/${item.id}/download`"
        :disabled="working"
        target="_blank"
      />
    </div>

    <FormLayout :disabled="working">
      <p v-if="isCoverPrivateInvalid" class="emm-hint">
        Cover photos must be public, or remove as cover before saving.
      </p>

      <FormRow title="Public" :disabled="publicRowDisabled">
        <input
          id="emm-public"
          v-model="form.isPublic"
          type="checkbox"
          class="emm-checkbox"
          :disabled="publicCheckboxDisabled"
          @change="onPublicChange"
        />
      </FormRow>

      <FormRow v-if="showCover" title="Cover" :disabled="coverRowDisabled">
        <input
          id="emm-cover"
          v-model="form.isCover"
          type="checkbox"
          class="emm-checkbox"
          :disabled="coverCheckboxDisabled"
          @change="onCoverChange"
        />
      </FormRow>

      <FormRow title="Title" :full-width="true">
        <textarea v-model="form.title" class="emm-input emm-textarea" placeholder="Optional caption" rows="2" />
      </FormRow>
    </FormLayout>
  </ModalLayout>

  <DeleteModal
    v-if="showDelete && confirmDelete"
    title="Delete photo?"
    body="This will permanently delete the photo."
    :working="working"
    @close="confirmDelete = false"
    @confirm="doDelete"
  />
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import AppButton from '../../components/AppButton.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import DeleteModal from './DeleteModal.vue'
import type { MediaItem } from '../../types/media'

const props = withDefaults(defineProps<{
  item: MediaItem
  showCover?: boolean
  isCover?: boolean
  /** When false, Delete is hidden (e.g. Check In — use private instead). */
  showDelete?: boolean
  working?: boolean
  error?: string
}>(), {
  working: false,
  showDelete: true,
})

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

/** Session cover points at this file but IsPublic is false (SharePoint or stale list). */
const isCoverPrivateInvalid = computed(() => form.isCover && !form.isPublic)

const saveDisabled = computed(() => isCoverPrivateInvalid.value)

const deleteDisabled = computed(() => form.isCover)

/** Normal cover+public: cannot uncheck Public without clearing cover first. Invalid state: Public stays enabled. */
const publicCheckboxDisabled = computed(() => form.isCover && form.isPublic)
const publicRowDisabled = publicCheckboxDisabled

/** Normal private: Cover off until Public on. Invalid cover+private: Cover stays enabled. */
const coverCheckboxDisabled = computed(() => !form.isPublic && !isCoverPrivateInvalid.value)
const coverRowDisabled = coverCheckboxDisabled

function onPublicChange() {
  if (!form.isPublic) form.isCover = false
}

function onCoverChange() {
  if (form.isCover) form.isPublic = true
}

function save() {
  if (saveDisabled.value) return
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

.emm-actions--blocked {
  pointer-events: none;
  opacity: 0.5;
}

.emm-hint {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.6rem;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--color-text);
  background: var(--color-dtv-light);
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
