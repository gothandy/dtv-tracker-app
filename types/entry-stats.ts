/**
 * Snapshot of volunteer state captured at session time.
 * Frozen once session.Date < today and field is non-empty.
 *
 * Two sub-objects:
 *   snapshot — computed from profile/records at the time of the session
 *   manual   — operational tags entered on the day (read from Notes, written here)
 *
 * All fields are optional; absent booleans default to false, absent booking defaults to 'Repeat'.
 */

export interface EntryStatsSnapshot {
  /** 'New' = first ever session; 'Regular' = on regulars list; absent = 'Repeat' */
  booking?: 'New' | 'Regular';
  /** Profile is a group/company account */
  isGroup?: boolean;
  /** Child entry (AccompanyingAdult set or #Child in Notes) */
  isChild?: boolean;
  /** Accepted Charity Membership record at session time */
  isMember?: boolean;
  /** Accepted or invited Discount Card record at session time */
  hasDiscountCard?: boolean;
  /** No accepted Photo Consent record at session time */
  noPhoto?: boolean;
  /** No accepted Privacy Consent record at session time */
  noConsent?: boolean;
  /** Valid Dig Lead qualification record at session time */
  isDigLead?: boolean;
  /** Valid (non-expired) First Aid Certificate at session time */
  isFirstAider?: boolean;
}

export interface EntryStatsManual {
  /** #CSR — Corporate Social Responsibility volunteer */
  csr?: boolean;
  /** #Late — arrived late */
  late?: boolean;
  /** #DigLead — actively took on dig lead role that day */
  digLead?: boolean;
  /** #FirstAider — actively took on first aider role that day */
  firstAider?: boolean;
  /** #Eventbrite — booking came via Eventbrite */
  eventbrite?: boolean;
  /** #Duplicate — name clash flagged by Eventbrite sync (same name, different email) */
  duplicate?: boolean;
}

export interface EntryStats {
  snapshot?: EntryStatsSnapshot;
  manual?: EntryStatsManual;
}
