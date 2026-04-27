/**
 * Entries Repository
 *
 * Fetches Entries (Registrations) data from SharePoint and returns typed SharePointEntry[]
 */

import { SharePointEntry } from '../../../types/sharepoint';
import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { SESSION_LOOKUP, SESSION_DISPLAY, PROFILE_LOOKUP, PROFILE_DISPLAY, ACCOMPANYING_ADULT_LOOKUP, ACCOMPANYING_ADULT_DISPLAY, ENTRY_CANCELLED, ENTRY_LABELS, ENTRY_EVENTBRITE_ATTENDEE_ID } from '../field-names';

class EntriesRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.ENTRIES_LIST_GUID!;
  }

  private get selectFields(): string {
    return `ID,Title,${SESSION_DISPLAY},${SESSION_LOOKUP},${PROFILE_DISPLAY},${PROFILE_LOOKUP},Count,Checked,Hours,Notes,BookedBy,${ACCOMPANYING_ADULT_DISPLAY},${ACCOMPANYING_ADULT_LOOKUP},${ENTRY_CANCELLED},${ENTRY_LABELS},${ENTRY_EVENTBRITE_ATTENDEE_ID},Created,Modified`;
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
      this.selectFields
    );
    sharePointClient.cache.set(cacheKey, data, CACHE_TTL.entries);
    return data as SharePointEntry[];
  }

  async getById(id: number): Promise<SharePointEntry | null> {
    return await sharePointClient.getListItem(this.listGuid, id, this.selectFields) as SharePointEntry | null;
  }

  async getByProfileId(profileId: number): Promise<SharePointEntry[]> {
    const filter = `fields/${PROFILE_LOOKUP} eq ${profileId}`;
    return await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields,
      filter
    ) as SharePointEntry[];
  }

  async getRecent(cutoff: Date): Promise<SharePointEntry[]> {
    // Requires a Created index on the Entries list (List Settings → Indexed Columns)
    const filter = `fields/Created ge '${cutoff.toISOString()}'`;
    return await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields,
      filter
    ) as SharePointEntry[];
  }

  async getRecentlyCancelled(cutoff: Date): Promise<SharePointEntry[]> {
    const filter = `fields/${ENTRY_CANCELLED} ge '${cutoff.toISOString()}'`;
    return await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields,
      filter
    ) as SharePointEntry[];
  }

  async getBySessionIds(sessionIds: number[]): Promise<SharePointEntry[]> {
    if (!sessionIds || sessionIds.length === 0) {
      return [];
    }

    // OData filter for multiple IDs
    const idsToFetch = sessionIds.slice(0, 100);
    const filterParts = idsToFetch.map(id => `fields/${SESSION_LOOKUP} eq ${id}`);
    const filter = filterParts.join(' or ');

    return await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields,
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
      this.selectFields,
      filter
    ) as SharePointEntry[];
  }

  async updateFields(entryId: number, fields: Partial<Pick<SharePointEntry, 'Checked' | 'Count' | 'Hours' | 'Notes' | 'AccompanyingAdultLookupId' | 'Cancelled'>> & Record<string, any>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, entryId, fields);
    sharePointClient.clearCacheKey('entries');
    sharePointClient.clearCacheByPrefix('sessions_FY');
  }

  async create(fields: Record<string, any>): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.clearCacheKey('entries');
    sharePointClient.clearCacheByPrefix('sessions_FY');
    return id;
  }

  async updateLabels(entryId: number, labels: string[]): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, entryId, { [ENTRY_LABELS]: labels });
    sharePointClient.clearCacheKey('entries');
  }

  async delete(entryId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, entryId);
    sharePointClient.clearCacheKey('entries');
    sharePointClient.clearCacheByPrefix('sessions_FY');
  }
}

export const entriesRepository = new EntriesRepository();
