/**
 * API Response Types
 *
 * These define the HTTP API contract with clean, camelCase field names
 * independent of SharePoint column names and internal domain types.
 */

export interface GroupRegularResponse {
  name: string;
  slug: string;
}

export interface GroupResponse {
  id: number;
  key: string;
  displayName?: string;
  description?: string;
  eventbriteSeriesId?: string;
  regularsCount: number;
  regulars: GroupRegularResponse[];
}

export interface SessionResponse {
  id: number;
  displayName?: string;
  description?: string;
  date: string;
  groupId?: number;
  groupKey?: string;
  groupName?: string;
  registrations: number;
  hours: number;
  financialYear: string;
  eventbriteEventId?: string;
  eventbriteUrl?: string;
}

export interface ProfileResponse {
  id: number;
  slug: string;
  name?: string;
  email?: string;
  isGroup: boolean;
  hoursLastFY: number;
  hoursThisFY: number;
  sessionsLastFY: number;
  sessionsThisFY: number;
}

export interface ProfileEntryResponse {
  id: number;
  date: string;
  groupKey?: string;
  groupName?: string;
  count: number;
  hours: number;
  checkedIn: boolean;
  notes?: string;
  financialYear: string;
}

export interface ProfileGroupHours {
  groupId: number;
  groupKey: string;
  groupName: string;
  hoursThisFY: number;
  hoursLastFY: number;
  isRegular: boolean;
  regularId?: number;
}

export interface ConsentRecordResponse {
  type: string;
  status: string;
  date: string;
}

export interface ProfileDetailResponse {
  id: number;
  slug: string;
  name?: string;
  email?: string;
  matchName?: string;
  isGroup: boolean;
  hoursLastFY: number;
  hoursThisFY: number;
  groupHours: ProfileGroupHours[];
  entries: ProfileEntryResponse[];
  records?: ConsentRecordResponse[];
}

export interface GroupDetailResponse {
  id: number;
  key: string;
  displayName?: string;
  description?: string;
  eventbriteSeriesId?: string;
  regulars: GroupRegularResponse[];
  financialYear: string;
  stats: {
    sessions: number;
    hours: number;
    newVolunteers: number;
    children: number;
    totalVolunteers: number;
  };
  sessions: SessionResponse[];
}

export interface EntryResponse {
  id: number;
  volunteerName?: string;
  volunteerSlug?: string;
  isGroup: boolean;
  count: number;
  hours: number;
  checkedIn: boolean;
  notes?: string;
}

export interface SessionDetailResponse {
  id: number;
  displayName?: string;
  description?: string;
  date: string;
  groupId?: number;
  groupName?: string;
  registrations: number;
  hours: number;
  financialYear: string;
  eventbriteEventId?: string;
  eventbriteUrl?: string;
  entries: EntryResponse[];
}

export interface EntryDetailResponse {
  id: number;
  volunteerName?: string;
  volunteerSlug?: string;
  isGroup: boolean;
  hoursLastFY: number;
  hoursThisFY: number;
  volunteerEntryCount: number;
  count: number;
  hours: number;
  checkedIn: boolean;
  notes?: string;
  date: string;
  groupKey?: string;
  groupName?: string;
  sessionDisplayName?: string;
}

export interface FYStatsResponse {
  activeGroups: number;
  sessions: number;
  hours: number;
  volunteers: number;
  financialYear: string;
  label: string;
}

export interface StatsResponse {
  thisFY: FYStatsResponse;
  lastFY: FYStatsResponse;
}
