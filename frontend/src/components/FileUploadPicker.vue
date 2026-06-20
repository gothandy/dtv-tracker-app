<template>
  <div class="fup">
    <div
      class="drop-zone"
      :class="{ 'drop-zone--over': dragOver, 'drop-zone--has-files': files.length > 0 }"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        :accept="accept"
        class="sr-only"
        :disabled="uploading"
        @change="onFileChange"
      />
      <span v-if="files.length === 0" class="drop-zone-label">{{ emptyLabel }}</span>
      <span v-else class="drop-zone-label drop-zone-label--small">
        {{ files.length }} file{{ files.length === 1 ? '' : 's' }} selected — tap to add more
      </span>
      <span class="drop-zone-hint">{{ hint }}</span>
    </div>

    <ul v-if="files.length > 0" class="file-list">
      <li v-for="f in files" :key="f.name" class="file-item">
        <span class="file-name">{{ f.name }}</span>
        <span class="file-status" :class="`file-status--${f.status}`">
          <img v-if="f.status === 'ok'" src="/icons/tick.svg" width="12" height="12" alt="" class="svg-green" />
          <img v-if="f.status === 'error'" src="/icons/status/error.svg" width="12" height="12" alt="" class="svg-dirt-dark" />
          {{ statusLabel(f.status) }}
        </span>
      </li>
    </ul>

    <p v-if="overLimit" class="form-error">Maximum {{ maxFiles }} files. Please remove some and try again.</p>

    <FormSubmitRow>
      <AppButton
        usage="task"
        :label="uploading ? `Uploading ${uploadedCount + 1} of ${files.length}…` : uploadLabel"
        :disabled="files.length === 0 || overLimit || uploading"
        :working="uploading"
        @click="startUpload"
      />
      <p v-if="uploadError" class="form-error">{{ uploadError }}</p>
    </FormSubmitRow>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppButton from './AppButton.vue'
import FormSubmitRow from './forms/FormSubmitRow.vue'

export type FileUploadItemStatus = 'pending' | 'uploading' | 'ok' | 'error'

export interface FileUploadItem {
  file: File
  name: string
  status: FileUploadItemStatus
}

const props = withDefaults(
  defineProps<{
    accept: string
    emptyLabel: string
    hint: string
    maxFiles?: number
    uploadLabel?: string
    /** Upload one file; return true on success. */
    uploadFile: (file: File) => Promise<boolean>
  }>(),
  {
    maxFiles: 10,
    uploadLabel: 'Upload',
  }
)

const emit = defineEmits<{ done: [uploadedCount: number]; selectionChange: [files: File[]] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const files = ref<FileUploadItem[]>([])
const uploading = ref(false)
const uploadedCount = ref(0)
const uploadError = ref('')

const overLimit = computed(() => files.value.length > props.maxFiles)

function statusLabel(status: FileUploadItemStatus) {
  if (status === 'pending') return 'Pending'
  if (status === 'uploading') return 'Uploading…'
  if (status === 'ok') return 'Done'
  return 'Failed'
}

function emitSelection() {
  emit('selectionChange', files.value.map(f => f.file))
}

function addFiles(incoming: FileList | null) {
  if (!incoming || uploading.value) return
  for (const file of Array.from(incoming)) {
    if (!files.value.find(f => f.name === file.name)) {
      files.value.push({ file, name: file.name, status: 'pending' })
    }
  }
  emitSelection()
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  addFiles(e.dataTransfer?.files ?? null)
}

function onFileChange(e: Event) {
  addFiles((e.target as HTMLInputElement).files)
  if (fileInput.value) fileInput.value.value = ''
}

async function startUpload() {
  uploading.value = true
  uploadError.value = ''
  uploadedCount.value = 0

  for (const item of files.value) {
    if (item.status === 'ok') {
      uploadedCount.value++
      continue
    }
    item.status = 'uploading'
    try {
      const ok = await props.uploadFile(item.file)
      if (!ok) {
        item.status = 'error'
        continue
      }
      item.status = 'ok'
      uploadedCount.value++
    } catch {
      item.status = 'error'
    }
  }

  uploading.value = false
  if (files.value.every(f => f.status === 'ok')) {
    emit('done', uploadedCount.value)
  } else if (!uploadError.value) {
    uploadError.value = 'Some files failed to upload. Fix or remove them and try again.'
  }
}

function setUploadError(message: string) {
  uploadError.value = message
}

defineExpose({ setUploadError })
</script>

<style scoped>
.drop-zone {
  border: 2px dashed var(--color-dtv-sand-dark);
  padding: 1.5rem 1rem;
  text-align: center;
  cursor: pointer;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: border-color 0.15s, background 0.15s;
}

.drop-zone:hover,
.drop-zone--over {
  border-color: var(--color-dtv-green);
  background: color-mix(in srgb, var(--color-dtv-green) 6%, transparent);
}

.drop-zone--has-files {
  border-style: solid;
  border-color: var(--color-dtv-sand-dark);
}

.drop-zone-label {
  font-size: 0.95rem;
  color: var(--color-dtv-dark);
}

.drop-zone-label--small {
  font-weight: 600;
}

.drop-zone-hint {
  font-size: 0.78rem;
  color: var(--color-dtv-dark);
  opacity: 0.5;
}

.file-list {
  list-style: none;
  margin: 0 0 0.25rem;
  padding: 0;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--color-dtv-sand);
  font-size: 0.85rem;
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-dtv-dark);
}

.file-status {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.file-status--pending { color: var(--color-dtv-dark); opacity: 0.4; }
.file-status--uploading { color: var(--color-dtv-gold-dark); }
.file-status--ok { color: var(--color-dtv-green-dark); }
.file-status--error { color: var(--color-dtv-dirt); }

.form-error {
  font-size: 0.875rem;
  color: var(--color-dtv-dirt);
  text-align: center;
  margin: 0;
}
</style>
