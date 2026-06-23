export interface BulkEntrySessionOption {
  id: number
  label: string
}

interface SessionLike {
  id: number
  date: string
  displayName?: string
  groupName?: string
  groupKey?: string
  isBookable: boolean
}

function sessionLabel(s: SessionLike): string {
  const date = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const name = s.displayName || s.groupName || s.groupKey || 'Session'
  return `${date} — ${name}`
}

export function bulkEntrySessionOptions(sessions: SessionLike[]): BulkEntrySessionOption[] {
  return sessions
    .filter(s => s.isBookable)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ id: s.id, label: sessionLabel(s) }))
}
