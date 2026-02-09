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
