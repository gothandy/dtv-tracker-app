/**
 * Profiles Repository
 *
 * Fetches Profiles (Volunteers) data from SharePoint and returns typed SharePointProfile[]
 */

import { SharePointProfile } from '../../types/sharepoint';
import { sharePointClient } from '../sharepoint-client';
import { PROFILE_STATS } from '../field-names';

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

    const selectFields = `ID,Title,Email,MatchName,User,IsGroup,${PROFILE_STATS},Created,Modified`;

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      selectFields
    );
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointProfile[];
  }

  // Updates only the Stats field — does NOT flush the full cache.
  // Bulk callers should call sharePointClient.clearCacheKey('profiles') once when done.
  async updateStats(profileId: number, stats: Record<string, any>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, profileId, { [PROFILE_STATS]: JSON.stringify(stats) });
  }

  async create(fields: { Title: string; Email?: string; MatchName?: string }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.clearCache();
    return id;
  }

  async delete(profileId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, profileId);
    sharePointClient.clearCache();
  }

  async updateFields(profileId: number, fields: Partial<Pick<SharePointProfile, 'Title' | 'Email' | 'MatchName' | 'User' | 'IsGroup'>>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, profileId, fields);
    sharePointClient.clearCache();
  }
}

export const profilesRepository = new ProfilesRepository();
