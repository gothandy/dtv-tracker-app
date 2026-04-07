import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProfileResponse } from '../../../types/api-responses'

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<ProfileResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const res = await window.fetch('/api/profiles')
      if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`)
      const json: { data: ProfileResponse[] } = await res.json()
      profiles.value = json.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[profiles store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { profiles, loading, error, fetch }
})
