/**
 * Profiles Repository
 *
 * Fetches Profiles (Volunteers) data from SharePoint and returns typed SharePointProfile[]
 */

import { SharePointProfile } from '../../types/sharepoint';
import { sharePointClient } from '../sharepoint-client';

class ProfilesRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.PROFILES_LIST_GUID!;
  }

  async getAll(): Promise<SharePointProfile[]> {
    const cacheKey = 'profiles';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointProfile[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      'ID,Title,Email,MatchName,IsGroup,HoursLastFY,HoursThisFY,Created,Modified'
    );
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointProfile[];
  }
}

export const profilesRepository = new ProfilesRepository();
