/**
 * Data Access Layer for SharePoint
 *
 * This layer abstracts SharePoint's quirks and provides a clean, typed API:
 * - Handles Title vs Name conventions
 * - Converts lookup IDs to proper types
 * - Enriches data with related entities
 * - Provides validation
 */

import { SharePointGroup, Group } from '../types/group';
import {
  SharePointSession,
  SharePointProfile,
  SharePointEntry,
  Session,
  Profile,
  Entry,
  GroupLookupMap,
  LookupMap
} from '../types/sharepoint';

// ============================================================================
// Conversion Functions: SharePoint -> Domain Types
// ============================================================================

/**
 * Converts SharePoint Group to clean domain type
 * Maps Title -> LookupKeyName, Name -> DisplayName
 */
export function convertGroup(spGroup: SharePointGroup): Group {
  return {
    ID: spGroup.ID,
    LookupKeyName: spGroup.Title,
    DisplayName: spGroup.Name,
    Description: spGroup.Description,
    EventbriteSeriesID: spGroup.EventbriteSeriesID,
    Created: new Date(spGroup.Created),
    Modified: new Date(spGroup.Modified)
  };
}

/**
 * Converts SharePoint Session to clean domain type
 * Note: Does NOT include enriched fields (groupName, registrations, hours)
 * Use enrichSessions() to add those
 */
export function convertSession(spSession: SharePointSession): Omit<Session, 'registrations' | 'hours' | 'groupName'> {
  return {
    id: spSession.ID,
    displayName: spSession.Name || spSession.Title || 'Untitled Session',
    title: spSession.Title,
    notes: spSession.Description,
    date: new Date(spSession.Date),
    groupId: spSession.CrewLookupId ? parseInt(spSession.CrewLookupId, 10) : undefined,
    financialYear: spSession.FinancialYearFlow,
    eventbriteEventId: spSession.EventbriteEventID,
    eventbriteUrl: spSession.Url,
    created: new Date(spSession.Created),
    modified: new Date(spSession.Modified)
  };
}

/**
 * Converts SharePoint Profile to clean domain type
 */
export function convertProfile(spProfile: SharePointProfile): Profile {
  return {
    id: spProfile.ID,
    name: spProfile.Title || 'Unknown Volunteer',
    email: spProfile.Email,
    matchName: spProfile.MatchName,
    isGroup: spProfile.IsGroup || false,
    hoursLastFY: spProfile.HoursLastFY || 0,
    hoursThisFY: spProfile.HoursThisFY || 0,
    created: new Date(spProfile.Created),
    modified: new Date(spProfile.Modified)
  };
}

/**
 * Converts SharePoint Entry to clean domain type
 */
export function convertEntry(spEntry: SharePointEntry): Entry {
  return {
    id: spEntry.ID,
    sessionId: spEntry.EventLookupId ? parseInt(spEntry.EventLookupId, 10) : 0,
    sessionName: spEntry.Event,
    volunteerId: spEntry.VolunteerLookupId ? parseInt(spEntry.VolunteerLookupId, 10) : 0,
    volunteerName: spEntry.Volunteer,
    count: spEntry.Count || 1,
    checkedIn: spEntry.Checked || false,
    hours: spEntry.Hours || 0,
    notes: spEntry.Notes,
    financialYear: spEntry.FinancialYearFlow,
    created: new Date(spEntry.Created),
    modified: new Date(spEntry.Modified)
  };
}

// ============================================================================
// Lookup Map Builders
// ============================================================================

/**
 * Builds a lookup map from Group ID (as string) to Group display name
 * This handles the type coercion issue: SharePoint returns numeric IDs,
 * but lookup fields come as strings, so we convert to string for consistent lookups
 */
export function buildGroupLookupMap(groups: SharePointGroup[]): GroupLookupMap {
  const map = new Map<string, string>();
  groups.forEach(group => {
    const displayName = group.Name || group.Title;
    map.set(String(group.ID), displayName);
  });
  return map;
}

/**
 * Generic lookup map builder for any entity
 * Key: Entity ID as string (to match SharePoint lookup pattern)
 * Value: Entire entity or specific field
 */
export function buildLookupMap<T, V>(
  entities: T[],
  getKey: (entity: T) => number,
  getValue: (entity: T) => V
): LookupMap<V> {
  const map = new Map<string, V>();
  entities.forEach(entity => {
    const key = String(getKey(entity));
    const value = getValue(entity);
    map.set(key, value);
  });
  return map;
}

// ============================================================================
// Data Enrichment Functions
// ============================================================================

/**
 * Statistics for a session calculated from entries
 */
interface SessionStats {
  registrations: number;
  hours: number;
}

/**
 * Calculates statistics for sessions based on entries
 * Returns a map of sessionId (as string) -> stats
 */
export function calculateSessionStats(entries: SharePointEntry[]): Map<string, SessionStats> {
  const statsMap = new Map<string, SessionStats>();

  entries.forEach(entry => {
    const sessionId = entry.EventLookupId;
    if (!sessionId) return;

    if (!statsMap.has(sessionId)) {
      statsMap.set(sessionId, {
        registrations: 0,
        hours: 0
      });
    }

    const stats = statsMap.get(sessionId)!;
    stats.registrations++;
    stats.hours += parseFloat(String(entry.Hours)) || 0;
  });

  return statsMap;
}

/**
 * Enriches sessions with:
 * - Calculated stats (registrations, hours) from entries
 * - Group display names from groups
 *
 * This is the main function that handles the complex data joining
 */
export function enrichSessions(
  spSessions: SharePointSession[],
  spEntries: SharePointEntry[],
  spGroups: SharePointGroup[]
): Session[] {
  // Build lookup maps
  const groupMap = buildGroupLookupMap(spGroups);
  const statsMap = calculateSessionStats(spEntries);

  // Convert and enrich each session
  return spSessions.map(spSession => {
    const baseSession = convertSession(spSession);
    const sessionId = String(spSession.ID);
    const stats = statsMap.get(sessionId);

    // Build the enriched session
    const session: Session = {
      ...baseSession,
      // Add calculated stats
      registrations: stats?.registrations || 0,
      hours: stats ? Math.round(stats.hours * 10) / 10 : 0, // Round to 1 decimal
      // Add group name (handles the type coercion issue)
      groupName: spSession.CrewLookupId ? groupMap.get(spSession.CrewLookupId) || null : null
    } as Session;

    return session;
  });
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that a SharePoint Group has required fields
 */
export function validateGroup(group: any): group is SharePointGroup {
  return (
    typeof group === 'object' &&
    typeof group.ID === 'number' &&
    typeof group.Title === 'string' &&
    typeof group.Created === 'string' &&
    typeof group.Modified === 'string'
  );
}

/**
 * Validates that a SharePoint Session has required fields
 */
export function validateSession(session: any): session is SharePointSession {
  return (
    typeof session === 'object' &&
    typeof session.ID === 'number' &&
    typeof session.Date === 'string' &&
    typeof session.Created === 'string' &&
    typeof session.Modified === 'string'
  );
}

/**
 * Validates that a SharePoint Entry has required fields
 */
export function validateEntry(entry: any): entry is SharePointEntry {
  return (
    typeof entry === 'object' &&
    typeof entry.ID === 'number' &&
    typeof entry.Created === 'string' &&
    typeof entry.Modified === 'string'
  );
}

/**
 * Validates that a SharePoint Profile has required fields
 */
export function validateProfile(profile: any): profile is SharePointProfile {
  return (
    typeof profile === 'object' &&
    typeof profile.ID === 'number' &&
    typeof profile.Created === 'string' &&
    typeof profile.Modified === 'string'
  );
}

/**
 * Validates an array of entities and logs warnings for invalid items
 */
export function validateArray<T>(
  items: any[],
  validator: (item: any) => item is T,
  entityName: string
): T[] {
  const validItems: T[] = [];
  items.forEach((item, index) => {
    if (validator(item)) {
      validItems.push(item);
    } else {
      console.warn(`[Data Layer] Invalid ${entityName} at index ${index}:`, item);
    }
  });
  return validItems;
}

// ============================================================================
// Data Sorting
// ============================================================================

/**
 * Sorts sessions by date descending (most recent first)
 */
export function sortSessionsByDate(sessions: Session[]): Session[] {
  return sessions.sort((a, b) => {
    return b.date.getTime() - a.date.getTime();
  });
}

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Safely converts a lookup ID to a number
 * Returns undefined if the ID is invalid
 */
export function safeParseLookupId(lookupId: string | undefined): number | undefined {
  if (!lookupId) return undefined;
  const parsed = parseInt(lookupId, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Safely extracts a display name using the Title/Name convention
 * Prefers Name over Title
 */
export function getDisplayName(entity: { Name?: string; Title?: string }, fallback: string = 'Untitled'): string {
  return entity.Name || entity.Title || fallback;
}
