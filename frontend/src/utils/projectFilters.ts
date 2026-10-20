import type { Session } from '../types/session'
import { sessionMatchesFy } from './sessionFy'

/** FY filter value: projects with a session still to come, or no sessions at all yet. */
export const FUTURE_OR_NEW = 'future-new'

/** FY filter value: all years, plus a "No matches" card for each trail without a project. */
export const ALL_TRAILS = 'trails'

/** The Status filter's value for projects with no status. */
export const NO_STATUS = 'none'

export function isFutureOrNew<T extends { id: number }>(
  project: T,
  sessions: Session[],
  linkSession: (project: T, session: Session) => boolean,
): boolean {
  const linked = sessions.filter(s => linkSession(project, s))
  return linked.length === 0 || linked.some(s => sessionMatchesFy(s, 'future'))
}

/** Whether a project with this status shows, given the statuses crossed out (NO_STATUS for none). */
export function statusShown(status: string | undefined, hidden: string[]): boolean {
  return !hidden.includes(status || NO_STATUS)
}
