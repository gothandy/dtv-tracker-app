import type { ProfileResponse } from '../../../types/api-responses'
import { matchesProfileRecordFilter, NO_RECORD } from '../../../types/profile-record-filter'
import { RECORD_TYPE_NAMES } from '../../../types/record-types'

const STATE_ORDER = ['Invited', 'Accepted', 'Declined', 'Expires', 'Expired']
const TYPE_ORDER: string[] = [...RECORD_TYPE_NAMES]

function byOrder(order: string[]) {
  return (a: string, b: string) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib)
    return a.localeCompare(b)
  }
}

/**
 * The Record Type and State choices for the Profiles shown by the other filters (filters
 * cascade): only Types and States those Profiles' Records have, each still leaving at least
 * one Profile with the other Record filter applied. "No record" is offered when it would match.
 */
export function profileRecordFilterOptions(profiles: ProfileResponse[], recordType: string, recordState: string) {
  const records = profiles.flatMap(p => p.records ?? [])
  const leaves = (type: string, state: string) => profiles.some(p => matchesProfileRecordFilter(p.records ?? [], type, state))

  const types = [...new Set(records.map(r => r.type))]
    .filter(t => leaves(t, recordState))
    .sort(byOrder(TYPE_ORDER))

  const statesOfType = records.filter(r => !recordType || r.type === recordType).map(r => r.state)
  const states = [...new Set(statesOfType)]
    .filter(s => leaves(recordType, s))
    .sort(byOrder(STATE_ORDER))

  return { types, states, noRecord: leaves(recordType, NO_RECORD) }
}
