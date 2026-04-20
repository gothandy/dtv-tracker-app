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

import type { EntryStats } from '../../../types/entry-stats'

export interface EntryItem {
  id: number
  profileId?: number
  checkedIn: boolean
  hours: number
  count: number
  notes?: string
  accompanyingAdultId?: number
  cancelled?: string // ISO datetime if booking was cancelled
  stats?: EntryStats
  profile: EntryProfileSummary
  session: EntrySessionSummary
}
