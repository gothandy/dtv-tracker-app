/**
 * Generic SharePoint Client
 *
 * Handles authentication, Microsoft Graph API requests, and caching.
 * Does not contain any list-specific logic.
 */

import axios from 'axios';
import NodeCache from 'node-cache';
import { DateTime } from 'luxon';

// ---------------------------------------------------------------------------
// Regional date helpers
// SharePoint Date-Only fields are stored and returned by Graph API as UTC ISO
// datetime strings (e.g. "2026-04-03T23:00:00Z"). These helpers convert
// symmetrically between that format and plain YYYY-MM-DD date strings using
// the site's configured timezone.
// ---------------------------------------------------------------------------

const SHAREPOINT_TIMEZONE = process.env.SHAREPOINT_TIMEZONE || 'Europe/London';

/** UTC ISO datetime → YYYY-MM-DD in the site timezone (READ path) */
function utcToLocalDate(utcIso: string): string {
  return DateTime.fromISO(utcIso, { zone: 'UTC' }).setZone(SHAREPOINT_TIMEZONE).toISODate()!;
}

/** YYYY-MM-DD → midnight site-timezone UTC ISO for Graph API writes (WRITE path) */
function localDateToUtcIso(dateStr: string): string {
  return DateTime.fromISO(dateStr, { zone: SHAREPOINT_TIMEZONE }).toUTC().toISO()!;
}

/** Apply date-only field conversions to a fields object before writing */
function applyDateFields(fields: Record<string, any>, dateOnlyFields: string[]): Record<string, any> {
  if (dateOnlyFields.length === 0) return fields;
  const result = { ...fields };
  for (const field of dateOnlyFields) {
    if (typeof result[field] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(result[field])) {
      result[field] = localDateToUtcIso(result[field]);
    }
  }
  return result;
}

interface GraphListItem {
  id: string;
  fields?: Record<string, any>;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

interface GraphResponse {
  value: GraphListItem[];
  '@odata.nextLink'?: string;
}

// Tier-informed per-entity TTLs (seconds).
// Warmed caches (groups/sessions/profiles/regulars) stay hot for 6hr — nightly task at 05:30 covers morning + check-in window.
// Everything else is 24hr; targeted invalidation fires on every write so TTL is just a safety net for direct SharePoint edits.
// Only entries stay short — live check-in accuracy requires it.
export const CACHE_TTL = {
  groups:   21600,  //  6 hr  — warmed nightly; invalidated on every write
  sessions: 21600,  //  6 hr  — warmed nightly; invalidated on every write
  profiles: 21600,  //  6 hr  — warmed nightly; invalidated on every write
  regulars: 21600,  //  6 hr  — warmed nightly; invalidated on every write
  entries:    300,  //  5 min — check-in tier: live updates on the day
  records:  86400,  // 24 hr  — invalidated on write; rarely changes between sessions
  stats:    86400,  // 24 hr  — recomputed after every entry/session write anyway
  media:     3600,  //  1 hr  — thumbnail URLs have ~24h token validity; shorter TTL recovers from missed invalidation
  slug:     86400,  // 24 hr  — group+date→ID mappings; cleared on session create/update/delete
} as const;

export class SharePointClient {
  private siteUrl: string;
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private accessToken: string | undefined;
  private tokenExpiry: number | undefined;
  private siteId: string | undefined;
  public cache: NodeCache;
  // Column schema (choices) is structural metadata that must not be flushed by data writes.
  // Keyed by listGuid; 1-hour TTL — column definitions never change during normal app operation.
  private columnCache = new Map<string, { columns: any[]; fetchedAt: number }>();
  private readonly COLUMN_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.siteUrl = process.env.SHAREPOINT_SITE_URL!;
    this.clientId = process.env.SHAREPOINT_CLIENT_ID!;
    this.clientSecret = process.env.SHAREPOINT_CLIENT_SECRET!;
    this.tenantId = process.env.SHAREPOINT_TENANT_ID!;

    // Data cache — stdTTL is the fallback; most keys set their own TTL via CACHE_TTL constants.
    this.cache = new NodeCache({
      stdTTL: 300,           // Default fallback: 5 minutes
      checkperiod: 60,       // Check for expired keys every 60 seconds
      useClones: false       // Return references for better performance
    });

    // Log cache statistics
    this.cache.on('set', (key) => {
      console.log(`[Cache] Set: ${key}`);
    });
    this.cache.on('expired', (key) => {
      console.log(`[Cache] Expired: ${key}`);
    });
  }

  /**
   * Get OAuth access token from Microsoft Entra ID
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      });

      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      return response.data.access_token;
    } catch (error: any) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with SharePoint');
    }
  }

  /**
   * Get the Microsoft Graph site ID from the SharePoint site URL
   * Format: "hostname,{site-collection-guid},{site-guid}"
   */
  async getSiteId(): Promise<string> {
    // Return cached site ID if available
    if (this.siteId) {
      return this.siteId;
    }

    try {
      const token = await this.getAccessToken();

      // Parse site URL: https://dtvolunteers.sharepoint.com/sites/members
      const url = new URL(this.siteUrl);
      const hostname = url.hostname;  // dtvolunteers.sharepoint.com
      const sitePath = url.pathname;  // /sites/members

      // Try to get site ID using the full site path
      try {
        const formattedPath = sitePath.startsWith('/') ? sitePath.substring(1) : sitePath;
        const graphUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:/${formattedPath}`;

        const response = await axios.get(graphUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        this.siteId = response.data.id;
        return response.data.id;
      } catch (primaryError) {
        // Fallback: try root site if subsite path fails
        const rootSiteUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}`;

        const rootResponse = await axios.get(rootSiteUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        this.siteId = rootResponse.data.id;
        console.warn(`Warning: Using root site instead of ${this.siteUrl}. List queries may not work as expected.`);
        return rootResponse.data.id;
      }
    } catch (error: any) {
      console.error('Error getting site ID:', error.response?.data || error.message);
      throw new Error('Failed to retrieve SharePoint site ID from Microsoft Graph');
    }
  }

  /**
   * Make a GET request to Microsoft Graph API
   */
  async get(endpoint: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const url = `https://graph.microsoft.com/v1.0/${endpoint}`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const graphMessage = error.response?.data?.error?.message || error.response?.data?.error?.code || '';
      console.error(`Microsoft Graph API Error: ${error.message} (Status: ${status || 'unknown'})${graphMessage ? ` — ${graphMessage}` : ''}`);

      // Map common Graph API error codes to meaningful messages
      if (status === 404) {
        throw new Error('SharePoint list or item not found');
      } else if (status === 403) {
        throw new Error('Access denied - check API permissions');
      } else if (status === 401) {
        throw new Error('Unauthorized - token may be invalid or expired');
      }
      throw new Error(graphMessage || error.message);
    }
  }

  /**
   * Transform Microsoft Graph API response to match SharePoint REST API format
   * Maintains backward compatibility with existing code
   *
   * Graph format: { value: [ { id: "1", fields: { Title: "...", Email: "..." } } ] }
   * REST format: [ { ID: 1, Title: "...", Email: "..." } ]
   */
  transformGraphResponse(graphData: GraphResponse, dateOnlyFields: string[] = []): any[] {
    if (!graphData || !graphData.value) {
      return [];
    }

    return graphData.value.map(item => {
      // Start with ID field (Graph uses string "id", REST uses number "ID")
      const transformedItem: any = {
        ID: parseInt(item.id, 10)
      };

      // Copy all fields from the "fields" object to the root level
      if (item.fields) {
        Object.keys(item.fields).forEach(key => {
          transformedItem[key] = item.fields![key];
        });
      }

      // Add system fields if present
      if (item.createdDateTime) {
        transformedItem.Created = item.createdDateTime;
      }
      if (item.lastModifiedDateTime) {
        transformedItem.Modified = item.lastModifiedDateTime;
      }

      // Convert Date-Only fields from UTC ISO to local YYYY-MM-DD
      for (const field of dateOnlyFields) {
        if (typeof transformedItem[field] === 'string' && transformedItem[field]) {
          transformedItem[field] = utcToLocalDate(transformedItem[field]);
        }
      }

      return transformedItem;
    });
  }

  /**
   * Get a single SharePoint list item by ID via Microsoft Graph API (no cache)
   */
  async getListItem(listGuid: string, itemId: number, selectFields: string | null = null, dateOnlyFields: string[] = []): Promise<any | null> {
    try {
      const siteId = await this.getSiteId();
      let endpoint = `sites/${siteId}/lists/${listGuid}/items/${itemId}`;
      if (selectFields) {
        endpoint += `?expand=fields(select=${selectFields})`;
      } else {
        endpoint += '?expand=fields';
      }
      const data = await this.get(endpoint);
      // Wrap in array shape so transformGraphResponse can handle it
      const transformed = this.transformGraphResponse({ value: [data] }, dateOnlyFields);
      return transformed[0] ?? null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error(`Error fetching list item ${itemId} from ${listGuid}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all items from a SharePoint list by GUID using Microsoft Graph API
   * Handles pagination automatically to retrieve all items
   */
  async getListItems(
    listGuid: string,
    selectFields: string | null = null,
    filter: string | null = null,
    orderBy: string | null = null,
    dateOnlyFields: string[] = []
  ): Promise<any[]> {
    let endpoint = '';
    try {
      const siteId = await this.getSiteId();

      // Graph API endpoint: /sites/{site-id}/lists/{list-id}/items
      endpoint = `sites/${siteId}/lists/${listGuid}/items`;

      // Build query parameters
      const params: string[] = [];

      // Graph API requires fields to be expanded
      if (selectFields) {
        params.push(`expand=fields(select=${selectFields})`);
      } else {
        params.push('expand=fields');
      }

      if (filter) {
        params.push(`$filter=${filter}`);
      }

      if (orderBy) {
        params.push(`$orderby=${orderBy}`);
      }

      // Request more items per page to reduce pagination requests
      params.push('$top=999');

      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      // Handle pagination - Graph API returns @odata.nextLink if there are more items
      let allItems: any[] = [];
      let currentEndpoint: string | undefined = endpoint;
      let pageCount = 0;

      while (currentEndpoint) {
        const data = await this.get(currentEndpoint);
        pageCount++;

        // Transform and accumulate items
        const items = this.transformGraphResponse(data, dateOnlyFields);
        allItems = allItems.concat(items);

        // Check for next page
        if (data['@odata.nextLink']) {
          // Extract just the path and query from the full URL
          const nextUrl = new URL(data['@odata.nextLink']);
          currentEndpoint = nextUrl.pathname.replace('/v1.0/', '') + nextUrl.search;
          console.log(`[Pagination] Fetching page ${pageCount + 1} for list ${listGuid}`);
        } else {
          currentEndpoint = undefined; // No more pages
        }
      }

      console.log(`[Fetch Complete] Retrieved ${allItems.length} items across ${pageCount} page(s) for list ${listGuid}`);
      return allItems;
    } catch (error: any) {
      console.error(`Error fetching list items (${listGuid}) endpoint="${endpoint}":`, error.message);
      throw error;
    }
  }

  /**
   * Update fields on a single SharePoint list item via Microsoft Graph PATCH
   */
  async updateListItem(listGuid: string, itemId: number, fields: Record<string, any>, dateOnlyFields: string[] = []): Promise<void> {
    // Retry once on 429 (SharePoint throttling) after the Retry-After delay (default 30s)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const token = await this.getAccessToken();
        const siteId = await this.getSiteId();
        const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/items/${itemId}/fields`;

        await axios.patch(url, applyDateFields(fields, dateOnlyFields), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        return;
      } catch (error: any) {
        const status = error.response?.status;
        const spError = error.response?.data?.error?.message;
        console.error(`Error updating list item ${itemId} in ${listGuid} (attempt ${attempt}):`, error.response?.data || error.message);

        if (status === 429 && attempt === 1) {
          const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '30', 10);
          console.warn(`[SharePoint] Throttled — retrying after ${retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        if (status === 404) throw new Error('SharePoint list item not found');
        if (status === 403) throw new Error('Access denied - check API permissions');
        if (status === 401) throw new Error('Unauthorized - token may be invalid or expired');
        throw new Error(spError || error.message);
      }
    }
  }

  async createListItem(listGuid: string, fields: Record<string, any>, dateOnlyFields: string[] = []): Promise<number> {
    try {
      const token = await this.getAccessToken();
      const siteId = await this.getSiteId();
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/items`;

      const response = await axios.post(url, { fields: applyDateFields(fields, dateOnlyFields) }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return parseInt(response.data.id, 10);
    } catch (error: any) {
      const status = error.response?.status;
      console.error(`Error creating list item in ${listGuid}:`, error.response?.data || error.message);

      if (status === 403) {
        throw new Error('Access denied - check API permissions');
      } else if (status === 401) {
        throw new Error('Unauthorized - token may be invalid or expired');
      }
      throw error;
    }
  }

  async deleteListItem(listGuid: string, itemId: number): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const siteId = await this.getSiteId();
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/items/${itemId}`;

      await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error: any) {
      const status = error.response?.status;
      console.error(`Error deleting list item ${itemId} in ${listGuid}:`, error.response?.data || error.message);

      if (status === 404) {
        throw new Error('SharePoint list item not found');
      } else if (status === 403) {
        throw new Error('Access denied - check API permissions');
      } else if (status === 401) {
        throw new Error('Unauthorized - token may be invalid or expired');
      }
      throw error;
    }
  }

  /**
   * Get choice values for a column in a SharePoint list.
   * Fetches all columns for the list (cached), then finds the named column.
   * Uses a separate cache that is not flushed by data writes — column schema never
   * changes during normal operation. Call clearColumnCache() for an explicit bust.
   */
  async getColumnChoices(listGuid: string, columnName: string): Promise<string[]> {
    const entry = this.columnCache.get(listGuid);
    let columns: any[];

    if (entry && Date.now() - entry.fetchedAt < this.COLUMN_CACHE_TTL_MS) {
      columns = entry.columns;
    } else {
      const siteId = await this.getSiteId();
      const data = await this.get(`sites/${siteId}/lists/${listGuid}/columns`);
      columns = data.value || [];
      this.columnCache.set(listGuid, { columns, fetchedAt: Date.now() });
    }

    const column = columns.find((c: any) => c.name === columnName || c.displayName === columnName);
    return column?.choice?.choices || [];
  }

  clearColumnCache(): void {
    this.columnCache.clear();
  }

  /**
   * Upload a file to a SharePoint document library.
   * Uses the simple PUT upload (suitable for files up to ~4 MB).
   * Graph auto-creates intermediate folders in the path.
   */
  async uploadFile(
    driveId: string,
    filePath: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{ id: string; webUrl: string; name: string }> {
    try {
      const token = await this.getAccessToken();
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}:/content`;

      const response = await axios.put(url, fileBuffer, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': mimeType
        },
        maxBodyLength: Infinity
      });

      return {
        id: response.data.id,
        webUrl: response.data.webUrl,
        name: response.data.name
      };
    } catch (error: any) {
      const status = error.response?.status;
      console.error(`Error uploading file to ${filePath}:`, error.response?.data || error.message);
      if (status === 403) throw new Error('Access denied — check Files.ReadWrite permission on the app registration');
      if (status === 401) throw new Error('Unauthorized — token may be invalid or expired');
      if (status === 404) throw new Error('Media library or folder not found — check MEDIA_LIBRARY_DRIVE_ID');
      throw error;
    }
  }

  /**
   * Download a file from a SharePoint document library.
   * Returns null if the file doesn't exist (404), throws on other errors.
   */
  async downloadFile(driveId: string, filePath: string): Promise<Buffer | null> {
    try {
      const token = await this.getAccessToken();
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}:/content`;
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  /**
   * Fetch all lists on the SharePoint site with their column definitions expanded.
   * Single Graph call — used for schema backup.
   */
  async getAllListsWithColumns(): Promise<any[]> {
    const siteId = await this.getSiteId();
    const data = await this.get(`sites/${siteId}/lists?$expand=columns`);
    return data.value || [];
  }

  /**
   * List all date subfolders under a group folder and return their child file counts.
   * One Graph API call per group key — used for batch photo counts on session cards.
   * Returns an empty Map if the group folder doesn't exist yet.
   */
  async listGroupDateCounts(driveId: string, groupKey: string): Promise<Map<string, number>> {
    const cacheKey = `media-counts-${groupKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as Map<string, number>;
    }

    try {
      const token = await this.getAccessToken();
      const encodedGroupKey = encodeURIComponent(groupKey);
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedGroupKey}:/children?$select=name,folder`;

      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const counts = new Map<string, number>();
      for (const item of response.data.value as any[]) {
        if (item.folder && item.name) {
          counts.set(item.name as string, item.folder.childCount as number);
        }
      }
      this.cache.set(cacheKey, counts, CACHE_TTL.media);
      return counts;
    } catch (error: any) {
      if (error.response?.status === 404) return new Map();
      console.error(`Error listing group folder counts for ${groupKey}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * List image files in a drive folder, returning names, webUrls, and medium thumbnail URLs.
   * Returns an empty array if the folder doesn't exist yet.
   */
  async listFolderPhotos(
    driveId: string,
    folderPath: string
  ): Promise<{ id: string; listItemId: number; name: string; webUrl: string; thumbnailUrl: string; largeUrl: string; mimeType: string; isPublic: boolean; title: string | null }[]> {
    const cacheKey = `media_folder_${folderPath}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as { id: string; listItemId: number; name: string; webUrl: string; thumbnailUrl: string; largeUrl: string; mimeType: string; isPublic: boolean; title: string | null }[];
    }

    try {
      const token = await this.getAccessToken();
      const encodedPath = folderPath.split('/').map(encodeURIComponent).join('/');
      // Include listItem to get SharePoint list item ID (for CoverMedia lookup) and custom columns
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}:/children?$select=id,name,webUrl,file&$expand=thumbnails,listItem($select=id;$expand=fields($select=Title,IsPublic))`;

      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = (response.data.value as any[])
        .filter(item => item.file?.mimeType?.startsWith('image/') || item.file?.mimeType?.startsWith('video/'))
        .map(item => ({
          id: item.id as string,
          listItemId: parseInt(item.listItem?.id ?? '0', 10),
          name: item.name as string,
          webUrl: item.webUrl as string,
          thumbnailUrl: (item.thumbnails?.[0]?.medium?.url ?? '') as string,
          largeUrl: (item.thumbnails?.[0]?.large?.url ?? item.thumbnails?.[0]?.medium?.url ?? '') as string,
          mimeType: item.file.mimeType as string,
          isPublic: item.listItem?.fields?.IsPublic === true,
          title: (item.listItem?.fields?.Title as string | undefined) || null,
        }));

      this.cache.set(cacheKey, result, CACHE_TTL.media);
      return result;
    } catch (error: any) {
      if (error.response?.status === 404) return [];
      console.error(`Error listing folder photos at ${folderPath}:`, error.response?.data || error.message);
      throw error;
    }
  }

  clearMediaFolderCache(folderPath: string): void {
    this.cache.del(`media_folder_${folderPath}`);
  }

  /**
   * Fetch the IsPublic flag and a streaming redirect URL for a single drive item.
   * Uses the /content endpoint which returns a 302 to a pre-authenticated download URL.
   */
  async getMediaItemDownloadUrl(driveId: string, itemId: string): Promise<{ downloadUrl: string; isPublic: boolean; name: string }> {
    const token = await this.getAccessToken();

    // Fetch metadata to check IsPublic
    const metaResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}?$expand=listItem($expand=fields($select=IsPublic))`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const isPublic = metaResponse.data.listItem?.fields?.IsPublic !== false;
    const name: string = metaResponse.data.name ?? itemId;

    // Fetch the 302 redirect from the /content endpoint — location header is the pre-auth stream URL
    const contentResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400,
      }
    );
    const downloadUrl = (contentResponse.headers['location'] as string) ?? '';

    return { downloadUrl, isPublic, name };
  }

  /**
   * Update custom metadata columns on a Media library item via its SharePoint list item.
   * Used to set Title (alt text) and IsPublic on individual photos/videos.
   */
  async updateMediaItemFields(driveId: string, itemId: string, fields: Record<string, any>): Promise<void> {
    const token = await this.getAccessToken();
    await axios.patch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/listItem/fields`,
      fields,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    this.clearCache();
  }

  async deleteMediaItem(driveId: string, itemId: string): Promise<void> {
    const token = await this.getAccessToken();
    await axios.delete(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
  }

  /**
   * Get the child file count for a single session media folder.
   * One lightweight Graph call — used for targeted stats updates on a single session.
   * Returns 0 if the folder doesn't exist yet.
   */
  async getSessionMediaCount(driveId: string, groupKey: string, date: string): Promise<number> {
    try {
      const token = await this.getAccessToken();
      const encodedPath = `${encodeURIComponent(groupKey)}/${encodeURIComponent(date)}`;
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}?$select=folder`;

      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return (response.data.folder?.childCount as number) || 0;
    } catch (error: any) {
      if (error.response?.status === 404) return 0;
      console.error(`Error getting media count for ${groupKey}/${date}:`, error.response?.data || error.message);
      throw error;
    }
  }

  isCached(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.flushAll();
    console.log('[Cache] Cleared all cached data');
  }

  /**
   * Clear specific cached key(s)
   */
  clearCacheKey(keys: string | string[]): void {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => {
      this.cache.del(key);
      console.log(`[Cache] Cleared: ${key}`);
    });
  }

  /**
   * Clear all cached keys that start with the given prefix.
   * Used for key families like 'sessions_FY*' where multiple FY-specific keys may exist.
   */
  clearCacheByPrefix(prefix: string): void {
    const keys = this.cache.keys().filter(k => k.startsWith(prefix));
    if (keys.length) {
      this.cache.del(keys);
      console.log(`[Cache] Cleared ${keys.length} key(s) with prefix: ${prefix}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

}

// Export singleton instance
export const sharePointClient = new SharePointClient();
