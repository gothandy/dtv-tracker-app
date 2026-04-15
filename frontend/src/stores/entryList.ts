import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { EntryListItemResponse } from '../../../types/api-responses'

export const useEntryListStore = defineStore('entryList', () => {
  const entries = ref<EntryListItemResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch(params: { q?: string; accompanyingAdult?: string } = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.q) query.set('q', params.q)
      if (params.accompanyingAdult) query.set('accompanyingAdult', params.accompanyingAdult)
      const qs = query.toString()
      const res = await window.fetch(`/api/entries${qs ? `?${qs}` : ''}`)
      if (!res.ok) {
        console.error(`[entryList] fetch failed: ${res.status} ${res.url}`)
        error.value = `Failed to load entries (${res.status})`
        return
      }
      const json = await res.json()
      entries.value = json.data ?? []
    } catch (err) {
      console.error('[entryList] fetch error:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { entries, loading, error, fetch }
})
