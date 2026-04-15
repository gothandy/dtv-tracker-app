import type { SessionDetailResponse } from '../../../types/api-responses'

export async function fetchSessionAdults(groupKey: string, date: string): Promise<{ id: number; name: string }[]> {
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(groupKey)}/${encodeURIComponent(date)}`)
    if (!res.ok) return []
    const json = await res.json()
    const session: SessionDetailResponse = json.data
    return (session.entries ?? [])
      .filter(e => !e.isGroup && e.profileId !== undefined && !/\#child\b/i.test(e.notes ?? ''))
      .map(e => ({ id: e.profileId!, name: e.volunteerName ?? 'Unknown' }))
  } catch {
    return []
  }
}
