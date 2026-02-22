/**
 * Generic SharePoint Client
 *
 * Handles authentication, Microsoft Graph API requests, and caching.
 * Does not contain any list-specific logic.
 */

import axios from 'axios';
import NodeCache from 'node-cache';

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

export class SharePointClient {
  private siteUrl: string;
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private accessToken: string | undefined;
  private tokenExpiry: number | undefined;
  private siteId: string | undefined;
  public cache: NodeCache;

  constructor() {
    this.siteUrl = process.env.SHAREPOINT_SITE_URL!;
    this.clientId = process.env.SHAREPOINT_CLIENT_ID!;
    this.clientSecret = process.env.SHAREPOINT_CLIENT_SECRET!;
    this.tenantId = process.env.SHAREPOINT_TENANT_ID!;

    // Data cache with 5 minute TTL (300 seconds)
    this.cache = new NodeCache({
      stdTTL: 300,           // Default TTL: 5 minutes
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
      console.error(`Microsoft Graph API Error: ${error.message} (Status: ${status || 'unknown'})`);

      // Map common Graph API error codes to meaningful messages
      if (status === 404) {
        throw new Error('SharePoint list or item not found');
      } else if (status === 403) {
        throw new Error('Access denied - check API permissions');
      } else if (status === 401) {
        throw new Error('Unauthorized - token may be invalid or expired');
      }
      throw error;
    }
  }

  /**
   * Transform Microsoft Graph API response to match SharePoint REST API format
   * Maintains backward compatibility with existing code
   *
   * Graph format: { value: [ { id: "1", fields: { Title: "...", Email: "..." } } ] }
   * REST format: [ { ID: 1, Title: "...", Email: "..." } ]
   */
  transformGraphResponse(graphData: GraphResponse): any[] {
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

      return transformedItem;
    });
  }

  /**
   * Get all items from a SharePoint list by GUID using Microsoft Graph API
   * Handles pagination automatically to retrieve all items
   */
  async getListItems(
    listGuid: string,
    selectFields: string | null = null,
    filter: string | null = null,
    orderBy: string | null = null
  ): Promise<any[]> {
    try {
      const siteId = await this.getSiteId();

      // Graph API endpoint: /sites/{site-id}/lists/{list-id}/items
      let endpoint = `sites/${siteId}/lists/${listGuid}/items`;

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
        const items = this.transformGraphResponse(data);
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
      console.error(`Error fetching list items (${listGuid}):`, error.message);
      throw error;
    }
  }

  /**
   * Update fields on a single SharePoint list item via Microsoft Graph PATCH
   */
  async updateListItem(listGuid: string, itemId: number, fields: Record<string, any>): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const siteId = await this.getSiteId();
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/items/${itemId}/fields`;

      await axios.patch(url, fields, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error: any) {
      const status = error.response?.status;
      console.error(`Error updating list item ${itemId} in ${listGuid}:`, error.response?.data || error.message);

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

  async createListItem(listGuid: string, fields: Record<string, any>): Promise<number> {
    try {
      const token = await this.getAccessToken();
      const siteId = await this.getSiteId();
      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/items`;

      const response = await axios.post(url, { fields }, {
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
   */
  async getColumnChoices(listGuid: string, columnName: string): Promise<string[]> {
    const cacheKey = `columns-${listGuid}`;
    let columns = this.cache.get(cacheKey) as any[] | undefined;

    if (!columns) {
      try {
        const siteId = await this.getSiteId();
        const data = await this.get(`sites/${siteId}/lists/${listGuid}/columns`);
        columns = data.value || [];
        this.cache.set(cacheKey, columns);
      } catch (error: any) {
        console.error(`Error fetching columns for list ${listGuid}:`, error.message);
        return [];
      }
    }

    if (!columns) return [];
    const column = columns.find((c: any) => c.name === columnName || c.displayName === columnName);
    return column?.choice?.choices || [];
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
   * List image files in a drive folder, returning names, webUrls, and medium thumbnail URLs.
   * Returns an empty array if the folder doesn't exist yet.
   */
  async listFolderPhotos(
    driveId: string,
    folderPath: string
  ): Promise<{ name: string; webUrl: string; thumbnailUrl: string }[]> {
    try {
      const token = await this.getAccessToken();
      const encodedPath = folderPath.split('/').map(encodeURIComponent).join('/');
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}:/children?$select=id,name,webUrl,file&$expand=thumbnails`;

      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return (response.data.value as any[])
        .filter(item => item.file?.mimeType?.startsWith('image/'))
        .map(item => ({
          name: item.name as string,
          webUrl: item.webUrl as string,
          thumbnailUrl: (item.thumbnails?.[0]?.medium?.url ?? '') as string
        }));
    } catch (error: any) {
      if (error.response?.status === 404) return [];
      console.error(`Error listing folder photos at ${folderPath}:`, error.response?.data || error.message);
      throw error;
    }
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
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// Export singleton instance
export const sharePointClient = new SharePointClient();
