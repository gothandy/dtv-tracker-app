/**
 * Data Access Layer for SharePoint
 *
 * This layer abstracts SharePoint's quirks and provides a clean, typed API:
 * - Handles Title vs Name conventions
 * - Converts lookup IDs to proper types
 * - Enriches data with related entities
 * - Provides validation
 */

import { SharePointGroup, Group } from '../../types/group';
import { SharePointProject, Project } from '../../types/project';
import { SharePointSession, Session } from '../../types/session';
import {
  SharePointProfile,
  SharePointEntry,
  SharePointRegular,
  SharePointRecord,
  Profile,
  Entry,
  GroupLookupMap,
  LookupMap
} from '../../types/sharepoint';
import {
  GROUP_LOOKUP, GROUP_DISPLAY,
  SESSION_LOOKUP, SESSION_DISPLAY,
  PROFILE_LOOKUP, PROFILE_DISPLAY,
  SESSION_NOTES, SESSION_LIMITS, SESSION_TIME, SESSION_LENGTH,
} from './field-names';
import type { SessionStats } from '../../types/api-responses';

/** Parses the session Stats JSON field into a typed SessionStats object. */
export function parseSessionStats(raw: string | undefined | null): SessionStats {
  try {
    const p = JSON.parse(raw || '{}');
    return {
      count: p.count || 0,
      hours: p.hours || 0,
      new: p.new || undefined,
      child: p.child || undefined,
      regular: p.regular || undefined,
      cancelledRegular: p.cancelledRegular || undefined,
      eventbrite: p.eventbrite || undefined,
      media: p.media || undefined,
    };
  } catch {
    return { count: 0, hours: 0 };
  }
}

// ============================================================================
// Session Limits
// ============================================================================

export interface SessionLimits {
  new?: number;
  repeat?: number;
  total?: number;
  child?: number;
}

/** Parse the Limits JSON field from a SharePoint session. Returns only numeric fields that are present. */
export function parseSessionLimits(spSession: SharePointSession): SessionLimits {
  try {
    const raw = JSON.parse(spSession[SESSION_LIMITS] || '{}');
    const result: SessionLimits = {};
    if (typeof raw.new    === 'number') result.new    = raw.new;
    if (typeof raw.repeat === 'number') result.repeat = raw.repeat;
    if (typeof raw.total  === 'number') result.total  = raw.total;
    if (typeof raw.child  === 'number') result.child  = raw.child;
    return result;
  } catch {
    return {};
  }
}

/** Normalises SharePoint Time (HH:MM, 24-hour) for API responses. */
export function parseSessionTime(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Normalises SharePoint Length (hours) for API responses. */
export function parseSessionLength(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

export const DEFAULT_SESSION_TIME = '09:30';
export const DEFAULT_SESSION_LENGTH = 3;

/** Schedule fields for session detail API — SharePoint values with DTV defaults when unset. */
export function sessionScheduleFields(spSession: SharePointSession): { time: string; length: number } {
  return {
    time: parseSessionTime(spSession[SESSION_TIME]) ?? DEFAULT_SESSION_TIME,
    length: parseSessionLength(spSession[SESSION_LENGTH]) ?? DEFAULT_SESSION_LENGTH,
  };
}

function sessionTimeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatSessionMinutesAsTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function formatSessionLengthProse(hours: number): string {
  const value = Number.isInteger(hours) ? String(hours) : String(hours);
  const unit = hours === 1 ? 'hour' : 'hours';
  return `about ${value} ${unit}`;
}

/** Prose time range for emails, e.g. "9:30 to 12:30 (about 3 hours)". */
export function formatSessionTimeRangeProse(time: string, lengthHours: number): string {
  const startMinutes = sessionTimeToMinutes(time);
  if (startMinutes === null) return formatSessionLengthProse(lengthHours);
  const endMinutes = startMinutes + lengthHours * 60;
  return `${formatSessionMinutesAsTime(startMinutes)} to ${formatSessionMinutesAsTime(endMinutes)} (${formatSessionLengthProse(lengthHours)})`;
}

/**
 * Derive a missing limit from the other two: total - new - regulars = repeat, total - repeat - regulars = new.
 * Only fills in if exactly the target field is missing and the other two are present.
 * cancelledRegular reduces the effective regulars count (regulars who freed their slot by cancelling).
 */
export function deriveLimits(limits: SessionLimits, regularsCount?: number, cancelledRegular = 0): SessionLimits {
  const effectiveRegulars = regularsCount !== undefined ? Math.max(0, regularsCount - cancelledRegular) : undefined;
  const { total, new: n, repeat } = limits;
  if (total === undefined && n !== undefined && repeat !== undefined && effectiveRegulars !== undefined)
    return { ...limits, total: n + repeat + effectiveRegulars };
  if (repeat === undefined && total !== undefined && n !== undefined && effectiveRegulars !== undefined)
    return { ...limits, repeat: Math.max(0, total - n - effectiveRegulars) };
  if (n === undefined && total !== undefined && repeat !== undefined && effectiveRegulars !== undefined)
    return { ...limits, new: Math.max(0, total - repeat - effectiveRegulars) };
  return limits;
}

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

export function convertProject(spProject: SharePointProject): Project {
  return {
    sharePointId: spProject.ID,
    lookupKeyName: spProject.Title,
    displayName: spProject.Name,
    description: spProject.Description,
  };
}

/**
 * Converts SharePoint Session to clean domain type
 * Note: Does NOT include enriched fields (groupName, registrations, hours, newCount, childCount, regularCount)
 * Use enrichSessions() to add those
 */
export function convertSession(spSession: SharePointSession): Omit<Session, 'registrations' | 'hours' | 'newCount' | 'childCount' | 'regularCount' | 'eventbriteCount' | 'groupName'> {
  const sessionDate = new Date(spSession.Date);
  return {
    sharePointId: spSession.ID,
    lookupKeyName: spSession.Title,
    displayName: spSession.Name,
    description: spSession[SESSION_NOTES],
    sessionDate: sessionDate,
    groupId: safeParseLookupId(spSession[GROUP_LOOKUP]),
    financialYear: calculateFinancialYear(sessionDate),
    eventbriteEventId: spSession.EventbriteEventID,
    limits: parseSessionLimits(spSession),
  };
}

/**
 * Parses a comma-separated email string into a trimmed, lowercased array.
 * First entry is the primary email (used for display and future automated sends).
 * All entries are used for OAuth login matching and Eventbrite sync.
 */
export function parseEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * Converts SharePoint Profile to clean domain type
 */
export function convertProfile(spProfile: SharePointProfile): Profile {
  const emails = parseEmails(spProfile.Email);
  return {
    id: spProfile.ID,
    name: spProfile.Title,
    email: emails[0],
    emails,
    matchName: spProfile.MatchName,
    user: spProfile.User,
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

/** Aggregate counts computed from entries — internal to calculateSessionStats */
interface EntryAggregateStats {
  /** Sum of entry headcounts (SharePoint `Count`, default 1) — not number of rows */
  registrations: number;
  hours: number;
  newCount: number;
  childCount: number;
  regularCount: number;
  eventbriteCount: number;
}

function entryHeadcount(entry: SharePointEntry): number {
  const c = entry.Count;
  if (typeof c === 'number' && Number.isFinite(c) && c >= 1) return Math.floor(c);
  return 1;
}

/**
 * Calculates statistics for sessions based on entries.
 * Registration and category counts use each entry's headcount (`Count`, default 1), not row count.
 * profileFirstSessionMap: profileId → first sessionId (from profile.stats.sessionIds[0]) — used for new count.
 * Returns a map of sessionId (as string) -> stats
 */
export function calculateSessionStats(
  entries: SharePointEntry[],
  profileFirstSessionMap: Map<number, number> = new Map()
): Map<string, EntryAggregateStats> {
  const statsMap = new Map<string, EntryAggregateStats>();

  entries.forEach(entry => {
    if (entry.Cancelled) return;
    const sessionId = entry[SESSION_LOOKUP];
    if (!sessionId) return;

    if (!statsMap.has(sessionId)) {
      statsMap.set(sessionId, {
        registrations: 0,
        hours: 0,
        newCount: 0,
        childCount: 0,
        regularCount: 0,
        eventbriteCount: 0
      });
    }

    const stats = statsMap.get(sessionId)!;
    const headcount = entryHeadcount(entry);
    stats.registrations += headcount;
    stats.hours += parseFloat(String(entry.Hours)) || 0;

    const profileId = safeParseLookupId(entry[PROFILE_LOOKUP]);
    const sessionIdNum = safeParseLookupId(sessionId);

    if (profileId !== undefined && sessionIdNum !== undefined && profileFirstSessionMap.get(profileId) === sessionIdNum && !entry.Labels?.includes('Regular'))
      stats.newCount += headcount;
    if (entry.AccompanyingAdultLookupId)
      stats.childCount += headcount;
    if (entry.Labels?.includes('Regular'))
      stats.regularCount += headcount;
    if (entry.EventbriteAttendeeID)
      stats.eventbriteCount += headcount;
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
  const groupMap = buildGroupLookupMap(spGroups);
  const statsMap = calculateSessionStats(spEntries);

  return spSessions.map(spSession => {
    const baseSession = convertSession(spSession);
    const sessionId = String(spSession.ID);
    const stats = statsMap.get(sessionId);

    const session: Session = {
      ...baseSession,
      registrations: stats?.registrations || 0,
      hours: stats ? Math.round(stats.hours * 10) / 10 : 0,
      newCount: stats?.newCount || 0,
      childCount: stats?.childCount || 0,
      regularCount: stats?.regularCount || 0,
      eventbriteCount: stats?.eventbriteCount || 0,
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

export function validateProject(project: any): project is SharePointProject {
  return (
    typeof project === 'object' &&
    typeof project.ID === 'number' &&
    typeof project.Title === 'string' &&
    typeof project.Created === 'string' &&
    typeof project.Modified === 'string'
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

/** Returns the inclusive YYYY-MM-DD date range for the rolling 12-month window ending today. */
export function calculateRollingYear(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(end.getFullYear() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
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
    if (entry.Cancelled) return false; // cancelled bookings excluded from all stats
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
    const profileId = safeParseLookupId(regular[PROFILE_LOOKUP]);

    const entry = { name: regular[PROFILE_DISPLAY], slug: profileId !== undefined ? profileSlug(regular[PROFILE_DISPLAY], profileId) : nameToSlug(regular[PROFILE_DISPLAY]) };
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
 * Builds a profile URL slug that includes the SharePoint ID to avoid
 * collisions when two profiles share the same name.
 * "Gary Downs", 42 -> "gary-downs-42"
 */
export function profileSlug(name: string | undefined, id: number): string {
  return `${nameToSlug(name)}-${id}`;
}

/**
 * Extracts the SharePoint ID embedded at the end of a profile slug.
 * "gary-downs-42" -> 42, returns undefined if not found.
 */
export function profileIdFromSlug(slug: string): number | undefined {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Normalises a name for Eventbrite matching. Decomposes accented characters
 * via NFD and strips diacritics so "René" matches "Rene". Hyphens are preserved
 * so stored MatchNames like "smith-jones" continue to match. All other
 * non-letter/non-digit/non-hyphen characters (apostrophes, spaces, dots, etc.)
 * are collapsed to a single space.
 */
export function toMatchName(name: string | undefined): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim();
}

/**
 * Safely converts a lookup ID to a number
 * Returns undefined if the ID is invalid
 */
export function safeParseLookupId(lookupId: string | number | undefined): number | undefined {
  if (lookupId === undefined || lookupId === null) return undefined;
  const parsed = parseInt(String(lookupId), 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Safely parses an Hours value from SharePoint (may be string or number)
 */
export function parseHours(value: any): number {
  return parseFloat(String(value)) || 0;
}

/** App taxonomy paths use `:`; SharePoint labels often use `>` or `/` (e.g. DH > Corkscrew). */
export function normalizeTaxonomyPath(label: string): string {
  return label
    .replace(/\s*>\s*/g, ':')
    .replace(/\//g, ':')
    .replace(/:+/g, ':')
    .replace(/^:|:$/g, '')
    .trim();
}

function metadataTag(label: string, termGuid: string): { label: string; termGuid: string } {
  return { label: normalizeTaxonomyPath(label), termGuid: termGuid || '' };
}

// Normalise SharePoint Managed Metadata field values to {label, termGuid}[] objects.
// Handles single-value objects, multi-value arrays, and plain text strings.
export function extractMetadataTags(raw: any): { label: string; termGuid: string }[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    return raw.split(',').map((s: string) => s.trim()).filter(Boolean).map(s => metadataTag(s, ''));
  }
  if (Array.isArray(raw)) {
    return raw
      .map((t: any) => metadataTag(t.Label || t.label || String(t), t.TermGuid || t.termGuid || ''))
      .filter(t => t.label);
  }
  if (typeof raw === 'object') {
    const label = raw.Label || raw.label;
    const termGuid = raw.TermGuid || raw.termGuid || '';
    return label ? [metadataTag(label, termGuid)] : [];
  }
  return [];
}

// ============================================================================
// Route Helpers — shared lookup logic used by multiple route files
// ============================================================================

/**
 * Finds a group by its lowercase key (Title).
 * Returns the raw SharePoint group or undefined.
 */
/** Another list item with the same Title key (case-insensitive), optionally excluding one ID (for renames). */
export function findTitleKeyClash<T extends { ID: number; Title?: string }>(
  items: T[],
  key: string,
  excludeId?: number,
): T | undefined {
  const keyNorm = key.trim().toLowerCase();
  return items.find(
    item => item.ID !== excludeId && (item.Title || '').toLowerCase() === keyNorm,
  );
}

export function findGroupByKey(groups: SharePointGroup[], key: string): SharePointGroup | undefined {
  const validated = validateArray(groups, validateGroup, 'Group');
  return validated.find(g => (g.Title || '').toLowerCase() === key);
}

export function findProjectByKey(projects: SharePointProject[], key: string): SharePointProject | undefined {
  const validated = validateArray(projects, validateProject, 'Project');
  return validated.find(p => (p.Title || '').toLowerCase() === key);
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
    return s.Date === date;
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
