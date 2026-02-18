/**
 * SharePoint Entity Type Definitions
 *
 * These types represent the raw data structures returned by SharePoint REST API.
 * They include both the conventions (Title vs Name) and lookup field patterns.
 */

// ============================================================================
// Base SharePoint Item (common to all lists)
// ============================================================================

export interface SharePointBaseItem {
  ID: number;
  Created: string;
  Modified: string;
  // Author and Editor are Person/Group fields - SharePoint returns complex objects
  // but we typically only need the display name
}

// ============================================================================
// Profiles (Volunteers) List
// ============================================================================

/**
 * Raw Profile entity from SharePoint
 * GUID: f3d3c40c-35cb-4167-8c83-c566edef6f29
 */
export interface SharePointProfile extends SharePointBaseItem {
  /** Volunteer name */
  Title?: string;
  Email?: string;
  /** Name matching for Eventbrite integration */
  MatchName?: string;
  /** DTV Entra ID username (e.g. andrew.davies@dtv.org.uk) */
  User?: string;
  /** Flag indicating if this is a group profile */
  IsGroup?: boolean;
}

/**
 * Profile entity for UI display
 */
export interface Profile {
  id: number;
  name?: string;
  email?: string;
  matchName?: string;
  user?: string;
  isGroup: boolean;
  created: Date;
  modified: Date;
}

// ============================================================================
// Entries (Registrations) List
// ============================================================================

/**
 * Raw Entry entity from SharePoint
 * Some field names use bracket access via constants from services/field-names.ts
 */
export interface SharePointEntry extends SharePointBaseItem {
  Title?: string;
  Count?: number;
  Checked?: boolean;
  Hours?: number;
  Notes?: string;
  /** Allow bracket access for dynamic field names (SessionLookupId, ProfileLookupId, etc.) */
  [key: string]: any;
}

/**
 * Entry entity for UI display
 */
export interface Entry {
  id: number;
  sessionId: number;
  sessionName?: string;
  volunteerId: number;
  volunteerName?: string;
  count: number;
  checkedIn: boolean;
  hours: number;
  notes?: string;
  created: Date;
  modified: Date;
}

// ============================================================================
// Regulars List
// ============================================================================

/**
 * Raw Regular entity from SharePoint
 * Some field names use bracket access via constants from services/field-names.ts
 */
export interface SharePointRegular extends SharePointBaseItem {
  Title?: string;
  /** Allow bracket access for dynamic field names (ProfileLookupId, GroupLookupId, etc.) */
  [key: string]: any;
}

/**
 * Regular entity for UI display
 */
export interface Regular {
  id: number;
  volunteerId: number;
  volunteerName?: string;
  groupId: number;
  groupName?: string;
  email?: string;
  hoursLastFY?: number;
  hoursThisFY?: number;
  created: Date;
  modified: Date;
}

// ============================================================================
// Records List
// ============================================================================

/**
 * Raw Record entity from SharePoint
 * Tracks consents, benefits, and governance items per profile.
 * Type is a choice field (extensible via Graph API).
 */
export interface SharePointRecord extends SharePointBaseItem {
  Title?: string;
  ProfileLookupId?: number;
  Profile?: string;
  Type?: string;
  Status?: string;
  Date?: string;
}

/**
 * Record entity for UI display
 */
export interface ConsentRecord {
  id: number;
  profileId: number;
  profileName?: string;
  type: string;
  status: string;
  date: string;
  created: Date;
  modified: Date;
}

// ============================================================================
// Lookup Maps (for efficient data enrichment)
// ============================================================================

/**
 * Type-safe lookup map for enriching sessions with group names
 * Key: Group ID as string (to match SharePoint lookup IDs)
 * Value: Group display name
 */
export type GroupLookupMap = Map<string, string>;

/**
 * Type-safe lookup map for any entity lookup
 */
export type LookupMap<T> = Map<string, T>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * SharePoint OData response wrapper
 */
export interface SharePointListResponse<T> {
  '@odata.context': string;
  '@odata.nextLink'?: string;
  value: T[];
}

/**
 * API response format used by this application
 */
export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data?: T;
  error?: string;
  message?: string;
}
