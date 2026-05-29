import type { Session } from '../types/session'

export function rollingYearStartIso(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

export function sessionMatchesFy(session: Session, fyValue: string, todayIso?: string): boolean {
  const today = todayIso ?? new Date().toISOString().slice(0, 10)
  if (fyValue === 'all') return true
  if (fyValue === 'future') return session.date >= today
  if (fyValue === 'rolling') {
    return session.date >= rollingYearStartIso() && session.date <= today
  }
  return session.financialYear === fyValue
}
