import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProjectDetailResponse, DocsTreeNode } from '../../../types/api-responses'
import { removeDocFromTree } from '../utils/docsTree'

export const useProjectDetailStore = defineStore('projectDetail', () => {
  const project = ref<ProjectDetailResponse | null>(null)
  const docsTree = ref<DocsTreeNode[]>([])
  const loading = ref(false)
  const attachmentsLoading = ref(false)
  const attachmentsError = ref<string | null>(null)
  const docsDeletingIds = ref(new Set<string>())
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
    attachmentsError.value = null
    try {
      const res = await window.fetch(`/api/projects/${key}/attachments`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json.message || json.error || `Failed to load documents (${res.status})`
        throw new Error(msg)
      }
      docsTree.value = json.data as DocsTreeNode[]
    } catch (e) {
      console.error('[projectDetail store] fetchAttachments', e)
      docsTree.value = []
      attachmentsError.value = e instanceof Error ? e.message : 'Failed to load documents'
    } finally {
      attachmentsLoading.value = false
    }
  }

  async function deleteDocument(key: string, itemId: string): Promise<boolean> {
    docsDeletingIds.value.add(itemId)
    try {
      const res = await window.fetch(`/api/projects/${key}/attachments/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || json.message || `Delete failed (${res.status})`)
      }
      docsTree.value = removeDocFromTree(docsTree.value, itemId)
      return true
    } catch (e) {
      console.error('[projectDetail store] deleteDocument', e)
      return false
    } finally {
      docsDeletingIds.value.delete(itemId)
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

  return {
    project,
    docsTree,
    loading,
    attachmentsLoading,
    attachmentsError,
    docsDeletingIds,
    error,
    httpStatus,
    fetch,
    fetchAttachments,
    deleteDocument,
    refresh,
  }
})
