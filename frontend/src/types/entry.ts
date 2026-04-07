export interface EntryProfileSummary {
  name: string
  slug?: string
  isMember: boolean
  cardStatus?: string
  isGroup: boolean
}

export interface EntrySessionSummary {
  groupKey: string
  groupName: string
  date: string
}

export interface EntryItem {
  id: number
  checkedIn: boolean
  hours: number
  count: number
  notes?: string
  profile: EntryProfileSummary
  session: EntrySessionSummary
}
