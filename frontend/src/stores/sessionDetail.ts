import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { SessionDetailResponse } from '../../../types/api-responses'

export const useSessionDetailStore = defineStore('sessionDetail', () => {
  const session = ref<SessionDetailResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch(groupKey: string, date: string) {
    loading.value = true
    error.value = null
    session.value = null
    try {
      const res = await window.fetch(`/api/sessions/${groupKey}/${date}`)
      if (!res.ok) throw new Error(`Failed to load session (${res.status})`)
      const json = await res.json()
      const d = json.data
      session.value = { ...d, isRegistered: d.isRegistered ?? false, isAttended: d.isAttended ?? false, isRegular: d.isRegular ?? false }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[sessionDetail store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { session, loading, error, fetch }
})
