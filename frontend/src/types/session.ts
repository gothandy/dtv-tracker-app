// Canonical session type for the Vue frontend.
// Mapped from SessionResponse (types/api-responses.ts) in the sessions store.
// To add a field: add it here, then map it in src/stores/sessions.ts.

export interface Session {
  id: number
  date: string           // YYYY-MM-DD
  groupId?: number
  groupKey?: string
  groupName?: string
  groupDescription?: string
  displayName?: string   // override title; falls back to groupName + date when absent
  description?: string
  financialYear: string
  spacesAvailable: number
  registrations: number
  hours: number
  mediaCount?: number
  newCount?: number
  childCount?: number
  regularCount?: number
  eventbriteCount?: number
  metadata?: Array<{ label: string; termGuid: string }>

  // Current user's relationship to this session.
  // All false when unauthenticated or personal data not yet loaded.
  isRegistered: boolean  // user has an entry for this session
  isAttended: boolean    // user's entry is checked in
  isRegular: boolean     // user is a regular of this session's group
}
