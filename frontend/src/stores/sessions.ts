import { ref } from 'vue'
import { defineStore } from 'pinia'
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
  isRegistered?: boolean
  isAttended?: boolean
  isRegular?: boolean
}

function mapSession(r: SessionResponse): Session {
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
    isRegistered: r.isRegistered ?? false,
    isAttended: r.isAttended ?? false,
    isRegular: r.isRegular ?? false,
  }
}

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<Session[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const res = await window.fetch('/api/sessions')
      if (!res.ok) throw new Error(`Failed to load sessions (${res.status})`)
      const json: { data: SessionResponse[] } = await res.json()
      sessions.value = json.data.map(mapSession)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      console.error('[sessions store]', error.value)
    } finally {
      loading.value = false
    }
  }

  return { sessions, loading, error, fetch }
})
