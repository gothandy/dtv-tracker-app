import type { SessionStats } from '../../../types/api-responses'
import type { SessionLimits } from '../types/session'

export type { SessionStats }

export interface SessionDisplayStats {
  count: number
  hours: number
  new: number
  child: number
  regular: number
  eventbrite: number
  repeatCount: number
  effectiveRegularsCount?: number
  spacesLeft: number | null
  totalLimit?: number
  newLimit?: number
  repeatLimit?: number
  childLimit?: number
}

export function sessionDisplayStats(
  stats: SessionStats,
  regularsCount?: number,
  limits?: SessionLimits,
): SessionDisplayStats {
  return {
    count: stats.count,
    hours: stats.hours,
    new: stats.new ?? 0,
    child: stats.child ?? 0,
    regular: stats.regular ?? 0,
    eventbrite: stats.eventbrite ?? 0,
    repeatCount: Math.max(0, stats.count - (stats.new ?? 0) - (stats.regular ?? 0)),
    effectiveRegularsCount: regularsCount !== undefined
      ? regularsCount - (stats.cancelledRegular ?? 0)
      : undefined,
    spacesLeft: limits?.total !== undefined ? limits.total - stats.count : null,
    totalLimit: limits?.total,
    newLimit: limits?.new,
    repeatLimit: limits?.repeat,
    childLimit: limits?.child,
  }
}
