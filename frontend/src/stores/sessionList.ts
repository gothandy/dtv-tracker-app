import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useViewer } from '../composables/useViewer'
import type { Session, SessionLimits } from '../types/session'

interface SessionResponse {
  id: number
  date: string
  groupId?: number
  groupKey?: string
  groupName?: string
  groupDescription?: string
  displayName?: string
  description?: string
  financialYear: string
  isBookable: boolean
  limits: SessionLimits
  registrations: number
  hours: number
  mediaCount?: number
  newCount?: number
  childCount?: number
  regularCount?: number
  regularsCount?: number
  eventbriteCount?: number
  metadata?: Array<{ label: string; termGuid: string }>
}

function mapSession(r: SessionResponse, profileStats: { sessionIds?: number[]; regularGroupIds?: number[] } | undefined): Session {
  return {
    id: r.id,
    date: r.date,
    groupId: r.groupId,
    groupKey: r.groupKey,
    groupName: r.groupName,
    groupDescription: r.groupDescription,
    displayName: r.displayName,
    description: r.description,
    financialYear: r.financialYear,
    isBookable: r.isBookable,
    limits: r.limits,
    registrations: r.registrations,
    hours: r.hours,
    mediaCount: r.mediaCount,
    newCount: r.newCount,
    childCount: r.childCount,
    regularCount: r.regularCount,
    regularsCount: r.regularsCount,
    eventbriteCount: r.eventbriteCount,
    metadata: r.metadata,
    isRegistered: profileStats?.sessionIds?.includes(r.id) ?? false,
    isAttended: !r.isBookable && (profileStats?.sessionIds?.includes(r.id) ?? false),
    isRegular: profileStats?.regularGroupIds?.includes(r.groupId ?? -1) ?? false,
  }
}

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

  return { sessions, loading, error, fetch, applyTag }
})
