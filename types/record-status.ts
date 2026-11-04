/**
 * The one place a Record's status is read for a check, shared by the server and the browser.
 *
 * Every status check asks `recordStatus(record, evaluationDate)` rather than reading the
 * stored Status: today (`ukToday()`) for Profile views, the Session's date for anything
 * shown on a Session. For now it returns the stored Status unchanged. Records v2 PR 1
 * (#322, #323) moves the checks to the Profile's latest Record on that date and its
 * State's labels, so every check is already in one place to change.
 */

/** The parts of a Record its status depends on. */
export interface RecordFacts {
  status: string;
}

/** The Record's status as of `evaluationDate` (YYYY-MM-DD). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function recordStatus(record: RecordFacts, evaluationDate: string): string {
  return record.status;
}
