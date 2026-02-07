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
            const resource = `https://${this.siteUrl.split('/')[2]}`;

            const params = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: `${resource}/.default`,
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
     * Make a GET request to SharePoint REST API
     */
    async get(endpoint) {
        try {
            const token = await this.getAccessToken();
            const url = `${this.siteUrl}/_api/${endpoint}`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json;odata=verbose'
                }
            });

            return response.data;
        } catch (error) {
            console.error('SharePoint API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get all items from a SharePoint list by GUID
     */
    async getListItems(listGuid, selectFields = null, filter = null, orderBy = null) {
        try {
            let endpoint = `web/lists(guid'${listGuid}')/items`;
            const params = [];

            if (selectFields) {
                params.push(`$select=${selectFields}`);
            }
            if (filter) {
                params.push(`$filter=${filter}`);
            }
            if (orderBy) {
                params.push(`$orderby=${orderBy}`);
            }

            if (params.length > 0) {
                endpoint += `?${params.join('&')}`;
            }

            const data = await this.get(endpoint);
            return data.d.results;
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
            'ID,Title,Name,Date,Description,Registrations,Hours,FinancialYearFlow,EventbriteEventID,Url,Crew,Created,Modified',
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
            'ID,Title,Event,Volunteer,Count,Checked,Hours,Notes,FinancialYearFlow,Created,Modified'
        );
    }

    /**
     * Get all Regulars
     */
    async getRegulars() {
        const listGuid = process.env.REGULARS_LIST_GUID;
        return await this.getListItems(
            listGuid,
            'ID,Title,Volunteer,Crew,Created,Modified'
        );
    }
}

module.exports = new SharePointService();
