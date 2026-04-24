import { SharePointEntry, SharePointProfile } from '../../types/sharepoint';
import { SharePointSession } from '../../types/session';
import { SharePointGroup } from '../../types/group';
import { extractMetadataTags, safeParseLookupId, parseHours } from './data-layer';
import {
  SESSION_NOTES, SESSION_METADATA, SESSION_STATS, SESSION_COVER_MEDIA,
  GROUP_LOOKUP, PROFILE_DISPLAY, ENTRY_CANCELLED,
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

// ============================================================================
// Pre-session
// ============================================================================

export interface PreSessionVars extends Record<string, unknown> {
  baseUrl: string;
  volunteerName: string;
  groupName: string;
  sessionTitle: string | null;
  formattedDateShort: string;
  formattedDateLong: string;
  description: string;
  sessionUrl: string;
  loginUrl: string;
  myChildNames: string | null;
  isRegular: boolean;
  tags: string | null;
}

export function buildPreSessionVars(
  entry: SharePointEntry,
  session: SharePointSession,
  profile: SharePointProfile,
  group: SharePointGroup,
  sessionEntries: SharePointEntry[],
  baseUrl: string
): PreSessionVars {
  const profileId = entry.ProfileLookupId as number | undefined;
  const groupName = group.Name || group.Title || '';
  const groupKey = (group.Title || '').toLowerCase();
  const dateParam = session.Date;
  const { formattedDateShort, formattedDateLong } = formatDate(dateParam);

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
    description: (session[SESSION_NOTES] as string | undefined) || '',
    sessionUrl: `${baseUrl}/sessions/${groupKey}/${dateParam}`,
    loginUrl: `${baseUrl}/login?returnTo=${encodeURIComponent(`/sessions/${groupKey}/${dateParam}`)}`,
    myChildNames: myChildNames || null,
    isRegular: /#Regular\b/i.test(String(entry.Notes || '')),
    tags,
  };
}

// ============================================================================
// Post-session
// ============================================================================

interface SessionStats {
  count: number;
  hours: number;
  new: number;
  child: number;
  regular: number;
}

export interface PostSessionVars extends Record<string, unknown> {
  baseUrl: string;
  volunteerName: string;
  groupName: string;
  groupUrl: string;
  sessionUrl: string;
  sessionTitle: string | null;
  formattedDateShort: string;
  formattedDateLong: string;
  description: string;
  coverPhotoUrl: string | null;
  userHours: number | null;
  myChildNames: string | null;
  myChildHours: number | null;
  isRegular: boolean;
  stats: SessionStats | null;
  nextSessionUrl: string | null;
  nextSessionDate: string | null;
  uploadUrl: string;
  loginUrl: string;
}

export function buildPostSessionVars(
  entry: SharePointEntry,
  session: SharePointSession,
  profile: SharePointProfile,
  group: SharePointGroup,
  sessionEntries: SharePointEntry[],
  allSessions: SharePointSession[],
  baseUrl: string
): PostSessionVars {
  const profileId = entry.ProfileLookupId as number | undefined;
  const groupName = group.Name || group.Title || '';
  const groupKey = (group.Title || '').toLowerCase();
  const dateParam = session.Date;
  const { formattedDateShort, formattedDateLong } = formatDate(dateParam);

  const myChildEntries = findChildEntries(sessionEntries, profileId);
  const myChildNames = myChildEntries
    .map(e => String(e[PROFILE_DISPLAY] || '').trim())
    .filter(Boolean)
    .join(' and ');
  const myChildHours = myChildEntries.reduce((sum, e) => sum + (parseHours(e.Hours) ?? 0), 0);

  const nextSp = allSessions
    .filter(s => safeParseLookupId(s[GROUP_LOOKUP] as string) === group.ID && s.Date > dateParam)
    .sort((a, b) => a.Date.localeCompare(b.Date))[0];
  const nextSessionUrl = nextSp
    ? `${baseUrl}/sessions/${groupKey}/${nextSp.Date}`
    : null;
  const nextSessionDate = nextSp ? formatDate(nextSp.Date).formattedDateLong : null;

  let stats: SessionStats | null = null;
  try {
    const raw = JSON.parse(String(session[SESSION_STATS] || '{}'));
    if (raw.count !== undefined) stats = raw as SessionStats;
  } catch { /* stats unavailable */ }

  const coverMediaId = session[SESSION_COVER_MEDIA] as number | undefined;
  const coverPhotoUrl = coverMediaId ? `${baseUrl}/media/${groupKey}/${dateParam}/${coverMediaId}` : null;

  return {
    baseUrl,
    volunteerName: String(entry[PROFILE_DISPLAY] || '').trim(),
    groupName,
    groupUrl: `${baseUrl}/groups/${groupKey}`,
    sessionUrl: `${baseUrl}/sessions/${groupKey}/${dateParam}`,
    sessionTitle: session.Name || null,
    formattedDateShort,
    formattedDateLong,
    description: (session[SESSION_NOTES] as string | undefined) || '',
    coverPhotoUrl,
    userHours: parseHours(entry.Hours) ?? null,
    myChildNames: myChildNames || null,
    myChildHours: myChildHours > 0 ? myChildHours : null,
    isRegular: /#Regular\b/i.test(String(entry.Notes || '')),
    stats,
    nextSessionUrl,
    nextSessionDate,
    uploadUrl: `${baseUrl}/upload?entryId=${entry.ID}`,
    loginUrl: `${baseUrl}/login?returnTo=${encodeURIComponent(`/sessions/${groupKey}/${dateParam}`)}`,
  };
}
