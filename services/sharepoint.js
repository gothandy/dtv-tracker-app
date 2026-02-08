const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

class SharePointService {
    constructor() {
        this.siteUrl = process.env.SHAREPOINT_SITE_URL;
        this.clientId = process.env.SHAREPOINT_CLIENT_ID;
        this.clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
        this.tenantId = process.env.SHAREPOINT_TENANT_ID;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.siteId = null;  // Cache for Microsoft Graph API site ID

        // Data cache with 5 minute TTL (300 seconds)
        this.cache = new NodeCache({
            stdTTL: 300,           // Default TTL: 5 minutes
            checkperiod: 60,       // Check for expired keys every 60 seconds
            useClones: false       // Return references for better performance
        });

        // Log cache statistics on init
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
    async getAccessToken() {
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

            return this.accessToken;
        } catch (error) {
            console.error('Error getting access token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with SharePoint');
        }
    }

    /**
     * Get the Microsoft Graph site ID from the SharePoint site URL
     * Format: "hostname,{site-collection-guid},{site-guid}"
     */
    async getSiteId() {
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
                return this.siteId;
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
                return this.siteId;
            }
        } catch (error) {
            console.error('Error getting site ID:', error.response?.data || error.message);
            throw new Error('Failed to retrieve SharePoint site ID from Microsoft Graph');
        }
    }

    /**
     * Make a GET request to Microsoft Graph API
     */
    async get(endpoint) {
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
        } catch (error) {
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
    transformGraphResponse(graphData) {
        if (!graphData || !graphData.value) {
            return [];
        }

        return graphData.value.map(item => {
            // Start with ID field (Graph uses string "id", REST uses number "ID")
            const transformedItem = {
                ID: parseInt(item.id, 10)
            };

            // Copy all fields from the "fields" object to the root level
            if (item.fields) {
                Object.keys(item.fields).forEach(key => {
                    transformedItem[key] = item.fields[key];
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
    async getListItems(listGuid, selectFields = null, filter = null, orderBy = null) {
        try {
            const siteId = await this.getSiteId();

            // Graph API endpoint: /sites/{site-id}/lists/{list-id}/items
            let endpoint = `sites/${siteId}/lists/${listGuid}/items`;

            // Build query parameters
            const params = [];

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
            let allItems = [];
            let currentEndpoint = endpoint;
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
                    currentEndpoint = null; // No more pages
                }
            }

            console.log(`[Fetch Complete] Retrieved ${allItems.length} items across ${pageCount} page(s) for list ${listGuid}`);
            return allItems;
        } catch (error) {
            console.error(`Error fetching list items (${listGuid}):`, error.message);
            throw error;
        }
    }

    /**
     * Get all Groups (Crews)
     */
    async getGroups() {
        const cacheKey = 'groups';
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`[Cache] Hit: ${cacheKey}`);
            return cached;
        }

        console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
        const listGuid = process.env.GROUPS_LIST_GUID;
        const data = await this.getListItems(
            listGuid,
            'ID,Title,Name,Description,EventbriteSeriesID,Created,Modified'
        );
        this.cache.set(cacheKey, data);
        return data;
    }

    /**
     * Get all Sessions (Events)
     */
    async getSessions() {
        const cacheKey = 'sessions';
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`[Cache] Hit: ${cacheKey}`);
            return cached;
        }

        console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
        const listGuid = process.env.SESSIONS_LIST_GUID;
        const data = await this.getListItems(
            listGuid,
            'ID,Title,Name,Date,Description,Registrations,Hours,FinancialYearFlow,EventbriteEventID,Url,Crew,CrewLookupId,Created,Modified',
            null,
            null  // Temporarily disabled orderby to test if it causes 400 error
        );
        this.cache.set(cacheKey, data);
        return data;
    }

    /**
     * Get all Profiles (Volunteers)
     */
    async getProfiles() {
        const cacheKey = 'profiles';
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`[Cache] Hit: ${cacheKey}`);
            return cached;
        }

        console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
        const listGuid = process.env.PROFILES_LIST_GUID;
        const data = await this.getListItems(
            listGuid,
            'ID,Title,Email,MatchName,IsGroup,HoursLastFY,HoursThisFY,Created,Modified'
        );
        this.cache.set(cacheKey, data);
        return data;
    }

    /**
     * Get all Entries (Registrations)
     */
    async getEntries() {
        const cacheKey = 'entries';
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`[Cache] Hit: ${cacheKey}`);
            return cached;
        }

        console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
        const listGuid = process.env.ENTRIES_LIST_GUID;
        const data = await this.getListItems(
            listGuid,
            'ID,Title,Event,EventLookupId,Volunteer,VolunteerLookupId,Count,Checked,Hours,Notes,Created,Modified'
        );
        this.cache.set(cacheKey, data);
        return data;
    }

    /**
     * Get all Regulars
     */
    async getRegulars() {
        const cacheKey = 'regulars';
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`[Cache] Hit: ${cacheKey}`);
            return cached;
        }

        console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
        const listGuid = process.env.REGULARS_LIST_GUID;
        const data = await this.getListItems(
            listGuid,
            'ID,Title,Volunteer,VolunteerLookupId,Crew,CrewLookupId,Created,Modified'
        );
        this.cache.set(cacheKey, data);
        return data;
    }

    /**
     * Get Sessions filtered by Financial Year
     * @param {string} fy - Financial year in format "FY2025"
     * @returns {Promise<Array>} Sessions in the specified FY
     */
    async getSessionsByFY(fy) {
        const cacheKey = `sessions_${fy}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`[Cache] Hit: ${cacheKey}`);
            return cached;
        }

        console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
        // Fetch all sessions and filter in Node.js (SharePoint filter on FinancialYearFlow fails)
        const allSessions = await this.getSessions();

        // Parse FY to get date range: FY2025 -> April 1, 2025 to March 31, 2026
        const fyStartYear = parseInt(fy.substring(2));
        const fyEndYear = fyStartYear + 1;
        const fyStartDate = new Date(Date.UTC(fyStartYear, 3, 1)); // April 1
        const fyEndDate = new Date(Date.UTC(fyEndYear, 2, 31, 23, 59, 59)); // March 31

        // Filter with fallback: use FinancialYearFlow if set, otherwise use Date field
        const filteredData = allSessions.filter(session => {
            if (session.FinancialYearFlow) {
                return session.FinancialYearFlow === fy;
            } else if (session.Date) {
                const sessionDate = new Date(session.Date);
                return sessionDate >= fyStartDate && sessionDate <= fyEndDate;
            }
            return false;
        });

        console.log(`[SessionsByFY] Filtered ${filteredData.length} sessions for ${fy} from ${allSessions.length} total`);
        this.cache.set(cacheKey, filteredData);
        return filteredData;
    }

    /**
     * Get Entries for specific session IDs
     * @param {Array<number>} sessionIds - Array of session IDs
     * @returns {Promise<Array>} Entries for the specified sessions
     */
    async getEntriesBySessionIds(sessionIds) {
        if (!sessionIds || sessionIds.length === 0) {
            return [];
        }

        const listGuid = process.env.ENTRIES_LIST_GUID;

        // OData filter for multiple IDs: EventLookupId eq 1 or EventLookupId eq 2 or...
        // Limit to first 20 for reasonable URL length (OData limitation)
        const idsToFetch = sessionIds.slice(0, 100);
        const filterParts = idsToFetch.map(id => `fields/EventLookupId eq ${id}`);
        const filter = filterParts.join(' or ');

        return await this.getListItems(
            listGuid,
            'ID,Title,Event,EventLookupId,Volunteer,VolunteerLookupId,Count,Checked,Hours,Notes,Created,Modified',
            filter
        );
    }

    /**
     * Get Entries filtered by Financial Year using Title field date pattern
     * Assumes Entry Title contains session date in "yyyy-mm-dd" format
     * @param {string} fy - Financial year in format "FY2025"
     * @returns {Promise<Array>} Entries for the specified FY
     */
    async getEntriesByFYTitle(fy) {
        const listGuid = process.env.ENTRIES_LIST_GUID;

        // Parse FY: "FY2025" -> starts April 2024, ends March 2025
        const fyStartYear = parseInt(fy.substring(2));
        const fyEndYear = fyStartYear + 1;

        // Build filter for date patterns in Title field
        // FY2025: 2024-04 through 2024-12, and 2025-01 through 2025-03
        const filterParts = [];

        // April through December of start year
        for (let month = 4; month <= 12; month++) {
            const monthStr = month.toString().padStart(2, '0');
            filterParts.push(`startswith(fields/Title, '${fyStartYear}-${monthStr}-')`);
        }

        // January through March of end year
        for (let month = 1; month <= 3; month++) {
            const monthStr = month.toString().padStart(2, '0');
            filterParts.push(`startswith(fields/Title, '${fyEndYear}-${monthStr}-')`);
        }

        const filter = filterParts.join(' or ');

        return await this.getListItems(
            listGuid,
            'ID,Title,Event,EventLookupId,Volunteer,VolunteerLookupId,Count,Checked,Hours,Notes,Created,Modified',
            filter
        );
    }

    /**
     * Clear all cached data
     * Useful for manual cache invalidation or testing
     */
    clearCache() {
        this.cache.flushAll();
        console.log('[Cache] Cleared all cached data');
    }

    /**
     * Clear specific cached key(s)
     * @param {string|string[]} keys - Cache key or array of keys to clear
     */
    clearCacheKey(keys) {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => {
            this.cache.del(key);
            console.log(`[Cache] Cleared: ${key}`);
        });
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats including hits, misses, keys count
     */
    getCacheStats() {
        return this.cache.getStats();
    }
}

module.exports = new SharePointService();
