/**
 * Whether a Record is its Profile's current Record of its Type: the latest by Date, then the
 * higher ID; a blank Date is the earliest (as the server's records.ts, #322 §1).
 */
interface RecordKey { id: number; type: string; date?: string; profileId?: number }

const day = (r: RecordKey) => (r.date ?? '').substring(0, 10)

export function isCurrentRecord(records: RecordKey[], record: RecordKey): boolean {
  return !records.some(r =>
    r.id !== record.id && r.type === record.type && r.profileId === record.profileId &&
    (day(r) > day(record) || (day(r) === day(record) && r.id > record.id)))
}
