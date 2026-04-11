import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProfileResponse } from '../../../types/api-responses'

export const useProfileListStore = defineStore('profiles', () => {
  const profiles = ref<ProfileResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch(fy?: string, group?: string) {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (fy === 'rolling') params.set('fy', 'rolling')
      else if (fy && fy.startsWith('FY')) params.set('fy', fy)
      // 'all' → omit fy param; API always returns hoursAll regardless
      if (group) params.set('group', group)
      const query = params.toString()
      const res = await window.fetch(`/api/profiles${query ? `?${query}` : ''}`)
      if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`)
      const json: { data: ProfileResponse[] } = await res.json()
      profiles.value = json.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[profileList store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { profiles, loading, error, fetch }
})
