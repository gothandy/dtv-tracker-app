import type { Session } from '../types/session'
import { sessionMatchesFy } from './sessionFy'

export type FyOption = { value: string; label: string }

export function fyKeyToLabel(fyKey: string): string {
  const startYear = parseInt(fyKey.replace('FY', ''))
  return `FY ${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`
}

/** FY filter choices where at least one entity would appear in the list for that period. */
export function fyOptionsForEntities<T extends { id: number }>(
  entities: T[],
  sessions: Session[],
  linkSession: (entity: T, session: Session) => boolean,
): FyOption[] {
  const hasResults = (fyValue: string) =>
    entities.length > 0 &&
    entitiesWithSessionsInFy(entities, sessions, linkSession, fyValue).length > 0

  const options: FyOption[] = []
  if (hasResults('all')) options.push({ value: 'all', label: 'All FY' })

  const fyKeys = [...new Set(sessions.map(s => s.financialYear))]
    .filter((k): k is string => !!k && k.startsWith('FY'))
    .sort()
    .filter(hasResults)
  options.push(...fyKeys.map(k => ({ value: k, label: fyKeyToLabel(k) })))

  if (hasResults('rolling')) options.push({ value: 'rolling', label: 'Rolling' })
  if (hasResults('future')) options.push({ value: 'future', label: 'Future' })
  return options
}

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
