/**
 * Finds the site's list and library IDs from their addresses (config.ts SHAREPOINT_ADDRESSES),
 * once, and hands them to config.ts. Every request waits for this (server.js), so the IDs
 * are there before any route needs them. If SharePoint can't be reached (e.g. a slot's
 * registration switched off overnight), the next request tries again.
 */

import { sharePointClient } from './sharepoint-client';
import { sharePoint, setSharePointIds, SHAREPOINT_ADDRESSES, type SharePointIds, type ListKey, type LibraryKey } from '../config';

interface Located { id: string; webUrl: string }

/** A list's or library's address on the site, from its web URL: e.g. "Lists/Groups". */
export function addressOf(webUrl: string, siteUrl: string): string {
  const sitePath = decodeURIComponent(new URL(siteUrl).pathname).replace(/\/$/, '');
  const path = decodeURIComponent(new URL(webUrl).pathname).replace(/\/$/, '');
  const relative = path.toLowerCase().startsWith(sitePath.toLowerCase() + '/') ? path.slice(sitePath.length + 1) : path;
  return relative.toLowerCase();
}

/** The IDs for each address, or an error naming what's missing and what is on the site. */
export function matchAddresses(lists: Located[], drives: Located[], siteUrl: string): SharePointIds {
  const missing: string[] = [];
  const find = (items: Located[], address: string): string => {
    const found = items.find(i => addressOf(i.webUrl, siteUrl) === address.toLowerCase());
    if (!found) missing.push(address);
    return found?.id ?? '';
  };

  const result: SharePointIds = {
    lists: Object.fromEntries(
      Object.entries(SHAREPOINT_ADDRESSES.lists).map(([key, address]) => [key, find(lists, address)])
    ) as Record<ListKey, string>,
    libraries: Object.fromEntries(
      Object.entries(SHAREPOINT_ADDRESSES.libraries).map(([key, address]) => [key, find(drives, address)])
    ) as Record<LibraryKey, string>,
  };

  if (missing.length) {
    const onSite = [...lists, ...drives].map(i => addressOf(i.webUrl, siteUrl)).sort().join(', ');
    throw new Error(`Not found on ${siteUrl}: ${missing.join(', ')}. On the site: ${onSite}`);
  }
  return result;
}

async function getAll(endpoint: string): Promise<Located[]> {
  const items: Located[] = [];
  let next: string | undefined = endpoint;
  while (next) {
    const page: any = await sharePointClient.get(next);
    items.push(...page.value);
    next = page['@odata.nextLink']?.replace('https://graph.microsoft.com/v1.0/', '');
  }
  return items;
}

async function find(): Promise<void> {
  const siteId = await sharePointClient.getSiteId();
  const [lists, drives] = await Promise.all([
    getAll(`sites/${siteId}/lists?$select=id,webUrl&$top=200`),
    getAll(`sites/${siteId}/drives?$select=id,webUrl`),
  ]);
  setSharePointIds(matchAddresses(lists, drives, sharePoint.siteUrl));
  console.log(`[SharePoint] List and library IDs found on ${sharePoint.siteUrl}`);
}

let finding: Promise<void> | undefined;

/** Finds the IDs if they haven't been found yet; concurrent callers share one lookup. */
export function findSharePointIds(): Promise<void> {
  if (sharePoint.idsFound) return Promise.resolve();
  finding ??= find().finally(() => { finding = undefined; });
  return finding;
}
