/**
 * Regulars Repository
 *
 * Fetches Regulars data from SharePoint and returns typed SharePointRegular[]
 */

import { SharePointRegular } from '../../types/sharepoint';
import { sharePointClient } from '../sharepoint-client';

class RegularsRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.REGULARS_LIST_GUID!;
  }

  async create(fields: { VolunteerLookupId: string; CrewLookupId: string; Title?: string }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.cache.del('regulars');
    return id;
  }

  async delete(regularId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, regularId);
    sharePointClient.cache.del('regulars');
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
      'ID,Title,Volunteer,VolunteerLookupId,Crew,CrewLookupId,Created,Modified'
    );
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointRegular[];
  }
}

export const regularsRepository = new RegularsRepository();
