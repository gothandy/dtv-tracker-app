import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useViewer } from '../composables/useViewer'
import { mapSession } from '../utils/mapSession'
import type { SessionResponse } from '../../../types/api-responses'

export const useSessionListStore = defineStore('sessions', () => {
  const viewer = useViewer()
  const raw = ref<SessionResponse[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const sessions = computed(() =>
    raw.value.map(r => mapSession(r, viewer.user?.profileStats))
  )

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const res = await window.fetch('/api/sessions')
      if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`)
      const json: { data: SessionResponse[] } = await res.json()
      raw.value = json.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[sessionList store]', error.value)
    } finally {
      loading.value = false
    }
  }

  function applyTag(sessionIds: number[], tag: { label: string; termGuid: string }) {
    for (const s of raw.value) {
      if (sessionIds.includes(s.id)) {
        const meta = s.metadata ?? []
        if (!meta.some(t => t.termGuid === tag.termGuid)) {
          s.metadata = [...meta, tag]
        }
      }
    }
  }

  function applyProject(
    sessionIds: number[],
    project: { id: number | null; key?: string; title?: string },
  ) {
    for (const s of raw.value) {
      if (!sessionIds.includes(s.id)) continue
      if (project.id === null) {
        delete s.projectId
        delete s.projectKey
        delete s.projectTitle
      } else {
        s.projectId = project.id
        s.projectKey = project.key
        s.projectTitle = project.title
      }
    }
  }

  return { sessions, loading, error, fetch, applyTag, applyProject }
})
