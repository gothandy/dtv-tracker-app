import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProjectResponse } from '../../../types/api-responses'
import { apiErrorMessage } from '../utils/apiError'

export const useProjectListStore = defineStore('projects', () => {
  const projects = ref<ProjectResponse[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const res = await window.fetch('/api/projects')
      if (!res.ok) throw new Error(await apiErrorMessage(res, `Failed to load projects (${res.status})`))
      const json: { data: ProjectResponse[] } = await res.json()
      projects.value = json.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[projectList store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { projects, loading, error, fetch }
})
