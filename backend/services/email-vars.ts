import { SharePointEntry, SharePointProfile } from '../../types/sharepoint';
import { SharePointSession } from '../../types/session';
import { SharePointGroup } from '../../types/group';
import { extractMetadataTags, safeParseLookupId, sessionScheduleFields, formatSessionTimeRangeProse, parseEmails } from './data-layer';
import type { SharePointRecord } from '../../types/sharepoint';
import {
  SESSION_NOTES, SESSION_METADATA, PROFILE_DISPLAY, ENTRY_CANCELLED,
} from './field-names';

// ============================================================================
// Shared helpers
// ============================================================================

function formatDate(dateParam: string) {
  const d = new Date(dateParam + 'T12:00:00');
  return {
    formattedDateShort: `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'long' })}`,
    formattedDateLong: `${d.toLocaleDateString('en-GB', { weekday: 'long' })}, ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'long' })} ${d.getFullYear()}`,
  };
}

// Mirrors SessionTermList's expandedPills logic: splits colon-separated tag paths into
// individual ancestor labels, deduplicates by path key, sorts parents before children.
// e.g. ["XC:Freeminers:Boneyard", "XC:Verderers"] → "#XC #Freeminers #Verderers #Boneyard"
// Duplicate of frontend logic — see issue #192.
function expandTagLabels(labels: string[]): string {
  const byPath = new Map<string, { shortLabel: string; depth: number }>();
  for (const label of labels) {
    const parts = label.split(':');
    for (let d = 0; d < parts.length; d++) {
      const pathKey = parts.slice(0, d + 1).join(':');
      if (!byPath.has(pathKey)) {
        byPath.set(pathKey, { shortLabel: parts[d], depth: d });
      }
    }
  }
  return [...byPath.values()]
    .sort((a, b) => a.depth - b.depth)
    .map(p => `#${p.shortLabel}`)
    .join(' ');
}

function findChildEntries(sessionEntries: SharePointEntry[], profileId: number | undefined) {
  const active = sessionEntries.filter(e => !e[ENTRY_CANCELLED]);
  return profileId !== undefined
    ? active.filter(e => safeParseLookupId(e.AccompanyingAdultLookupId) === profileId)
    : [];
}

const CHARITY_MEMBERSHIP_TYPE = 'Charity Membership';

/** True when the profile has an Accepted Charity Membership record. */
export function profileIsMember(profileRecords: SharePointRecord[]): boolean {
  return profileRecords.some(r => r.Type === CHARITY_MEMBERSHIP_TYPE && r.Status === 'Accepted');
}

// ============================================================================
// Session context: every variable a Session template can use
// ============================================================================

export interface SessionTemplateVars extends Record<string, unknown> {
  baseUrl: string;
  volunteerName: string;
  groupName: string;
  sessionTitle: string | null;
  formattedDateShort: string;
  formattedDateLong: string;
  formattedTime: string;
  description: string;
  sessionUrl: string;
  loginUrl: string;
  myChildNames: string | null;
  isRegular: boolean;
  isMember: boolean;
  tags: string | null;
}

export function buildSessionTemplateVars(
  entry: SharePointEntry,
  session: SharePointSession,
  profile: SharePointProfile,
  group: SharePointGroup,
  sessionEntries: SharePointEntry[],
  baseUrl: string,
  profileRecords: SharePointRecord[] = [],
): SessionTemplateVars {
  const profileId = entry.ProfileLookupId as number | undefined;
  const groupName = group.Name || group.Title || '';
  const groupKey = (group.Title || '').toLowerCase();
  const dateParam = session.Date;
  const { formattedDateShort, formattedDateLong } = formatDate(dateParam);
  const { time, length } = sessionScheduleFields(session);
  const formattedTime = formatSessionTimeRangeProse(time, length);

  const myChildEntries = findChildEntries(sessionEntries, profileId);
  const myChildNames = myChildEntries
    .map(e => String(e[PROFILE_DISPLAY] || '').trim())
    .filter(Boolean)
    .join(' and ');

  const rawTags = extractMetadataTags(session[SESSION_METADATA]);
  const tags = rawTags.length > 0 ? expandTagLabels(rawTags.map(t => t.label)) : null;

  return {
    baseUrl,
    volunteerName: String(entry[PROFILE_DISPLAY] || '').trim(),
    groupName,
    sessionTitle: session.Name || null,
    formattedDateShort,
    formattedDateLong,
    formattedTime,
    description: (session[SESSION_NOTES] as string | undefined) || '',
    sessionUrl: `${baseUrl}/sessions/${groupKey}/${dateParam}`,
    loginUrl: `${baseUrl}/login?returnTo=${encodeURIComponent(`/sessions/${groupKey}/${dateParam}`)}`,
    myChildNames: myChildNames || null,
    isRegular: /#Regular\b/i.test(String(entry.Notes || '')),
    isMember: profileIsMember(profileRecords),
    tags,
  };
}

// ============================================================================
// Profile context
// ============================================================================

export interface ProfileEmailVars extends Record<string, unknown> {
  baseUrl: string;
  name: string;
  email: string;
  loginUrl: string;
  charityMembershipDate?: string | null;
}

function formatRecordDate(dateParam: string): string {
  const d = new Date(dateParam);
  if (isNaN(d.getTime())) return dateParam;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function buildProfileLoginUrl(baseUrl: string, email: string): string {
  return `${baseUrl}/login?email=${encodeURIComponent(email)}`;
}

function charityMembershipRecord(records: SharePointRecord[]): SharePointRecord | undefined {
  const matching = records.filter(r => r.Type === CHARITY_MEMBERSHIP_TYPE);
  return matching.find(r => r.Status === 'Accepted') ?? matching[0];
}

export function buildProfileTemplateVars(
  profile: SharePointProfile,
  baseUrl: string,
  profileRecords: SharePointRecord[],
): ProfileEmailVars {
  const name = String(profile.Title || '').trim();
  const email = parseEmails(profile.Email)[0] || '';
  const loginUrl = buildProfileLoginUrl(baseUrl, email);

  const record = charityMembershipRecord(profileRecords);
  const charityMembershipDate = record?.Date ? formatRecordDate(record.Date) : null;

  return { baseUrl, name, email, loginUrl, charityMembershipDate };
}
