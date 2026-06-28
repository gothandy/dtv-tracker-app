import { groupsRepository } from './repositories/groups-repository';
import { sessionsRepository } from './repositories/sessions-repository';
import { projectsRepository } from './repositories/projects-repository';
import {
  findGroupByKey,
  findProjectByKey,
  findSessionByGroupAndDate,
  convertGroup,
  convertProject,
  safeParseLookupId,
} from './data-layer';
import { SESSION_NOTES, SESSION_COVER_MEDIA, GROUP_LOOKUP, PROJECT_LOOKUP } from './field-names';
import { mediaDriveId } from './media-upload';
import { sharePointClient } from './sharepoint-client';
import type { SharePointSession } from '../../types/session';

export const SITE_NAME = 'DTV Tracker';
export const DEFAULT_DESCRIPTION =
  'Volunteer hours tracking and session registration for Dean Trail Volunteers.';

export interface OgMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
}

export function escapeHtmlAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function truncateDescription(text: string, max = 300): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function pageTitle(label: string): string {
  return `${label} | ${SITE_NAME}`;
}

export function buildOgHeadTags(meta: OgMeta, facebookAppId: string): string {
  let tags =
    `<title>${escapeHtmlAttr(meta.title)}</title>` +
    `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}">` +
    `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}">` +
    `<meta property="og:url" content="${meta.canonicalUrl}">` +
    `<meta property="og:image" content="${escapeHtmlAttr(meta.imageUrl)}">` +
    `<meta property="og:type" content="website">` +
    `<meta property="og:site_name" content="${escapeHtmlAttr(SITE_NAME)}">`;
  if (facebookAppId) {
    tags += `<meta property="fb:app_id" content="${escapeHtmlAttr(facebookAppId)}">`;
  }
  return tags;
}

function defaultImageUrl(baseUrl: string): string {
  return `${baseUrl}/img/logo-930.jpg`;
}

function siteDefaultMeta(canonicalUrl: string, baseUrl: string, label?: string): OgMeta {
  return {
    title: label ? pageTitle(label) : SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl,
    imageUrl: defaultImageUrl(baseUrl),
  };
}

export function isSandboxPath(pathname: string): boolean {
  return pathname === '/sandbox' || pathname.startsWith('/sandbox/');
}

/** Routes that should not fetch entity-specific data (auth-gated in the SPA). */
export function isAuthGatedPath(pathname: string): boolean {
  if (pathname.startsWith('/profiles')) return true;
  if (pathname === '/entries' || pathname.startsWith('/entries/')) return true;
  if (pathname === '/tools' || pathname === '/admin') return true;
  if (pathname === '/upload' || pathname.startsWith('/upload')) return true;
  if (/^\/projects\/[^/]+\/upload\/?$/.test(pathname)) return true;
  if (/^\/sessions\/[^/]+\/[^/]+\/add-entry\/?$/.test(pathname)) return true;
  return false;
}

function humanizeSlugSegment(segment: string): string {
  const base = segment.replace(/\.pdf$/i, '').replace(/-/g, ' ');
  return base.replace(/\b\w/g, c => c.toUpperCase());
}

function docsTitle(pathname: string): string {
  const rest = pathname.replace(/^\/docs\/?/, '');
  if (!rest) return pageTitle('Docs');
  const segments = rest.split('/').filter(Boolean);
  const label = segments.map(humanizeSlugSegment).join(' — ');
  return pageTitle(label);
}

function docsDescription(pathname: string): string {
  if (pathname === '/docs' || pathname === '/docs/') {
    return 'Governance and policy documents for Dean Trail Volunteers.';
  }
  return 'DTV governance document.';
}

interface CoverCandidate {
  groupKey: string;
  date: string;
  coverMediaId: number | null;
}

async function resolvePublicCoverUrl(
  baseUrl: string,
  candidates: CoverCandidate[],
): Promise<string> {
  let driveId: string;
  try {
    driveId = mediaDriveId();
  } catch {
    return defaultImageUrl(baseUrl);
  }

  const sorted = [...candidates]
    .filter(c => c.coverMediaId != null)
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const { groupKey, date, coverMediaId } of sorted) {
    if (coverMediaId == null) continue;
    try {
      const photos = await sharePointClient.listFolderPhotos(driveId, `${groupKey}/${date}`);
      const coverPhoto = photos.find(p => p.listItemId === coverMediaId && p.isPublic === true);
      if (coverPhoto) {
        return `${baseUrl}/media/${groupKey}/${date}/${coverPhoto.listItemId}`;
      }
    } catch {
      /* folder missing or drive unavailable — try next session */
    }
  }

  return defaultImageUrl(baseUrl);
}

function sessionCoverCandidates(sessions: SharePointSession[], groupKeyById: Map<number, string>): CoverCandidate[] {
  return sessions
    .filter(s => s.Date)
    .map(s => {
      const groupId = safeParseLookupId(s[GROUP_LOOKUP]);
      const groupKey = groupId !== undefined ? groupKeyById.get(groupId) : undefined;
      if (!groupKey) return null;
      return {
        groupKey,
        date: s.Date!,
        coverMediaId: safeParseLookupId(s[SESSION_COVER_MEDIA] as unknown as string) ?? null,
      };
    })
    .filter((c): c is CoverCandidate => c !== null);
}

function buildGroupKeyMap(rawGroups: Awaited<ReturnType<typeof groupsRepository.getAll>>): Map<number, string> {
  const map = new Map<number, string>();
  for (const g of rawGroups) {
    map.set(g.ID, (g.Title || '').toLowerCase());
  }
  return map;
}

async function resolveSessionOg(
  groupKey: string,
  dateParam: string,
  canonicalUrl: string,
  baseUrl: string,
): Promise<OgMeta> {
  const [rawGroups, rawSessions] = await Promise.all([
    groupsRepository.getAll(),
    sessionsRepository.getAll(),
  ]);
  const spGroup = findGroupByKey(rawGroups, groupKey);
  const spSession = spGroup ? findSessionByGroupAndDate(rawSessions, spGroup.ID, dateParam) : null;

  let imageUrl = defaultImageUrl(baseUrl);
  if (spSession) {
    imageUrl = await resolvePublicCoverUrl(baseUrl, [{
      groupKey,
      date: dateParam,
      coverMediaId: safeParseLookupId(spSession[SESSION_COVER_MEDIA] as unknown as string) ?? null,
    }]);
  }

  if (!spGroup || !spSession) {
    return siteDefaultMeta(canonicalUrl, baseUrl, 'Session');
  }

  const group = convertGroup(spGroup);
  const sessionName = spSession.Name || spSession.Title || group.displayName;
  const formattedDate = new Date(dateParam).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const title = `${sessionName} — ${formattedDate} | ${SITE_NAME}`;
  const description = truncateDescription(
    spSession[SESSION_NOTES] || `${group.displayName} volunteer session on ${formattedDate}`,
  );

  return { title, description, canonicalUrl, imageUrl };
}

async function resolveGroupOg(
  key: string,
  canonicalUrl: string,
  baseUrl: string,
): Promise<OgMeta> {
  const [rawGroups, rawSessions] = await Promise.all([
    groupsRepository.getAll(),
    sessionsRepository.getAll(),
  ]);
  const spGroup = findGroupByKey(rawGroups, key);
  if (!spGroup) return siteDefaultMeta(canonicalUrl, baseUrl, 'Group');

  const group = convertGroup(spGroup);
  const groupKeyMap = buildGroupKeyMap(rawGroups);
  const groupSessions = rawSessions.filter(
    s => s.Date && safeParseLookupId(s[GROUP_LOOKUP]) === spGroup.ID,
  );
  const imageUrl = await resolvePublicCoverUrl(baseUrl, sessionCoverCandidates(groupSessions, groupKeyMap));
  const title = pageTitle(group.displayName || key);
  const description = truncateDescription(
    group.description || `Volunteer crew — ${group.displayName || key}. Find upcoming sessions and see what we have been up to.`,
  );

  return { title, description, canonicalUrl, imageUrl };
}

async function resolveProjectOg(
  key: string,
  canonicalUrl: string,
  baseUrl: string,
): Promise<OgMeta> {
  const [rawProjects, rawSessions, rawGroups] = await Promise.all([
    projectsRepository.getAll(),
    sessionsRepository.getAll(),
    groupsRepository.getAll(),
  ]);
  const spProject = findProjectByKey(rawProjects, key);
  if (!spProject) return siteDefaultMeta(canonicalUrl, baseUrl, 'Project');

  const project = convertProject(spProject);
  const projectId = spProject.ID;
  const groupKeyMap = buildGroupKeyMap(rawGroups);
  const projectSessions = rawSessions.filter(
    s => s.Date && safeParseLookupId(s[PROJECT_LOOKUP]) === projectId,
  );
  const imageUrl = await resolvePublicCoverUrl(baseUrl, sessionCoverCandidates(projectSessions, groupKeyMap));
  const title = pageTitle(project.displayName || key);
  const description = truncateDescription(
    project.description || `Trail and project work — ${project.displayName || key}.`,
  );

  return { title, description, canonicalUrl, imageUrl };
}

const STATIC_PAGES: Record<string, { title: string; description: string }> = {
  '/': { title: pageTitle('Home'), description: DEFAULT_DESCRIPTION },
  '/groups': {
    title: pageTitle('Groups'),
    description: 'Browse DTV volunteer crews and find a group that suits you.',
  },
  '/projects': {
    title: pageTitle('Projects'),
    description: 'Trails and funded projects across the forest.',
  },
  '/sessions': {
    title: pageTitle('Sessions'),
    description: 'Find upcoming volunteer sessions across all crews.',
  },
  '/privacy': {
    title: pageTitle('Privacy Policy'),
    description: 'How Dean Trail Volunteers collects and uses personal data in the tracker app.',
  },
  '/terms': {
    title: pageTitle('Terms of Use'),
    description: 'Terms of use for the DTV Tracker volunteer application.',
  },
  '/login': {
    title: pageTitle('Login'),
    description: 'Sign in to manage your volunteer profile and session bookings.',
  },
};

/**
 * Resolve Open Graph metadata for a public SPA path. Returns null for sandbox routes
 * (serve plain index.html). Auth-gated SPA routes get site-level defaults only.
 */
export async function resolveOgMeta(pathname: string, baseUrl: string): Promise<OgMeta | null> {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  const canonicalUrl = `${baseUrl}${path === '/' ? '/' : path}`;

  if (isSandboxPath(path)) return null;

  if (isAuthGatedPath(path)) {
    return siteDefaultMeta(canonicalUrl, baseUrl);
  }

  const sessionMatch = path.match(/^\/sessions\/([^/]+)\/(\d{4}-\d{2}-\d{2})$/);
  if (sessionMatch) {
    return resolveSessionOg(sessionMatch[1].toLowerCase(), sessionMatch[2], canonicalUrl, baseUrl);
  }

  const groupMatch = path.match(/^\/groups\/([^/]+)$/);
  if (groupMatch) {
    return resolveGroupOg(groupMatch[1].toLowerCase(), canonicalUrl, baseUrl);
  }

  const projectMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    return resolveProjectOg(projectMatch[1].toLowerCase(), canonicalUrl, baseUrl);
  }

  if (path === '/docs' || path.startsWith('/docs/')) {
    return {
      title: docsTitle(path),
      description: docsDescription(path),
      canonicalUrl,
      imageUrl: defaultImageUrl(baseUrl),
    };
  }

  const staticPage = STATIC_PAGES[path];
  if (staticPage) {
    return {
      ...staticPage,
      canonicalUrl,
      imageUrl: defaultImageUrl(baseUrl),
    };
  }

  return siteDefaultMeta(canonicalUrl, baseUrl);
}
