import type { SessionResponse } from '../../../types/api-responses'

export interface ProjectGroup {
  groupKey: string
  groupName: string
  sessions: number
  hours: number
}

/**
 * The groups that have worked on a project, worked out from its linked sessions: each group's
 * sessions and hours, most hours first (as a profile's Repeats and Regulars). Every group with
 * a session counts; there's no rolling-year cut-off, as a project's totals are all-time.
 * Later these may be stored in the project's Stats (#309), for indexing and filtering.
 */
export function projectGroups(sessions: Pick<SessionResponse, 'groupKey' | 'groupName' | 'stats'>[]): ProjectGroup[] {
  const byKey = new Map<string, ProjectGroup>()
  for (const s of sessions) {
    if (!s.groupKey) continue
    const g = byKey.get(s.groupKey) ?? { groupKey: s.groupKey, groupName: s.groupName || s.groupKey, sessions: 0, hours: 0 }
    g.sessions++
    g.hours += s.stats?.hours ?? 0
    byKey.set(s.groupKey, g)
  }
  return [...byKey.values()]
    .map(g => ({ ...g, hours: Math.round(g.hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours || a.groupName.localeCompare(b.groupName))
}
