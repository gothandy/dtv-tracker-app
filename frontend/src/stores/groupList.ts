import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { GroupResponse } from '../../../types/api-responses'

export { GroupResponse }

export const useGroupListStore = defineStore('groups', () => {
  const groups = ref<GroupResponse[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const res = await window.fetch('/api/groups')
      if (!res.ok) throw new Error(`Failed to load groups (${res.status})`)
      const json: { data: GroupResponse[] } = await res.json()
      groups.value = json.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[groupList store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { groups, loading, error, fetch }
})
