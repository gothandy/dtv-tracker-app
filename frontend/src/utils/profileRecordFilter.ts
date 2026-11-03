import type { ProfileResponse } from '../../../types/api-responses'
import { matchesProfileRecordFilter, NO_RECORD } from '../../../types/profile-record-filter'
import { RECORD_TYPES } from '../../../types/record-types'

const STATUS_ORDER = ['Invited', 'Accepted', 'Declined', 'Expires', 'Expired']
const TYPE_ORDER: string[] = Object.keys(RECORD_TYPES)

function byOrder(order: string[]) {
  return (a: string, b: string) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
    return a.localeCompare(b)
  }
}

/**
 * The Record Type and Status choices for the Profiles shown by the other filters (filters
 * cascade): only Types and Statuses those Profiles' Records have, each still leaving at least
 * one Profile with the other Record filter applied. "No record" is offered when it would match.
 */
export function profileRecordFilterOptions(profiles: ProfileResponse[], recordType: string, recordStatus: string) {
  const records = profiles.flatMap(p => p.records ?? [])
  const leaves = (type: string, status: string) => profiles.some(p => matchesProfileRecordFilter(p.records ?? [], type, status))

  const types = [...new Set(records.map(r => r.type))]
    .filter(t => leaves(t, recordStatus))
    .sort(byOrder(TYPE_ORDER))

  const statusesOfType = records.filter(r => !recordType || r.type === recordType).map(r => r.status)
  const statuses = [...new Set(statusesOfType)]
    .filter(s => leaves(recordType, s))
    .sort(byOrder(STATUS_ORDER))

  return { types, statuses, noRecord: leaves(recordType, NO_RECORD) }
}
