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

  // Filters by date pattern in Title field (assumes "yyyy-mm-dd" format)
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

  async updateFields(entryId: number, fields: Partial<Pick<SharePointEntry, 'Checked' | 'Count' | 'Hours' | 'Notes'>>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, entryId, fields);
    sharePointClient.cache.del('entries');
  }

  async create(fields: { EventLookupId: string; VolunteerLookupId: string; Notes?: string }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.cache.del('entries');
    return id;
  }

  async delete(entryId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, entryId);
    sharePointClient.cache.del('entries');
  }
}

export const entriesRepository = new EntriesRepository();
