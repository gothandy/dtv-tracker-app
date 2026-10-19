import type { Session } from '../types/session'
import { sessionMatchesFy } from './sessionFy'

/** FY filter value: projects with a session still to come, or no sessions at all yet. */
export const FUTURE_OR_NEW = 'future-new'

/** FY filter value: all years, plus a "No projects" card for each trail without a project. */
export const ALL_TRAILS = 'trails'

/** Status filter values besides the Status choices themselves. */
export const ALL_STATUSES = 'all'
export const NO_STATUS = 'none'

export function isFutureOrNew<T extends { id: number }>(
  project: T,
  sessions: Session[],
  linkSession: (project: T, session: Session) => boolean,
): boolean {
  const linked = sessions.filter(s => linkSession(project, s))
  return linked.length === 0 || linked.some(s => sessionMatchesFy(s, 'future'))
}

export function matchesStatus(status: string | undefined, filter: string): boolean {
  if (filter === ALL_STATUSES) return true
  if (filter === NO_STATUS) return !status
  return status === filter
}
