import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RecordListItemResponse, RecordListResponse } from '../../../types/api-responses'
import { apiErrorMessage } from '../utils/api-error'

export const useRecordListStore = defineStore('recordList', () => {
  const records = ref<RecordListItemResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const res = await window.fetch('/api/records')
      if (!res.ok) {
        console.error(`[recordList] fetch failed: ${res.status} ${res.url}`)
        error.value = await apiErrorMessage(res, `Failed to load records (${res.status})`)
        return
      }
      const json: RecordListResponse = await res.json()
      records.value = json.data
    } catch (err) {
      console.error('[recordList] fetch error:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { records, loading, error, fetch }
})
