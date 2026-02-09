/**
 * Groups Repository
 *
 * Fetches Groups (Crews) data from SharePoint and returns typed SharePointGroup[]
 */

import { SharePointGroup } from '../../types/group';
import { sharePointClient } from '../sharepoint-client';

class GroupsRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.GROUPS_LIST_GUID!;
  }

  async getAll(): Promise<SharePointGroup[]> {
    const cacheKey = 'groups';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointGroup[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      'ID,Title,Name,Description,EventbriteSeriesID,Created,Modified'
    );
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointGroup[];
  }
}

export const groupsRepository = new GroupsRepository();
