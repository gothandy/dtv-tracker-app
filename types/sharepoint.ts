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
  /** Flag indicating if this is a group profile */
  IsGroup?: boolean;
  HoursLastFY?: number;
  HoursThisFY?: number;
}

/**
 * Profile entity for UI display
 */
export interface Profile {
  id: number;
  name: string;
  email?: string;
  matchName?: string;
  isGroup: boolean;
  hoursLastFY: number;
  hoursThisFY: number;
  created: Date;
  modified: Date;
}

// ============================================================================
// Entries (Registrations) List
// ============================================================================

/**
 * Raw Entry entity from SharePoint
 * GUID: 8a362810-15ea-4210-9ad0-a98196747866
 */
export interface SharePointEntry extends SharePointBaseItem {
  Title?: string;
  /** Lookup to Sessions list - display value */
  Event?: string;
  /** Lookup to Sessions list - ID value (comes as string from SharePoint) */
  EventLookupId?: string;
  /** Lookup to Profiles list - display value */
  Volunteer?: string;
  /** Lookup to Profiles list - ID value (comes as string from SharePoint) */
  VolunteerLookupId?: string;
  /** For group registrations */
  Count?: number;
  /** Check-in status */
  Checked?: boolean;
  /** Hours worked at this session */
  Hours?: number;
  /** Tags: #New #Child #DofE #DigLead #FirstAider #Regular */
  Notes?: string;
  /** Financial year (updated via Power Automate) */
  FinancialYearFlow?: string;
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
  financialYear?: string;
  created: Date;
  modified: Date;
}

// ============================================================================
// Regulars List
// ============================================================================

/**
 * Raw Regular entity from SharePoint
 * GUID: 34b535f1-34ec-4fe6-a887-3b8523e492e1
 */
export interface SharePointRegular extends SharePointBaseItem {
  Title?: string;
  /** Lookup to Profiles list - display value */
  Volunteer?: string;
  /** Lookup to Profiles list - ID value */
  VolunteerLookupId?: string;
  /** Lookup to Groups list - display value */
  Crew?: string;
  /** Lookup to Groups list - ID value */
  CrewLookupId?: string;
  /** Denormalized field from Volunteer profile */
  Volunteer_x003a_Email?: string;
  /** Denormalized field from Volunteer profile */
  Volunteer_x003a_HoursLastFY?: number;
  /** Denormalized field from Volunteer profile */
  Volunteer_x003a_HoursThisFY?: number;
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
