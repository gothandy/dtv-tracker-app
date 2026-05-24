import type { Session } from '../types/session'
import { sessionMatchesFy } from './sessionFy'

export interface EntityWithSessionTotals {
  sessionCount: number
  hours: number
}

export function withSessionTotals<T extends { id: number }>(
  entities: T[],
  sessions: Session[],
  linkSession: (entity: T, session: Session) => boolean,
  fyValue: string
): Array<T & EntityWithSessionTotals> {
  return entities.map(entity => {
    const matched = sessions.filter(s => linkSession(entity, s) && sessionMatchesFy(s, fyValue))
    return {
      ...entity,
      sessionCount: matched.length,
      hours: Math.round(matched.reduce((sum, s) => sum + (s.stats.hours || 0), 0) * 10) / 10,
    }
  })
}

export function entitiesWithSessionsInFy<T extends { id: number }>(
  entities: T[],
  sessions: Session[],
  linkSession: (entity: T, session: Session) => boolean,
  fyValue: string
): T[] {
  if (fyValue === 'all') return entities
  return entities.filter(e => sessions.some(s => linkSession(e, s) && sessionMatchesFy(s, fyValue)))
}
