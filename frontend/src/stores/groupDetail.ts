import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { GroupDetailResponse } from '../../../types/api-responses'

export const useGroupDetailStore = defineStore('groupDetail', () => {
  const group = ref<GroupDetailResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const httpStatus = ref<number | null>(null)

  async function fetch(key: string) {
    loading.value = true
    error.value = null
    httpStatus.value = null
    group.value = null
    try {
      const res = await window.fetch(`/api/groups/${key}`)
      httpStatus.value = res.status
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

  /** Replace group payload without clearing `group` or `loading` — avoids list flash after small mutations (e.g. delete regular). */
  async function refresh(key: string): Promise<boolean> {
    try {
      const res = await window.fetch(`/api/groups/${key}`)
      httpStatus.value = res.status
      if (!res.ok) return false
      const json: { data: GroupDetailResponse } = await res.json()
      group.value = json.data
      return true
    } catch (e) {
      console.error('[groupDetail store] refresh', e)
      return false
    }
  }

  return { group, loading, error, httpStatus, fetch, refresh }
})
