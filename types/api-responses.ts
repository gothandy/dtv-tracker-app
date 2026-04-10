/**
 * API Response Types
 *
 * These define the HTTP API contract with clean, camelCase field names
 * independent of SharePoint column names and internal domain types.
 */

import type { SessionLimits } from '../services/data-layer';

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
  isCurrentUserRegular?: boolean;
}

export interface SessionResponse {
  id: number;
  displayName?: string;
  description?: string;
  date: string;
  groupId?: number;
  groupKey?: string;
  groupName?: string;
  limits: SessionLimits;
  registrations: number;
  hours: number;
  newCount?: number;
  childCount?: number;
  regularCount?: number;
  regularsCount?: number;
  eventbriteCount?: number;
  mediaCount?: number;
  financialYear: string;
  isBookable: boolean;
  eventbriteEventId?: string;
  metadata?: Array<{ label: string; termGuid: string }>;
  // Per-user status — only present when request is authenticated and user has a profile
  // TODO #70: remove after public/ migration — Vue frontend derives these from profileStats in sessions store
  isRegistered?: boolean;
  isAttended?: boolean;
  isRegular?: boolean;
}

export interface ProfileResponse {
  id: number;
  slug: string;
  name?: string;
  email?: string;
  user?: string;
  isGroup: boolean;
  isMember: boolean;
  cardStatus?: string;
  hoursLastFY: number;
  hoursThisFY: number;
  hoursAll: number;
  sessionsLastFY: number;
  sessionsThisFY: number;
  sessionsAll: number;
  records?: Array<{ type: string; status: string }>;
}

export interface ProfileEntryResponse {
  id: number;
  date: string;
  groupKey?: string;
  groupName?: string;
  sessionName?: string;
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
  hoursAll: number;
  isRegular: boolean;
  regularId?: number;
}

export interface ConsentRecordResponse {
  id: number;
  type: string;
  status: string;
  date: string;
}

export interface ProfileDetailResponse {
  id: number;
  slug: string;
  name?: string;
  emails: string[];
  matchName?: string;
  user?: string;
  isGroup: boolean;
  hoursLastFY: number;
  hoursThisFY: number;
  hoursAll: number;
  groupHours: ProfileGroupHours[];
  entries: ProfileEntryResponse[];
  records?: ConsentRecordResponse[];
  duplicates?: ProfileDuplicateResponse[];
  linkedProfiles?: Array<{ id: number; slug: string; name: string }>;
}

export interface ProfileDuplicateResponse {
  id: number;
  name: string;
  slug: string;
  email?: string;
  severity: 'green' | 'orange' | 'red';
}

export interface GroupDetailResponse {
  id: number;
  key: string;
  displayName?: string;
  description?: string;
  eventbriteSeriesId?: string;
  regulars: GroupRegularResponse[];
  isCurrentUserRegular?: boolean;
  financialYear: string;
  stats: {
    sessions: number;
    hours: number;
    newVolunteers: number;
    children: number;
    totalVolunteers: number;
    // v2 field names (v1 compat: old names kept alongside until public/ is deleted)
    newProfiles?: number;
    totalProfiles?: number;
  };
  sessions: SessionResponse[];
}

export interface EntryResponse {
  id: number;
  profileId?: number;
  volunteerName?: string;
  volunteerSlug?: string;
  // v2 field names (v1 compat: old names kept alongside until public/ is deleted)
  profileName?: string;
  profileSlug?: string;
  isGroup: boolean;
  isMember: boolean;
  cardStatus?: string;
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
  groupDescription?: string;
  limits: SessionLimits;
  registrations: number;
  hours: number;
  newCount?: number;
  childCount?: number;
  regularCount?: number;
  eventbriteCount?: number;
  financialYear: string;
  isBookable: boolean;
  eventbriteEventId?: string;
  groupEventbriteSeriesId?: string;
  metadata?: Array<{ label: string; termGuid: string }>;
  regularsCount?: number;
  coverMediaId: number | null;
  statsRaw: string | null;
  entries: EntryResponse[];
  nextSession?: string;
  // Per-user status — only present when request is authenticated and user has a profile
  isRegistered?: boolean;
  isAttended?: boolean;
  isRegular?: boolean;
  userIsNew?: boolean;        // #New tag present on the user's entry for this session
  userEntryId?: number;       // entry ID for this user on this session (when isRegistered)
}

export interface EntryDetailResponse {
  id: number;
  volunteerName?: string;
  volunteerSlug?: string;
  volunteerEmail?: string;
  volunteerEmails?: string[];
  volunteerEntryCount: number;
  // v2 field names (v1 compat: old names kept alongside until public/ is deleted)
  profileName?: string;
  profileSlug?: string;
  profileEmail?: string;
  profileEmails?: string[];
  profileEntryCount?: number;
  isGroup: boolean;
  hoursLastFY: number;
  hoursThisFY: number;
  count: number;
  hours: number;
  checkedIn: boolean;
  notes?: string;
  date: string;
  groupKey?: string;
  groupName?: string;
  sessionDisplayName?: string;
  hasPrivacyConsent?: boolean;
}

export interface FYStatsResponse {
  activeGroups: number;
  sessions: number;
  hours: number;
  volunteers: number;
  // v2 field name (v1 compat: old name kept alongside until public/ is deleted)
  profiles?: number;
  financialYear: string;
  label: string;
  /** Hours from fully-completed months only (excludes current partial month) */
  completedHours?: number;
  /** Predicted full-year total: completedHours + prev year's remaining months */
  predictedHours?: number;
}

export interface StatsResponse {
  thisFY: FYStatsResponse;
  lastFY: FYStatsResponse;
}

export type StatsHistoryResponse = FYStatsResponse[];

export interface RecentSignupResponse {
  id: number;
  volunteerName: string;
  volunteerSlug: string;
  // v2 field names (v1 compat: old names kept alongside until public/ is deleted)
  profileName?: string;
  profileSlug?: string;
  date: string;
  groupKey: string;
  groupName: string;
  notes?: string;
  checkedIn: boolean;
}

export interface TagHoursItem {
  label: string;      // full colon-path e.g. "DH:Corkscrew:Top"
  hours: number;      // aggregated hours (includes all descendant tags)
  depth: number;      // 0 = root, 1 = first child, etc.
  termGuid?: string;  // SharePoint Term Store GUID (used for sessions page ?tag= filter)
}

export type TagHoursResponse = TagHoursItem[];

export interface EntryUploadContextResponse {
  entryId: number;
  sessionId: number;
  sessionName: string;
  date: string;        // YYYY-MM-DD
  groupKey: string;
  groupName: string;
  profileName: string;
}
