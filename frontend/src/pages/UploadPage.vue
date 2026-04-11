<template>
  <TaskLayout>
    <h1 class="sr-only">Upload Photos</h1>

    <div class="upload-stack">

      <!-- Loading -->
      <FormCard v-if="loading" title="Upload Photos">
        <p class="status-text">Loading…</p>
      </FormCard>

      <!-- Error (401/403/404/other) -->
      <FormCard v-else-if="loadError" :title="loadError.title">
        <p class="status-text">{{ loadError.detail }}</p>
        <FormSubmitRow v-if="loadError.action">
          <FormButton :href="loadError.action.href">{{ loadError.action.label }}</FormButton>
        </FormSubmitRow>
      </FormCard>

      <!-- Success -->
      <FormCard v-else-if="done" title="Photos uploaded">
        <p class="status-text">
          <strong>{{ uploadedCount }}</strong> {{ uploadedCount === 1 ? 'file' : 'files' }} uploaded successfully.
        </p>
        <p class="status-note">Photos are reviewed before appearing publicly.</p>
        <FormSubmitRow>
          <FormButton :href="galleryHref">View session gallery</FormButton>
        </FormSubmitRow>
      </FormCard>

      <!-- Upload form -->
      <template v-else>
        <FormCard :title="`Upload for ${ctx.profileName}`" :subtitle="ctx.sessionName">

          <!-- Drop zone -->
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
              accept=".jpg,.jpeg,.png,.webp,.heic,.mp4,.mov"
              class="sr-only"
              @change="onFileChange"
            />
            <span v-if="files.length === 0" class="drop-zone-label">
              Tap or drag to add photos &amp; videos
            </span>
            <span v-else class="drop-zone-label drop-zone-label--small">
              {{ files.length }} file{{ files.length === 1 ? '' : 's' }} selected — tap to add more
            </span>
            <span class="drop-zone-hint">JPG, PNG, WebP, HEIC, MP4, MOV · max 15 MB each · up to 10 files</span>
          </div>

          <!-- File list -->
          <ul v-if="files.length > 0" class="file-list">
            <li v-for="f in files" :key="f.name" class="file-item">
              <span class="file-name">{{ f.name }}</span>
              <span class="file-status" :class="`file-status--${f.status}`">{{ statusLabel(f.status) }}</span>
            </li>
          </ul>

          <p v-if="overLimit" class="form-error">Maximum 10 files. Please remove some and try again.</p>

          <FormSubmitRow>
            <FormButton
              :disabled="files.length === 0 || overLimit || uploading"
              :working="uploading"
              @click="startUpload"
            >
              {{ uploading ? `Uploading ${uploadedCount + 1} of ${files.length}…` : 'Upload' }}
            </FormButton>
            <p v-if="uploadError" class="form-error">{{ uploadError }}</p>
          </FormSubmitRow>

        </FormCard>
      </template>

    </div>
  </TaskLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageTitle } from '../composables/usePageTitle'
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import FormButton from '../components/forms/FormButton.vue'
import { sessionPath } from '../router/index'

usePageTitle('Upload Photos')

const route = useRoute()
const router = useRouter()

interface FileItem {
  file: File
  name: string
  status: 'pending' | 'uploading' | 'ok' | 'error'
  errorMsg?: string
}

interface UploadContext {
  entryId: number
  sessionId: number
  sessionName: string
  date: string
  groupKey: string
  profileName: string
}

interface LoadError {
  title: string
  detail: string
  action?: { label: string; href: string }
}

const entryId = computed(() => route.query.entryId as string | undefined)

const loading = ref(true)
const loadError = ref<LoadError | null>(null)
const ctx = ref<UploadContext>({ entryId: 0, sessionId: 0, sessionName: '', date: '', groupKey: '', profileName: '' })

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const files = ref<FileItem[]>([])
const uploading = ref(false)
const uploadedCount = ref(0)
const uploadError = ref('')
const done = ref(false)

const overLimit = computed(() => files.value.length > 10)
const galleryHref = computed(() => sessionPath(ctx.value.groupKey, ctx.value.date))

function statusLabel(status: FileItem['status']) {
  if (status === 'pending')   return 'Pending'
  if (status === 'uploading') return 'Uploading…'
  if (status === 'ok')        return '✓ Done'
  return '✕ Failed'
}

function addFiles(incoming: FileList | null) {
  if (!incoming) return
  for (const file of Array.from(incoming)) {
    if (!files.value.find(f => f.name === file.name)) {
      files.value.push({ file, name: file.name, status: 'pending' })
    }
  }
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
    if (item.status === 'ok') { uploadedCount.value++; continue }
    item.status = 'uploading'
    const form = new FormData()
    form.append('photos', item.file)
    try {
      const res = await fetch(`/api/entries/${ctx.value.entryId}/photos`, { method: 'POST', body: form })
      if (res.status === 401) { router.push(`/login?returnTo=${encodeURIComponent(route.fullPath)}`); return }
      if (res.status === 403) { uploadError.value = 'You can only upload to your own entries.'; item.status = 'error'; continue }
      if (!res.ok) { item.status = 'error'; continue }
      item.status = 'ok'
      uploadedCount.value++
    } catch {
      item.status = 'error'
    }
  }

  uploading.value = false
  if (files.value.every(f => f.status === 'ok')) {
    done.value = true
  }
}

onMounted(async () => {
  if (!entryId.value) {
    loadError.value = { title: 'Link not found', detail: 'No entry ID was provided. Please use the Upload button from your entry.' }
    loading.value = false
    return
  }
  const res = await fetch(`/api/entries/${entryId.value}/upload-context`)
  if (res.status === 401) { router.push(`/login?returnTo=${encodeURIComponent(route.fullPath)}`); return }
  if (res.status === 403) {
    loadError.value = { title: 'Wrong account', detail: 'This upload link belongs to a different account. Please sign in with the correct account.', action: { label: 'Sign in', href: `/login?returnTo=${encodeURIComponent(route.fullPath)}` } }
    loading.value = false
    return
  }
  if (res.status === 404) {
    loadError.value = { title: 'Link not found', detail: 'This upload link could not be found. It may have been removed.' }
    loading.value = false
    return
  }
  if (!res.ok) {
    loadError.value = { title: 'Error', detail: 'Could not load upload details. Please try again.' }
    loading.value = false
    return
  }
  const body = await res.json()
  ctx.value = body.data
  loading.value = false
})
</script>

<style scoped>
.upload-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-text {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  margin: 0 0 0.25rem;
  text-align: center;
  line-height: 1.5;
}

.status-text strong {
  opacity: 1;
  font-weight: 700;
}

.status-note {
  font-size: 0.8rem;
  color: var(--color-dtv-dark);
  opacity: 0.5;
  text-align: center;
  margin: 0;
}

/* Drop zone */
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

/* File list */
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
}

.file-status--pending   { color: var(--color-dtv-dark); opacity: 0.4; }
.file-status--uploading { color: var(--color-dtv-gold-dark); }
.file-status--ok        { color: var(--color-dtv-green-dark); }
.file-status--error     { color: var(--color-dtv-dirt); }

.form-error {
  font-size: 0.875rem;
  color: var(--color-dtv-dirt);
  text-align: center;
  margin: 0;
}
</style>
