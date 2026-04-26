/**
 * API Response Types
 *
 * These define the HTTP API contract with clean, camelCase field names
 * independent of SharePoint column names and internal domain types.
 */

import type { SessionLimits } from '../backend/services/data-layer';
import type { EntryStats } from './entry-stats';

export interface SessionStats {
  count: number
  hours: number
  new?: number
  child?: number
  regular?: number
  cancelledRegular?: number
  eventbrite?: number
  media?: number
}

export interface GroupRegularResponse {
  profileId: number;
  name: string;
  slug: string;
  hours: number;       // rolling-year hours for this group
  isRegular: boolean;
  regularId?: number;           // present if isRegular is true
  accompanyingAdultId?: number; // present if this regular is a child (profile ID of the adult)
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
  stats: SessionStats;
  regularsCount?: number;
  mediaCount?: number;
  coverUrl?: string;
  financialYear: string;
  isBookable: boolean;
  eventbriteEventId?: string;
  metadata?: Array<{ label: string; termGuid: string }>;
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
  warnings?: Array<{ text: string; url?: string }>;
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
  accompanyingAdultId?: number;
  financialYear: string;
  cancelled?: string;
  stats?: EntryStats;
  eventbriteAttendeeId?: string;
}

export interface ProfileGroupHours {
  groupId: number;
  groupKey: string;
  groupName: string;
  hoursThisFY: number;
  hoursLastFY: number;
  hoursAll: number;
  hoursRolling: number; // rolling year (today − 1 year) hours for this group
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
  isMember?: boolean;
  cardStatus?: string;
  hoursLastFY: number;
  hoursThisFY: number;
  hoursAll: number;
  groupHours: ProfileGroupHours[];
  regularCount: number;
  entries: ProfileEntryResponse[];
  records?: ConsentRecordResponse[];
  linkedProfiles?: Array<{ id: number; slug: string; name: string }>;
  warnings?: Array<{ text: string; url?: string }>;
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
  };
  sessions: SessionResponse[];
}

export interface EntryResponse {
  id: number;
  profileId?: number;
  volunteerName?: string;
  volunteerSlug?: string;
  isGroup: boolean;
  isMember: boolean;
  cardStatus?: string;
  profileWarning?: boolean;
  count: number;
  hours: number;
  checkedIn: boolean;
  notes?: string;
  accompanyingAdultId?: number;
  cancelled?: string;          // ISO datetime if booking was cancelled
  email?: string;              // only present for operational users (admin/check-in)
  stats?: EntryStats;          // snapshot; undefined if not yet computed (pre-migration entries)
  eventbriteAttendeeId?: string; // present when entry originated from Eventbrite
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
  storedLimits: SessionLimits;
  stats: SessionStats;
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
  isRepeat?: boolean;         // has attended this group before (not necessarily a formal Regular)
  userIsNew?: boolean;        // #New tag present on the user's entry for this session
  userEntryId?: number;       // entry ID for this user on this session (when isRegistered or cancelled)
  userProfileId?: number;     // profile ID of the authenticated viewer (needed for self-service Book POST)
}

export interface EntryDetailResponse {
  id: number;
  volunteerName?: string;
  volunteerSlug?: string;
  volunteerEmail?: string;
  volunteerEmails?: string[];
  volunteerEntryCount: number;
  isGroup: boolean;
  hoursLastFY: number;
  hoursThisFY: number;
  count: number;
  hours: number;
  checkedIn: boolean;
  notes?: string;
  accompanyingAdultId?: number;
  date: string;
  groupKey?: string;
  groupName?: string;
  sessionDisplayName?: string;
  hasPrivacyConsent?: boolean;
  stats?: EntryStats; // snapshot; undefined if not yet computed (pre-migration entries)
}

export interface FYStatsResponse {
  activeGroups: number;
  sessions: number;
  hours: number;
  volunteers: number;
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
  volunteerSlug?: string;
  date: string;
  groupKey: string;
  groupName: string;
  notes?: string;
  checkedIn: boolean;
  hours: number;
  count: number;
  isGroup?: boolean;
  isMember?: boolean;
  cardStatus?: string;
  hasProfileWarning?: boolean;
  accompanyingAdultId?: number;
  cancelled?: string;
  stats?: import('./entry-stats').EntryStats;
  eventbriteAttendeeId?: string;
}

export interface EntryListItemResponse {
  id: number;
  profileId?: number;
  volunteerName?: string;
  volunteerSlug?: string;
  date: string;
  groupKey: string;
  groupName: string;
  notes?: string;
  checkedIn: boolean;
  hours: number;
  count: number;
  isGroup: boolean;
  isMember?: boolean;
  cardStatus?: string;
  hasProfileWarning?: boolean;
  hasAccompanyingAdult: boolean;
  accompanyingAdultId?: number;
  cancelled?: string;
  stats?: import('./entry-stats').EntryStats;
  eventbriteAttendeeId?: string;
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
