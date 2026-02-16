/**
 * Records Repository
 *
 * Fetches Records data from SharePoint and returns typed SharePointRecord[]
 * Only available on the Tracker site (RECORDS_LIST_GUID must be set).
 */

import { SharePointRecord } from '../../types/sharepoint';
import { safeParseLookupId } from '../data-layer';
import { sharePointClient } from '../sharepoint-client';

class RecordsRepository {
  private get listGuid(): string {
    return process.env.RECORDS_LIST_GUID || '';
  }

  get available(): boolean {
    return !!this.listGuid;
  }

  private get selectFields(): string {
    return 'ID,Title,Profile,ProfileLookupId,Type,Status,Date,Created,Modified';
  }

  async getAll(): Promise<SharePointRecord[]> {
    if (!this.available) return [];

    const cacheKey = 'records';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointRecord[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields
    );
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointRecord[];
  }

  async getByProfile(profileId: number): Promise<SharePointRecord[]> {
    const all = await this.getAll();
    return all.filter(r => safeParseLookupId(r.ProfileLookupId as unknown as string) === profileId);
  }

  async create(fields: { ProfileLookupId: number; Type: string; Status: string; Date: string }): Promise<number> {
    if (!this.available) throw new Error('Records list not configured');
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.cache.del('records');
    return id;
  }

  async update(itemId: number, fields: { Status?: string; Date?: string }): Promise<void> {
    if (!this.available) throw new Error('Records list not configured');
    await sharePointClient.updateListItem(this.listGuid, itemId, fields);
    sharePointClient.cache.del('records');
  }

  async delete(itemId: number): Promise<void> {
    if (!this.available) throw new Error('Records list not configured');
    await sharePointClient.deleteListItem(this.listGuid, itemId);
    sharePointClient.cache.del('records');
  }
}

export const recordsRepository = new RecordsRepository();
