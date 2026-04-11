import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProfileResponse } from '../../../types/api-responses'

export const useProfileListStore = defineStore('profiles', () => {
  const profiles = ref<ProfileResponse[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  let abortController: AbortController | null = null

  async function fetch(fy?: string, group?: string) {
    // Cancel any in-flight request before starting a new one
    abortController?.abort()
    abortController = new AbortController()

    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (fy === 'rolling') params.set('fy', 'rolling')
      else if (fy && fy.startsWith('FY')) params.set('fy', fy)
      // 'all' → omit fy param; API always returns hoursAll regardless
      if (group) params.set('group', group)
      const query = params.toString()
      const res = await window.fetch(`/api/profiles${query ? `?${query}` : ''}`, { signal: abortController.signal })
      if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`)
      const json: { data: ProfileResponse[] } = await res.json()
      profiles.value = json.data
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[profileList store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { profiles, loading, error, fetch }
})
