/**
 * Session (Event) Entity Types
 *
 * Sessions represent volunteer events/sessions.
 * SharePoint List GUID: 857fc298-6eba-49ab-99bf-9712ef6b8448
 */

import { SharePointBaseItem } from './group';

/**
 * Raw Session entity as returned by SharePoint REST API
 */
export interface SharePointSession extends SharePointBaseItem {
  /** Session title - used for lookups (e.g., "2026-02-17 Sat") */
  Title?: string;
  /** Event name - better for UI display */
  Name?: string;
  /** Planning notes, work done, actions */
  Description?: string;
  /** Event date (ISO string from SharePoint) */
  Date: string;
  /** Lookup to Groups list - display value */
  Crew?: string;
  /** Lookup to Groups list - ID value (comes as string from SharePoint) */
  CrewLookupId?: string;
  /** Registration count (stored on session, but calculated from Entries is more accurate) */
  Registrations?: number;
  /** Total hours (stored on session, but calculated from Entries is more accurate) */
  Hours?: number;
  /** Financial year classification (e.g., "FY2025") - deprecated, calculated instead */
  FinancialYearFlow?: string;
  EventbriteEventID?: string;
  Url?: string;
}

/**
 * Clean Session domain type for use in application
 *
 * Transformations from SharePoint:
 * - ID → sharePointId (clarity)
 * - Title → lookupKeyName (lookup key used in relationships)
 * - Name → displayName (UI display name)
 * - Date → sessionDate (converted to Date object, clarity)
 * - CrewLookupId → groupId (converted to number)
 * - Crew → groupName (enriched from Groups lookup)
 * - Registrations → registrations (calculated from Entries)
 * - Hours → hours (calculated from Entries)
 * - FinancialYearFlow → financialYear (calculated as number from sessionDate)
 * - EventbriteEventID → eventbriteEventId (camelCase)
 * - Url → eventbriteUrl (camelCase)
 * - Created/Modified hidden (not needed at application layer yet)
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
  /** Group/Crew ID (enriched - converted from CrewLookupId) */
  groupId?: number;
  /** Group/Crew display name (enriched from Groups list) */
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
