const axios = require('axios');
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
                params.push(`filter=${filter}`);
            }

            if (orderBy) {
                params.push(`orderby=${orderBy}`);
            }

            if (params.length > 0) {
                endpoint += `?${params.join('&')}`;
            }

            const data = await this.get(endpoint);

            // Transform Graph API response to match SharePoint REST API format
            return this.transformGraphResponse(data);
        } catch (error) {
            console.error(`Error fetching list items (${listGuid}):`, error.message);
            throw error;
        }
    }

    /**
     * Get all Groups (Crews)
     */
    async getGroups() {
        const listGuid = process.env.GROUPS_LIST_GUID;
        return await this.getListItems(
            listGuid,
            'ID,Title,Name,Description,EventbriteSeriesID,Created,Modified'
        );
    }

    /**
     * Get all Sessions (Events)
     */
    async getSessions() {
        const listGuid = process.env.SESSIONS_LIST_GUID;
        return await this.getListItems(
            listGuid,
            'ID,Title,Name,Date,Description,Registrations,Hours,FinancialYearFlow,EventbriteEventID,Url,Crew,CrewLookupId,Created,Modified',
            null,
            'Date desc'
        );
    }

    /**
     * Get all Profiles (Volunteers)
     */
    async getProfiles() {
        const listGuid = process.env.PROFILES_LIST_GUID;
        return await this.getListItems(
            listGuid,
            'ID,Title,Email,MatchName,IsGroup,HoursLastFY,HoursThisFY,Created,Modified'
        );
    }

    /**
     * Get all Entries (Registrations)
     */
    async getEntries() {
        const listGuid = process.env.ENTRIES_LIST_GUID;
        return await this.getListItems(
            listGuid,
            'ID,Title,Event,EventLookupId,Volunteer,VolunteerLookupId,Count,Checked,Hours,Notes,FinancialYearFlow,Created,Modified'
        );
    }

    /**
     * Get all Regulars
     */
    async getRegulars() {
        const listGuid = process.env.REGULARS_LIST_GUID;
        return await this.getListItems(
            listGuid,
            'ID,Title,Volunteer,VolunteerLookupId,Crew,CrewLookupId,Created,Modified'
        );
    }
}

module.exports = new SharePointService();
