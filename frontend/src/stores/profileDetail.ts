import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import type { ProfileDetailResponse } from '../../../types/api-responses'

export const useProfileDetailStore = defineStore('profileDetail', () => {
  const profile = ref<ProfileDetailResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const httpStatus = ref<number | null>(null)

  async function fetch(slug: string) {
    const router = useRouter()
    loading.value = true
    error.value = null
    httpStatus.value = null
    profile.value = null
    try {
      const res = await window.fetch(`/api/profiles/${slug}`)
      httpStatus.value = res.status
      if (res.status === 401) {
        router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
        return
      }
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

  return { profile, loading, error, httpStatus, fetch }
})
