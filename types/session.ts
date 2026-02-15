/**
 * Session (Event) Entity Types
 *
 * Sessions represent volunteer events/sessions.
 */

import { SharePointBaseItem } from './group';

/**
 * Raw Session entity as returned by SharePoint REST API
 * Some field names use bracket access via constants from services/field-names.ts
 */
export interface SharePointSession extends SharePointBaseItem {
  Title?: string;
  Name?: string;
  Date: string;
  EventbriteEventID?: string;
  /** Allow bracket access for dynamic field names (GroupLookupId, Notes, etc.) */
  [key: string]: any;
}

/**
 * Clean Session domain type for use in application
 *
 * Transformations from SharePoint:
 * - ID → sharePointId
 * - Title → lookupKeyName (lookup key used in relationships)
 * - Name → displayName (UI display name)
 * - Date → sessionDate (converted to Date object)
 * - GroupLookupId → groupId (converted to number)
 * - Group → groupName (enriched from Groups lookup)
 * - registrations (calculated from Entries)
 * - hours (calculated from Entries)
 * - financialYear (calculated from sessionDate)
 * - EventbriteEventID → eventbriteEventId (camelCase)
 */
export interface Session {
  sharePointId: number;
  /** Lookup key used in relationships (from SharePoint Title) */
  lookupKeyName?: string;
  /** Full display name for UI (from SharePoint Name) */
  displayName?: string;
  description?: string;
  /** Event date */
  sessionDate: Date;
  /** Group ID (converted from GroupLookupId) */
  groupId?: number;
  /** Group display name (enriched from Groups list) */
  groupName?: string;
  /** Calculated from Entries list */
  registrations: number;
  /** Calculated from Entries list (rounded to 1 decimal) */
  hours: number;
  /** Financial year as number (e.g., 2025 for FY2025), calculated from sessionDate */
  financialYear: number;
  eventbriteEventId?: string;
  eventbriteUrl?: string;
}
