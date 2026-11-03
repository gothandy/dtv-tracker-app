import type { RecordListItemResponse } from '../../../types/api-responses'
import { RECORD_TYPE_NAMES } from '../../../types/record-types'
import { dateMatchesFy, financialYearOfDate } from './sessionFy'
import { fyKeyToLabel, type FyOption } from './entitySessionTotals'

/**
 * The Records page filters, as kept in the address. fy is on the Record's Date: all | future |
 * rolling | FY2025. profileId narrows to one Profile's Records (set from its Profile page).
 */
export interface RecordFilters {
  type: string
  status: string
  fy: string
  profileId?: number
}

export const DEFAULT_RECORD_FILTERS: RecordFilters = { type: '', status: '', fy: 'all' }

const STATUS_ORDER = ['Invited', 'Accepted', 'Declined', 'Expires', 'Expired']
const TYPE_ORDER: string[] = [...RECORD_TYPE_NAMES]

export function matchesRecordFilters(record: RecordListItemResponse, filters: RecordFilters): boolean {
  if (filters.profileId !== undefined && record.profileId !== filters.profileId) return false
  if (filters.type && record.type !== filters.type) return false
  if (filters.status && record.status !== filters.status) return false
  return dateMatchesFy(record.date, filters.fy)
}

function byOrder(order: string[]) {
  return (a: string, b: string) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
    return a.localeCompare(b)
  }
}

/**
 * The choices each filter offers: only those left by the other filters (filters cascade). FY
 * follows the other lists' pattern (fyOptionsForEntities): All FY, each FY, Rolling and Future,
 * each only when it would show a Record.
 */
export function recordFilterOptions(records: RecordListItemResponse[], filters: RecordFilters) {
  const leftBy = (change: Partial<RecordFilters>) => records.filter(r => matchesRecordFilters(r, { ...filters, ...change }))
  const hasResults = (fy: string) => leftBy({ fy }).length > 0

  const fyKeys = [...new Set(records.filter(r => r.date).map(r => financialYearOfDate(r.date)))].sort().filter(hasResults)
  const fyOptions: FyOption[] = [
    ...(hasResults('all') ? [{ value: 'all', label: 'All FY' }] : []),
    ...fyKeys.map(k => ({ value: k, label: fyKeyToLabel(k) })),
    ...(hasResults('rolling') ? [{ value: 'rolling', label: 'Rolling' }] : []),
    ...(hasResults('future') ? [{ value: 'future', label: 'Future' }] : []),
  ]

  return {
    types: [...new Set(leftBy({ type: '' }).map(r => r.type))].sort(byOrder(TYPE_ORDER)),
    statuses: [...new Set(leftBy({ status: '' }).map(r => r.status))].sort(byOrder(STATUS_ORDER)),
    fyOptions,
  }
}

/** Records sorted by Type (in the Types' order), then Profile name. */
export function sortRecords(records: RecordListItemResponse[]): RecordListItemResponse[] {
  const typeOrder = byOrder(TYPE_ORDER)
  return [...records].sort((a, b) => typeOrder(a.type, b.type) || (a.profileName ?? '').localeCompare(b.profileName ?? ''))
}
