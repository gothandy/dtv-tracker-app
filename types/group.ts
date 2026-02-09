/**
 * Group (Crew) Entity Types
 *
 * Groups represent volunteer crews/teams.
 * SharePoint List GUID: 68f9eb4a-1eea-4c1f-88e5-9211cf56e002
 */

/**
 * Base SharePoint item metadata (common to all lists)
 */
export interface SharePointBaseItem {
  ID: number;
  Created: string;  // ISO date string
  Modified: string; // ISO date string
}

/**
 * Raw Group entity as returned by SharePoint REST API
 */
export interface SharePointGroup extends SharePointBaseItem {
  /** Lookup key name - used in dropdowns and relationships (e.g., "Sat") */
  Title: string;
  /** Full display name (e.g., "Saturday Dig") */
  Name?: string;
  /** Group description */
  Description?: string;
  /** Eventbrite Series identifier */
  EventbriteSeriesID?: string;
}

/**
 * Clean Group domain type for use in application
 *
 * Transformations from SharePoint:
 * - ID → sharePointId (clarity)
 * - Title → lookupKeyName (lookup key used in relationships)
 * - Name → displayName (UI display name)
 * - EventbriteSeriesID → eventbriteSeriesId (camelCase)
 * - Created/Modified hidden (not needed at application layer yet)
 */
export interface Group {
  sharePointId: number;
  /** Lookup key used in relationships and dropdowns (from SharePoint Title) */
  lookupKeyName: string;
  /** Full display name for UI (from SharePoint Name) */
  displayName?: string;
  description?: string;
  eventbriteSeriesId?: string;
}
