/**
 * Records Repository
 *
 * Fetches Records data from SharePoint and returns typed SharePointRecord[]
 */

import { SharePointRecord } from '../../../types/sharepoint';
import { recordsForProfile } from '../records';
import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { sharePoint } from '../../config';
import { RECORD_START, RECORD_END, RECORD_NOTES } from '../field-names';

class RecordsRepository {
  private get listGuid(): string { return sharePoint.lists.records; }


  private get selectFields(): string {
    return `ID,Title,Profile,ProfileLookupId,Type,Status,Date,${RECORD_START},${RECORD_END},${RECORD_NOTES},Created,Modified`;
  }

  private readonly dateOnlyFields = ['Date', RECORD_START, RECORD_END];

  async getAll(): Promise<SharePointRecord[]> {
    const cacheKey = 'records';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointRecord[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields,
      null,
      null,
      this.dateOnlyFields
    );
    sharePointClient.cache.set(cacheKey, data, CACHE_TTL.records);
    return data as SharePointRecord[];
  }

  async getByProfile(profileId: number): Promise<SharePointRecord[]> {
    const all = await this.getAll();
    return recordsForProfile(all, profileId);
  }

  async create(fields: { ProfileLookupId: number; Type: string; Status: string; Date: string }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields, this.dateOnlyFields);
    sharePointClient.clearCacheKey('records');
    return id;
  }

  async update(itemId: number, fields: { Status?: string; Date?: string; Notes?: string }): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, itemId, fields, this.dateOnlyFields);
    sharePointClient.clearCacheKey('records');
  }

  async delete(itemId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, itemId);
    sharePointClient.clearCacheKey('records');
  }
}

export const recordsRepository = new RecordsRepository();
