import type { RecordListItemResponse } from '../../../types/api-responses'
import { HOURS_FILTERS, matchesHoursFilter } from '../../../types/hours'
import { RECORD_TYPES } from '../../../types/record-types'

/** The Records page filters, as kept in the address. fy is 'all' or an FY key (FY2025). */
export interface RecordFilters {
  type: string
  status: string
  fy: string
  hours: string
}

export const DEFAULT_RECORD_FILTERS: RecordFilters = { type: '', status: '', fy: 'all', hours: '' }

const STATUS_ORDER = ['Invited', 'Accepted', 'Declined', 'Expired']
const TYPE_ORDER: string[] = Object.keys(RECORD_TYPES)

/** The linked Profile's hours in the chosen FY ('all' = every year), from Profile Stats. */
export function recordHoursIn(record: RecordListItemResponse, fy: string): number {
  if (fy === 'all') return Object.values(record.hoursByFY).reduce((sum, h) => sum + h, 0)
  return record.hoursByFY[fy] ?? 0
}

function recordSessionsIn(record: RecordListItemResponse, fy: string): number {
  if (fy === 'all') return Object.values(record.sessionsByFY).reduce((sum, n) => sum + n, 0)
  return record.sessionsByFY[fy] ?? 0
}

/** Whether the Record is in the filters. As on Profiles, a chosen FY shows only Profiles active in it, unless filtering for 0h. */
export function matchesRecordFilters(record: RecordListItemResponse, filters: RecordFilters): boolean {
  if (filters.type && record.type !== filters.type) return false
  if (filters.status && record.status !== filters.status) return false
  if (filters.fy !== 'all' && filters.hours !== '0'
    && recordHoursIn(record, filters.fy) === 0 && recordSessionsIn(record, filters.fy) === 0) return false
  return matchesHoursFilter(recordHoursIn(record, filters.fy), filters.hours)
}

function byOrder(order: string[]) {
  return (a: string, b: string) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
    return a.localeCompare(b)
  }
}

/** The choices each filter offers: only those left by the other filters (filters cascade). */
export function recordFilterOptions(records: RecordListItemResponse[], filters: RecordFilters, financialYears: string[]) {
  const leftBy = (change: Partial<RecordFilters>) => records.filter(r => matchesRecordFilters(r, { ...filters, ...change }))
  return {
    types: [...new Set(leftBy({ type: '' }).map(r => r.type))].sort(byOrder(TYPE_ORDER)),
    statuses: [...new Set(leftBy({ status: '' }).map(r => r.status))].sort(byOrder(STATUS_ORDER)),
    financialYears: financialYears.filter(fy => leftBy({ fy }).length > 0),
    hours: HOURS_FILTERS.filter(h => leftBy({ hours: h.value }).length > 0).map(h => h.value as string),
  }
}

/** Records sorted by Type (in the Types table's order), then Profile name. */
export function sortRecords(records: RecordListItemResponse[]): RecordListItemResponse[] {
  const typeOrder = byOrder(TYPE_ORDER)
  return [...records].sort((a, b) => typeOrder(a.type, b.type) || (a.profileName ?? '').localeCompare(b.profileName ?? ''))
}
