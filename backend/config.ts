/**
 * All app configuration, in one place. Nothing outside this file reads process.env.
 *
 * Settings (environment variables) are only:
 *   - secrets, or
 *   - values that differ between environments (production, preview, local).
 * Everything else is a fixed value in this file, so it's reviewed and versioned like code.
 *
 * Setting names follow TRACKER_{WHO}_{WHAT}. Every name we choose starts with TRACKER_, so
 * ours stand out among the host's own (NODE_ENV, PORT, WEBSITE_…), which we don't rename
 * (of those, the tracker only reads PORT). WHO is the system that issued the value (ENTRA, SHAREPOINT, EVENTBRITE), so
 * the name says where to find or renew it; it's left out for the tracker's own values.
 *
 * Reference: docs/configuration.md
 */

import requiredSettings from './required-settings.json';

// ── Settings ────────────────────────────────────────────────────────────────

/** Every setting the app needs. The production deploy checks these exist before deploying. */
export const REQUIRED_SETTINGS: readonly string[] = requiredSettings;

function setting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing setting ${name}. See docs/configuration.md`);
  return value;
}

/**
 * What's wrong with the settings, if anything: missing or empty settings, or a site URL
 * with no IDs in this file. app.js checks this before starting the tracker.
 */
export function settingsProblems(): string[] {
  const missing = REQUIRED_SETTINGS.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) return [`Missing settings: ${missing.join(', ')}`];
  if (!findSite(sharePoint.siteUrl)) {
    return [`TRACKER_SHAREPOINT_SITE_URL ${sharePoint.siteUrl} has no IDs in backend/config.ts`];
  }
  return [];
}

/** The tracker's Entra app registration (sign-in, SharePoint and email). */
export const entra = {
  tenantId: '0799305d-07e3-47b2-a19a-62d9931217f6', // Dean Trail Volunteers
  get clientId() { return setting('TRACKER_ENTRA_CLIENT_ID'); },
  get clientSecret() { return setting('TRACKER_ENTRA_CLIENT_SECRET'); },
};

export const eventbrite = {
  organizationId: '484655313163',
  get apiKey() { return setting('TRACKER_EVENTBRITE_API_KEY'); },
};

export const tracker = {
  /** Signs the login cookie. */
  get cookieSecret() { return setting('TRACKER_COOKIE_SECRET'); },
  /** Presented by the scheduled jobs (Azure Logic App) in the X-Api-Key header. */
  get jobsApiKey() { return setting('TRACKER_JOBS_API_KEY'); },
  /**
   * This environment's own mailbox, {slot}.tracker@ (tracker@ for production): the public
   * address for the app. Emails are sent from it with Reply-To it, and the About box and
   * every "Contact us" link show it. The environment's registration needs Mail.Send for it
   * (docs/sharepoint-setup.md section 4); whoever answers it needs Full Access.
   */
  get sharedMailbox() { return setting('TRACKER_SHARED_MAILBOX'); },
  /** Emails with Admin access (they also need a Profile `User`). To be replaced by Entra app roles. */
  get adminUsers(): Set<string> {
    return new Set(
      setting('TRACKER_ADMIN_USERS')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    );
  },
};

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && tracker.adminUsers.has(email.trim().toLowerCase());
}

// ── SharePoint ──────────────────────────────────────────────────────────────

interface SharePointSite {
  lists: {
    groups: string;
    projects: string;
    sessions: string;
    entries: string;
    profiles: string;
    regulars: string;
    records: string;
    logins: string;
  };
  libraries: {
    /** "Media": session photos and videos. */
    media: string;
    /** "Documents": Docs/ (governance), Projects/{slug}/, Backups/. */
    documents: string;
  };
  /** Term Store term set for session and project tags. */
  tagsTermSetId: string;
}

/** IDs for each SharePoint site the app can use. TRACKER_SHAREPOINT_SITE_URL picks one. */
const SHAREPOINT_SITES: Record<string, SharePointSite> = {
  'https://dtvolunteers.sharepoint.com/sites/tracker': {
    lists: {
      groups: '6e86cef7-a855-41a4-93e8-6e01a80434a2',
      projects: '669e479d-7b48-41dc-a0df-1ee7bc0fc2c7',
      sessions: '583867bd-e032-4940-89b5-aa2d5158c5d0',
      entries: '7146b950-94e3-4c94-a0d7-310cf2fbd325',
      profiles: '84649143-9e10-42eb-b6ee-2e1f57033073',
      regulars: '925c96fd-9b3a-4f55-b179-ed51fc279d39',
      records: '2666a819-1275-4fce-83a3-5bb67b4da83a',
      logins: 'e3b5c7fb-313a-44b4-9363-a4e4d2b65a57',
    },
    libraries: {
      media: 'b!OPS_fbLuHk2mHGHzJcqh0RwYB9nXW2ZBsZQsUeDoQwE4LIH0a_-PTL-iWIE4VOcg',
      documents: 'b!OPS_fbLuHk2mHGHzJcqh0RwYB9nXW2ZBsZQsUeDoQwGG-VCHeyPyQZMJyvZXUxTW',
    },
    tagsTermSetId: '14c7dfc2-ee1e-4c30-80f3-0d9149045311',
  },
  // Copy of the live site, restored from Microsoft 365 Backup, for the preview slot and
  // local development. A restore keeps the list IDs; library IDs include the site's ID,
  // so they change with each restore. See scripts/preview-site-from-backup/README.md.
  'https://dtvolunteers.sharepoint.com/sites/tracker-preview': {
    lists: {
      groups: '6e86cef7-a855-41a4-93e8-6e01a80434a2',
      projects: '669e479d-7b48-41dc-a0df-1ee7bc0fc2c7',
      sessions: '583867bd-e032-4940-89b5-aa2d5158c5d0',
      entries: '7146b950-94e3-4c94-a0d7-310cf2fbd325',
      profiles: '84649143-9e10-42eb-b6ee-2e1f57033073',
      regulars: '925c96fd-9b3a-4f55-b179-ed51fc279d39',
      records: '2666a819-1275-4fce-83a3-5bb67b4da83a',
      logins: 'e3b5c7fb-313a-44b4-9363-a4e4d2b65a57',
    },
    libraries: {
      media: 'b!nQv8OHI3Mk2aud7o2-hSXRwYB9nXW2ZBsZQsUeDoQwE4LIH0a_-PTL-iWIE4VOcg',
      documents: 'b!nQv8OHI3Mk2aud7o2-hSXRwYB9nXW2ZBsZQsUeDoQwGG-VCHeyPyQZMJyvZXUxTW',
    },
    tagsTermSetId: '14c7dfc2-ee1e-4c30-80f3-0d9149045311',
  },
};

/** SharePoint URLs aren't case-sensitive, so match the site regardless of case. */
function findSite(siteUrl: string): SharePointSite | undefined {
  const key = Object.keys(SHAREPOINT_SITES).find((url) => url.toLowerCase() === siteUrl.toLowerCase());
  return key ? SHAREPOINT_SITES[key] : undefined;
}

/**
 * The slot whose copy of the data this tracker is using, from TRACKER_SHAREPOINT_SITE_URL:
 * "Preview" for …/sites/tracker-preview (sites are named tracker-{slot}), null for the
 * live site. Shown after the app's name, e.g. "DTV Tracker (Preview)", so it's always
 * clear whose data a page shows.
 */
export function siteSlotName(): string | null {
  const siteUrl = process.env.TRACKER_SHAREPOINT_SITE_URL?.trim() ?? '';
  const slot = /\/sites\/tracker-([a-z0-9-]+)\/?$/i.exec(siteUrl)?.[1];
  if (!slot) return null;
  return slot.charAt(0).toUpperCase() + slot.slice(1).toLowerCase();
}

/** Whose data this is, for people to read: the slot ("Preview"), or "Production" on the live site. */
export function environmentName(): string {
  return siteSlotName() ?? 'Production';
}

export const sharePoint = {
  get siteUrl() { return setting('TRACKER_SHAREPOINT_SITE_URL').replace(/\/$/, ''); },
  get site(): SharePointSite {
    const site = findSite(sharePoint.siteUrl);
    if (!site) throw new Error(`No IDs configured for SharePoint site ${sharePoint.siteUrl} in backend/config.ts`);
    return site;
  },
  get lists() { return sharePoint.site.lists; },
  get libraries() { return sharePoint.site.libraries; },
  /** IANA timezone SharePoint dates are converted from. */
  timezone: 'Europe/London',
};

// ── Fixed values ────────────────────────────────────────────────────────────

/** Global cap on sign-in code emails per hour. */
export const SIGN_IN_EMAILS_PER_HOUR = 60;

/** How long a sign-in lasts, for volunteers and staff alike: covers a dig's prep, the day and the follow-up. */
export const LOGIN_HOURS = 72;

/** Production address; docs.dtv.org.uk redirects here. */
export const PRODUCTION_URL = 'https://tracker.dtv.org.uk';
export const DOCS_HOST = 'docs.dtv.org.uk';

/** Meta app ID for Facebook link previews (fb:app_id). Public. */
export const FACEBOOK_APP_ID = '1973664160696548';

// ── Platform ────────────────────────────────────────────────────────────────

export const platform = {
  /**
   * Running on your own machine: `npm run dev` passes --local (Vite middleware with live
   * reload, cookies allowed over http://localhost). Anything else runs as deployed (secure
   * cookies, built frontend), production and slots alike. Deliberately not NODE_ENV: that
   * belongs to Node and Express, and stays `production` on Azure.
   */
  isLocal: process.argv.includes('--local'),
  /** Azure sets PORT; 3000 is the local default. */
  port: Number(process.env.PORT) || 3000,
};
