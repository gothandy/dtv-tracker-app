/**
 * API Response Types
 *
 * These define the HTTP API contract with clean, camelCase field names
 * independent of SharePoint column names and internal domain types.
 */

export interface GroupResponse {
  id: number;
  key: string;
  displayName?: string;
  description?: string;
  eventbriteSeriesId?: string;
  regularsCount: number;
  regulars: string[];
}

export interface SessionResponse {
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
}

export interface ProfileResponse {
  id: number;
  name?: string;
  email?: string;
  isGroup: boolean;
  hoursLastFY: number;
  hoursThisFY: number;
}

export interface GroupDetailResponse {
  id: number;
  key: string;
  displayName?: string;
  description?: string;
  eventbriteSeriesId?: string;
  regulars: string[];
  financialYear: string;
  stats: {
    sessions: number;
    hours: number;
    newVolunteers: number;
    children: number;
    totalVolunteers: number;
  };
  nextSession?: SessionResponse;
  recentSessions: SessionResponse[];
}

export interface StatsResponse {
  activeGroupsFY: number;
  sessionsFY: number;
  hoursFY: number;
  financialYear: string;
}
