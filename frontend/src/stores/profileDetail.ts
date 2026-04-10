import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ProfileDetailResponse } from '../../../types/api-responses'

export const useProfileDetailStore = defineStore('profileDetail', () => {
  const profile = ref<ProfileDetailResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch(slug: string) {
    loading.value = true
    error.value = null
    profile.value = null
    try {
      const res = await window.fetch(`/api/profiles/${slug}`)
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`)
      const json: { data: ProfileDetailResponse } = await res.json()
      profile.value = json.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[profileDetail store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { profile, loading, error, fetch }
})
