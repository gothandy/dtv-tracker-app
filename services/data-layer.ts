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
import { SharePointSession, Session } from '../types/session';
import {
  SharePointProfile,
  SharePointEntry,
  SharePointRegular,
  SharePointRecord,
  Profile,
  Entry,
  GroupLookupMap,
  LookupMap
} from '../types/sharepoint';
import {
  GROUP_LOOKUP, GROUP_DISPLAY,
  SESSION_LOOKUP, SESSION_DISPLAY,
  PROFILE_LOOKUP, PROFILE_DISPLAY,
  SESSION_NOTES
} from './field-names';

// ============================================================================
// Conversion Functions: SharePoint -> Domain Types
// ============================================================================

/**
 * Calculates financial year from a date
 * Financial year runs April 1 to March 31
 * Returns the year number (e.g., 2025 for FY2025)
 */
export function calculateFinancialYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0=Jan, 3=Apr)
  // If month is Jan-Mar (0-2), FY is previous year
  // If month is Apr-Dec (3-11), FY is current year
  return month >= 3 ? year : year - 1;
}

/**
 * Converts SharePoint Group to clean domain type
 * Maps Title -> lookupKeyName, Name -> displayName
 */
export function convertGroup(spGroup: SharePointGroup): Group {
  return {
    sharePointId: spGroup.ID,
    lookupKeyName: spGroup.Title,
    displayName: spGroup.Name,
    description: spGroup.Description,
    eventbriteSeriesId: spGroup.EventbriteSeriesID
  };
}

/**
 * Converts SharePoint Session to clean domain type
 * Note: Does NOT include enriched fields (groupName, registrations, hours)
 * Use enrichSessions() to add those
 */
export function convertSession(spSession: SharePointSession): Omit<Session, 'registrations' | 'hours' | 'groupName'> {
  const sessionDate = new Date(spSession.Date);
  return {
    sharePointId: spSession.ID,
    lookupKeyName: spSession.Title,
    displayName: spSession.Name,
    description: spSession[SESSION_NOTES],
    sessionDate: sessionDate,
    groupId: safeParseLookupId(spSession[GROUP_LOOKUP]),
    financialYear: calculateFinancialYear(sessionDate),
    eventbriteEventId: spSession.EventbriteEventID
  };
}

/**
 * Converts SharePoint Profile to clean domain type
 */
export function convertProfile(spProfile: SharePointProfile): Profile {
  return {
    id: spProfile.ID,
    name: spProfile.Title,
    email: spProfile.Email,
    matchName: spProfile.MatchName,
    isGroup: spProfile.IsGroup || false,
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
    sessionId: safeParseLookupId(spEntry[SESSION_LOOKUP]) || 0,
    sessionName: spEntry[SESSION_DISPLAY],
    volunteerId: safeParseLookupId(spEntry[PROFILE_LOOKUP]) || 0,
    volunteerName: spEntry[PROFILE_DISPLAY],
    count: spEntry.Count || 1,
    checkedIn: spEntry.Checked || false,
    hours: spEntry.Hours || 0,
    notes: spEntry.Notes,
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
    const sessionId = entry[SESSION_LOOKUP];
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
      groupName: spSession[GROUP_LOOKUP] ? groupMap.get(spSession[GROUP_LOOKUP]) : undefined
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
// FY Aggregation
// ============================================================================

export interface FYStats {
  activeGroups: number;
  sessions: number;
  hours: number;
  volunteers: number;
  financialYear: number;
}

export function calculateCurrentFY(): { startYear: number; endYear: number; key: string } {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { startYear, endYear: startYear + 1, key: `FY${startYear}` };
}

/**
 * Aggregates FY dashboard stats from sessions and entries
 * Filters entries to only those belonging to the given FY sessions,
 * then sums hours and counts active groups
 */
export function calculateFYStats(
  sessionsFY: SharePointSession[],
  allEntries: SharePointEntry[]
): FYStats {
  const fy = calculateCurrentFY();
  const sessionIdsFY = new Set(sessionsFY.map(s => s.ID));

  const entriesFY = allEntries.filter(entry => {
    const sessionId = safeParseLookupId(entry[SESSION_LOOKUP]);
    return sessionId !== undefined && sessionIdsFY.has(sessionId);
  });

  const totalHours = entriesFY.reduce((sum, entry) => {
    return sum + (parseFloat(String(entry.Hours)) || 0);
  }, 0);

  const activeGroupIds = new Set(
    sessionsFY
      .filter(s => s[GROUP_LOOKUP])
      .map(s => safeParseLookupId(s[GROUP_LOOKUP]))
      .filter((id): id is number => id !== undefined)
  );

  const uniqueVolunteers = new Set(
    entriesFY
      .map(e => safeParseLookupId(e[PROFILE_LOOKUP]))
      .filter((id): id is number => id !== undefined)
  );

  console.log(`[Stats] FY sessions: ${sessionsFY.length}, FY entries: ${entriesFY.length}, Hours: ${totalHours}, Volunteers: ${uniqueVolunteers.size}`);

  return {
    activeGroups: activeGroupIds.size,
    sessions: sessionsFY.length,
    hours: Math.round(totalHours * 10) / 10,
    volunteers: uniqueVolunteers.size,
    financialYear: fy.startYear
  };
}

// ============================================================================
// Regulars Grouping
// ============================================================================

export function groupRegularsByCrewId(regulars: SharePointRegular[]): Map<number, { name: string; slug: string }[]> {
  const map = new Map<number, { name: string; slug: string }[]>();
  regulars.forEach(regular => {
    const crewId = safeParseLookupId(regular[GROUP_LOOKUP]);
    if (crewId === undefined || !regular[PROFILE_DISPLAY]) return;

    const entry = { name: regular[PROFILE_DISPLAY], slug: nameToSlug(regular[PROFILE_DISPLAY]) };
    const list = map.get(crewId);
    if (list) {
      list.push(entry);
    } else {
      map.set(crewId, [entry]);
    }
  });
  return map;
}

// ============================================================================
// Data Sorting
// ============================================================================

/**
 * Sorts sessions by date descending (most recent first)
 */
export function sortSessionsByDate(sessions: Session[]): Session[] {
  return sessions.sort((a, b) => {
    return b.sessionDate.getTime() - a.sessionDate.getTime();
  });
}

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Converts a name to a URL-safe slug
 * "Andrew Davies" -> "andrew-davies", "O'Brien" -> "obrien"
 */
export function nameToSlug(name: string | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '') // strip apostrophes and smart quotes
    .replace(/[^a-z0-9]+/g, '-')     // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}

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
 * Safely parses an Hours value from SharePoint (may be string or number)
 */
export function parseHours(value: any): number {
  return parseFloat(String(value)) || 0;
}

// ============================================================================
// Route Helpers — shared lookup logic used by multiple route files
// ============================================================================

/**
 * Finds a group by its lowercase key (Title).
 * Returns the raw SharePoint group or undefined.
 */
export function findGroupByKey(groups: SharePointGroup[], key: string): SharePointGroup | undefined {
  const validated = validateArray(groups, validateGroup, 'Group');
  return validated.find(g => (g.Title || '').toLowerCase() === key);
}

/**
 * Finds a session by group ID and date string (YYYY-MM-DD).
 * Returns the raw SharePoint session or undefined.
 */
export function findSessionByGroupAndDate(
  sessions: SharePointSession[],
  groupId: number,
  date: string
): SharePointSession | undefined {
  const validated = validateArray(sessions, validateSession, 'Session');
  return validated.find(s => {
    if (safeParseLookupId(s[GROUP_LOOKUP]) !== groupId) return false;
    return s.Date.substring(0, 10) === date;
  });
}

/**
 * Builds membership and card status lookups from Records list.
 * Returns a Set of member profile IDs and a Map of profile ID → card status.
 */
export function buildBadgeLookups(records: SharePointRecord[]): {
  memberIds: Set<number>;
  cardStatusMap: Map<number, string>;
} {
  const memberIds = new Set<number>();
  const cardStatusMap = new Map<number, string>();
  for (const r of records) {
    const pid = safeParseLookupId(r.ProfileLookupId as unknown as string);
    if (pid === undefined) continue;
    if (r.Type === 'Charity Membership' && r.Status === 'Accepted') {
      memberIds.add(pid);
    }
    if (r.Type === 'Discount Card' && r.Status) {
      cardStatusMap.set(pid, r.Status);
    }
  }
  return { memberIds, cardStatusMap };
}
