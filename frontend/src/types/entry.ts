export interface EntryProfileSummary {
  name: string
  slug?: string
  isMember: boolean
  cardStatus?: string
  isGroup: boolean
  hasProfileWarning?: boolean
  noPhoto?: boolean
  isFirstAiderAvailable?: boolean
}

export interface EntrySessionSummary {
  groupKey: string
  groupName: string
  date: string
}

export interface EntryItem {
  id: number
  profileId?: number
  checkedIn: boolean
  hours: number
  count: number
  notes?: string
  accompanyingAdultId?: number
  cancelled?: string // ISO datetime if booking was cancelled
  labels?: string[]
  isNew?: boolean
  eventbriteAttendeeId?: string
  profile: EntryProfileSummary
  session: EntrySessionSummary
}
