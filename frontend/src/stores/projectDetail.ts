import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProjectDetailResponse, ProjectAttachmentResponse } from '../../../types/api-responses'

export const useProjectDetailStore = defineStore('projectDetail', () => {
  const project = ref<ProjectDetailResponse | null>(null)
  const attachments = ref<ProjectAttachmentResponse[]>([])
  const loading = ref(false)
  const attachmentsLoading = ref(false)
  const error = ref<string | null>(null)
  const httpStatus = ref<number | null>(null)

  async function fetch(key: string) {
    loading.value = true
    error.value = null
    httpStatus.value = null
    project.value = null
    try {
      const res = await window.fetch(`/api/projects/${key}`)
      httpStatus.value = res.status
      if (!res.ok) throw new Error(`Failed to load project (${res.status})`)
      const json: { data: ProjectDetailResponse } = await res.json()
      project.value = json.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[projectDetail store]', error.value)
    } finally {
      loading.value = false
    }
  }

  async function fetchAttachments(key: string) {
    attachmentsLoading.value = true
    try {
      const res = await window.fetch(`/api/projects/${key}/attachments`)
      if (!res.ok) throw new Error(`Failed to load attachments (${res.status})`)
      const json: { data: ProjectAttachmentResponse[] } = await res.json()
      attachments.value = json.data
    } catch (e) {
      console.error('[projectDetail store] fetchAttachments', e)
      attachments.value = []
    } finally {
      attachmentsLoading.value = false
    }
  }

  async function refresh(key: string): Promise<boolean> {
    try {
      const res = await window.fetch(`/api/projects/${key}`)
      httpStatus.value = res.status
      if (!res.ok) return false
      const json: { data: ProjectDetailResponse } = await res.json()
      project.value = json.data
      return true
    } catch (e) {
      console.error('[projectDetail store] refresh', e)
      return false
    }
  }

  return { project, attachments, loading, attachmentsLoading, error, httpStatus, fetch, fetchAttachments, refresh }
})
