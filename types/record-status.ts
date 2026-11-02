/**
 * The one Record status evaluator, shared by the server and the browser (#322 §4).
 *
 * Every status check asks `recordStatus(record, evaluationDate)` rather than reading the
 * stored Status: today (`ukToday()`) for Profile views, the Session's date for anything
 * shown on a Session. For now it returns the stored Status unchanged; Records v2 PR 1
 * changes only this function, so Expired is worked out from End.
 */

/** The parts of a Record its status depends on. Dates are YYYY-MM-DD. */
export interface RecordFacts {
  status: string;
  start?: string;
  end?: string;
}

/** The Record's status as of `evaluationDate` (YYYY-MM-DD). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function recordStatus(record: RecordFacts, evaluationDate: string): string {
  return record.status;
}
