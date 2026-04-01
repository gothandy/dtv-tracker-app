import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { GroupDetailResponse } from '../../../types/api-responses'

export const useGroupDetailStore = defineStore('groupDetail', () => {
  const group = ref<GroupDetailResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch(key: string) {
    loading.value = true
    error.value = null
    group.value = null
    try {
      const res = await window.fetch(`/api/groups/${key}`)
      if (!res.ok) throw new Error(`Failed to load group (${res.status})`)
      const json: { data: GroupDetailResponse } = await res.json()
      group.value = json.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[groupDetail store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { group, loading, error, fetch }
})
