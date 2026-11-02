import type { Session } from '../types/session'
import { ukToday, ukYearAgo } from '../../../types/uk-date'

export function sessionMatchesFy(session: Session, fyValue: string, todayIso?: string): boolean {
  const today = todayIso ?? ukToday()
  if (fyValue === 'all') return true
  if (fyValue === 'future') return session.date >= today
  if (fyValue === 'rolling') {
    return session.date >= ukYearAgo() && session.date <= today
  }
  return session.financialYear === fyValue
}
