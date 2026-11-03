import type { Session } from '../types/session'
import { ukToday, ukYearAgo } from '../../../types/uk-date'

/** The financial year (1 April to 31 March) of a YYYY-MM-DD date, as an FY key: FY2025. */
export function financialYearOfDate(date: string): string {
  const year = parseInt(date.slice(0, 4), 10)
  const month = parseInt(date.slice(5, 7), 10)
  return `FY${month >= 4 ? year : year - 1}`
}

/**
 * The FY filter on a date (all | future | rolling | FY2025), as Sessions use it: Future is today
 * or later, Rolling the year up to today. A blank date only matches All.
 */
export function dateMatchesFy(date: string | undefined, fyValue: string, todayIso?: string): boolean {
  if (fyValue === 'all') return true
  if (!date) return false
  const day = date.slice(0, 10)
  const today = todayIso ?? ukToday()
  if (fyValue === 'future') return day >= today
  if (fyValue === 'rolling') return day >= ukYearAgo() && day <= today
  return financialYearOfDate(day) === fyValue
}

export function sessionMatchesFy(session: Session, fyValue: string, todayIso?: string): boolean {
  if (fyValue === 'all' || fyValue === 'future' || fyValue === 'rolling') return dateMatchesFy(session.date, fyValue, todayIso)
  return session.financialYear === fyValue
}
