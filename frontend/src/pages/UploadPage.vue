<template>
  <TaskLayout>
    <h1 class="sr-only">Upload Photos</h1>

    <div class="upload-stack">
      <FormCard v-if="loading" title="Upload Photos">
        <p class="status-text">Loading…</p>
      </FormCard>

      <FormCard v-else-if="loadError" :title="loadError.title">
        <p class="status-text">{{ loadError.detail }}</p>
        <FormSubmitRow v-if="loadError.action">
          <AppButton usage="task" :label="loadError.action.label" @click="router.push(loadError.action.href)" />
        </FormSubmitRow>
      </FormCard>

      <FormCard v-else-if="done" title="Photos uploaded">
        <p class="status-text">
          <strong>{{ uploadedTotal }}</strong> {{ uploadedTotal === 1 ? 'file' : 'files' }} uploaded successfully.
        </p>
        <p class="status-note">{{ completionNote }}</p>
        <FormSubmitRow>
          <AppButton usage="task" label="View session gallery" @click="router.push(galleryHref)" />
        </FormSubmitRow>
      </FormCard>

      <FormCard
        v-else
        :title="`Upload for ${ctx.profileName}`"
        :subtitle="sessionSubtitle"
      >
        <AlertBanner
          v-if="hasVideoSelection"
          type="info"
          message="Tracker currently doesn't support viewing video. Your video will be uploaded and will be available to users once this feature is available."
        />
        <FileUploadPicker
          ref="pickerRef"
          accept=".jpg,.jpeg,.png,.webp,.heic,.mp4,.mov"
          empty-label="Tap or drag to add photos &amp; videos"
          hint="JPG, PNG, WebP, HEIC, MP4, MOV · max 15 MB each · up to 10 files"
          :upload-file="uploadPhoto"
          @selection-change="onSelectionChange"
          @done="onUploadDone"
        />
      </FormCard>
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
import AppButton from '../components/AppButton.vue'
import FileUploadPicker from '../components/FileUploadPicker.vue'
import AlertBanner from '../components/forms/AlertBanner.vue'
import { sessionPath } from '../router/index'
import { isVideoFile } from '../utils/mediaFiles'

usePageTitle('Upload Photos')

const route = useRoute()
const router = useRouter()
const pickerRef = ref<InstanceType<typeof FileUploadPicker> | null>(null)

interface UploadContext {
  entryId: number
  sessionId: number
  sessionName: string
  date: string
  groupKey: string
  groupName: string
  profileName: string
  uploadsPublicDefault: boolean
}

interface LoadError {
  title: string
  detail: string
  action?: { label: string; href: string }
}

const entryId = computed(() => route.query.entryId as string | undefined)

const loading = ref(true)
const loadError = ref<LoadError | null>(null)
const ctx = ref<UploadContext>({
  entryId: 0,
  sessionId: 0,
  sessionName: '',
  date: '',
  groupKey: '',
  groupName: '',
  profileName: '',
  uploadsPublicDefault: false,
})

const done = ref(false)
const uploadedTotal = ref(0)
const hasVideoSelection = ref(false)

const galleryHref = computed(() => sessionPath(ctx.value.groupKey, ctx.value.date))
const sessionSubtitle = computed(() => `${formatDateShort(ctx.value.date)}, ${ctx.value.groupName}`)
const completionNote = computed(() =>
  ctx.value.uploadsPublicDefault
    ? 'Photos are added to the session gallery.'
    : 'Photos are private until a volunteer coordinator marks them public.',
)

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

async function uploadPhoto(file: File): Promise<boolean> {
  const form = new FormData()
  form.append('photos', file)
  const res = await fetch(`/api/entries/${ctx.value.entryId}/photos`, { method: 'POST', body: form })
  if (res.status === 401) {
    router.push(`/login?returnTo=${encodeURIComponent(route.fullPath)}`)
    return false
  }
  if (res.status === 403) {
    pickerRef.value?.setUploadError('You can only upload to your own entries.')
    return false
  }
  return res.ok
}

function onSelectionChange(files: File[]) {
  hasVideoSelection.value = files.some(isVideoFile)
}

function onUploadDone(count: number) {
  uploadedTotal.value = count
  done.value = true
}

onMounted(async () => {
  if (!entryId.value) {
    loadError.value = {
      title: 'Link not found',
      detail: 'No entry ID was provided. Please use the Upload button from your entry.',
    }
    loading.value = false
    return
  }
  const res = await fetch(`/api/entries/${entryId.value}/upload-context`)
  if (res.status === 401) {
    router.push(`/login?returnTo=${encodeURIComponent(route.fullPath)}`)
    return
  }
  if (res.status === 403) {
    loadError.value = {
      title: 'Wrong account',
      detail: 'This upload link belongs to a different account. Please sign in with the correct account.',
      action: { label: 'Sign in', href: `/login?returnTo=${encodeURIComponent(route.fullPath)}` },
    }
    loading.value = false
    return
  }
  if (res.status === 404) {
    loadError.value = {
      title: 'Link not found',
      detail: 'This upload link could not be found. It may have been removed.',
    }
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

.upload-stack :deep(.alert-banner) {
  margin-bottom: 0.75rem;
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
</style>
