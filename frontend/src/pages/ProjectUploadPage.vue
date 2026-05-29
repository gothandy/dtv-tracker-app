<template>
  <TaskLayout>
    <h1 class="sr-only">Upload project documents</h1>

    <div class="upload-stack">
      <FormCard v-if="loading" title="Upload documents">
        <p class="status-text">Loading…</p>
      </FormCard>

      <FormCard v-else-if="loadError" :title="loadError">
        <p class="status-text">{{ loadErrorDetail }}</p>
        <FormSubmitRow>
          <AppButton usage="task" label="Back to project" @click="router.push(projectPath(projectKey))" />
        </FormSubmitRow>
      </FormCard>

      <FormCard v-else-if="done" title="Documents uploaded">
        <p class="status-text">
          <strong>{{ uploadedTotal }}</strong> {{ uploadedTotal === 1 ? 'file' : 'files' }} uploaded successfully.
        </p>
        <FormSubmitRow>
          <AppButton usage="task" label="Back to project" @click="router.push(projectPath(projectKey))" />
        </FormSubmitRow>
      </FormCard>

      <FormCard
        v-else
        :title="`Upload documents`"
        :subtitle="projectTitle"
      >
        <FileUploadPicker
          ref="pickerRef"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/jpeg,image/png"
          empty-label="Tap or drag to add documents"
          hint="PDF, Word, Excel, PowerPoint, text, images · max 15 MB each · up to 10 files"
          :upload-file="uploadDocument"
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
import { projectPath } from '../router/index'
import type { ProjectResponse } from '../../../types/api-responses'

const route = useRoute()
const router = useRouter()
const pickerRef = ref<InstanceType<typeof FileUploadPicker> | null>(null)

const projectKey = computed(() => String(route.params.key).toLowerCase())

const loading = ref(true)
const loadError = ref('')
const loadErrorDetail = ref('')
const projectTitle = ref('')
const done = ref(false)
const uploadedTotal = ref(0)

usePageTitle('Upload documents')

async function uploadDocument(file: File): Promise<boolean> {
  const form = new FormData()
  form.append('documents', file)
  const res = await fetch(`/api/projects/${projectKey.value}/attachments`, { method: 'POST', body: form })
  if (res.status === 401) {
    router.push(`/login?returnTo=${encodeURIComponent(route.fullPath)}`)
    return false
  }
  if (res.status === 403) {
    pickerRef.value?.setUploadError('Admin access required.')
    return false
  }
  if (res.status === 413) {
    const json = await res.json().catch(() => ({}))
    pickerRef.value?.setUploadError(json.error || 'File too large (maximum 15 MB per file)')
    return false
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    pickerRef.value?.setUploadError(json.error || json.message || `Upload failed (${res.status})`)
    return false
  }
  return true
}

function onUploadDone(count: number) {
  uploadedTotal.value = count
  done.value = true
}

onMounted(async () => {
  const res = await fetch(`/api/projects/${projectKey.value}`)
  if (res.status === 404) {
    loadError.value = 'Project not found'
    loadErrorDetail.value = 'This project does not exist.'
    loading.value = false
    return
  }
  if (!res.ok) {
    loadError.value = 'Error'
    loadErrorDetail.value = 'Could not load project details.'
    loading.value = false
    return
  }
  const json = await res.json()
  const project = json.data as ProjectResponse
  projectTitle.value = project.displayName || project.key
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
</style>
