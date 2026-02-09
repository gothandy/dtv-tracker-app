/**
 * Entries Repository
 *
 * Fetches Entries (Registrations) data from SharePoint and returns typed SharePointEntry[]
 */

import { SharePointEntry } from '../../types/sharepoint';
import { sharePointClient } from '../sharepoint-client';

class EntriesRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.ENTRIES_LIST_GUID!;
  }

  /**
   * Get all entries
   * Returns: SharePointEntry[]
   */
  async getAll(): Promise<SharePointEntry[]> {
    const cacheKey = 'entries';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointEntry[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      'ID,Title,Event,EventLookupId,Volunteer,VolunteerLookupId,Count,Checked,Hours,Notes,Created,Modified'
    );
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointEntry[];
  }

  /**
   * Get entries for specific session IDs
   * @param sessionIds - Array of session IDs
   * Returns: SharePointEntry[]
   */
  async getBySessionIds(sessionIds: number[]): Promise<SharePointEntry[]> {
    if (!sessionIds || sessionIds.length === 0) {
      return [];
    }

    // OData filter for multiple IDs: EventLookupId eq 1 or EventLookupId eq 2 or...
    // Limit to first 100 for reasonable URL length
    const idsToFetch = sessionIds.slice(0, 100);
    const filterParts = idsToFetch.map(id => `fields/EventLookupId eq ${id}`);
    const filter = filterParts.join(' or ');

    return await sharePointClient.getListItems(
      this.listGuid,
      'ID,Title,Event,EventLookupId,Volunteer,VolunteerLookupId,Count,Checked,Hours,Notes,Created,Modified',
      filter
    ) as SharePointEntry[];
  }

  /**
   * Get entries filtered by Financial Year using Title field date pattern
   * Assumes Entry Title contains session date in "yyyy-mm-dd" format
   * @param fy - Financial year in format "FY2025"
   * Returns: SharePointEntry[]
   */
  async getByFinancialYearTitle(fy: string): Promise<SharePointEntry[]> {
    // Parse FY: "FY2025" -> starts April 2024, ends March 2025
    const fyStartYear = parseInt(fy.substring(2));
    const fyEndYear = fyStartYear + 1;

    // Build filter for date patterns in Title field
    // FY2025: 2024-04 through 2024-12, and 2025-01 through 2025-03
    const filterParts: string[] = [];

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

    return await sharePointClient.getListItems(
      this.listGuid,
      'ID,Title,Event,EventLookupId,Volunteer,VolunteerLookupId,Count,Checked,Hours,Notes,Created,Modified',
      filter
    ) as SharePointEntry[];
  }
}

export const entriesRepository = new EntriesRepository();
