/**
 * A State's style (Records v2 PR 2, #324; the States list's BeforeStyle and AfterStyle): Active
 * (green), Info (gold) or Warn (dirt); none = Default (sand). Shown on the Records cards and the
 * Profile page's chips as a left border and the text (/sandbox/record-list-item, /sandbox/record-chip).
 */
export type RecordStateStyle = 'active' | 'info' | 'warn'

const TODAY_STYLES: Record<string, RecordStateStyle> = { Accepted: 'active', Invited: 'warn', Declined: 'warn' }

/**
 * Until PR 2 reads each State's style: Accepted Active, Invited and Declined Warn; the rest
 * (e.g. Expires) Default.
 */
export function todayStyle(status: string): RecordStateStyle | undefined {
  return TODAY_STYLES[status]
}
