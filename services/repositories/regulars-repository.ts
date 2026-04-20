/**
 * Regulars Repository
 *
 * Fetches Regulars data from SharePoint and returns typed SharePointRegular[]
 */

import { SharePointRegular } from '../../types/sharepoint';
import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { PROFILE_LOOKUP, PROFILE_DISPLAY, GROUP_LOOKUP, GROUP_DISPLAY } from '../field-names';

class RegularsRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.REGULARS_LIST_GUID!;
  }

  private get selectFields(): string {
    return `ID,Title,${PROFILE_DISPLAY},${PROFILE_LOOKUP},${GROUP_DISPLAY},${GROUP_LOOKUP},AccompanyingAdultLookupId,AccompanyingAdult,Created,Modified`;
  }

  async create(fields: Record<string, any>): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.clearCacheKey('regulars');
    return id;
  }

  async update(regularId: number, fields: Record<string, any>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, regularId, fields);
    sharePointClient.clearCacheKey('regulars');
  }

  async delete(regularId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, regularId);
    sharePointClient.clearCacheKey('regulars');
  }

  async getAll(): Promise<SharePointRegular[]> {
    const cacheKey = 'regulars';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointRegular[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields
    );
    sharePointClient.cache.set(cacheKey, data, CACHE_TTL.regulars);
    return data as SharePointRegular[];
  }
}

export const regularsRepository = new RegularsRepository();
